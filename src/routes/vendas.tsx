import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { fmtBRL, fmtDate } from "@/lib/format";
import { Plus, ShoppingCart, Receipt, XCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/vendas")({
  component: VendasPage,
});

function VendasPage() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const { data: vendas = [], isLoading } = useQuery({
    queryKey: ["vendas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendas")
        .select("id, data_venda, total, lucro_total, status_pagamento, forma_pagamento, clientes(nome), itens_venda(quantidade, perfume_id)")
        .order("data_venda", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as any[];
    },
  });

  const pagarMut = useMutation({
    mutationFn: async (venda: any) => {
      const total = Number(venda.total ?? 0);
      const today = new Date().toISOString().slice(0, 10);
      const { error } = await supabase
        .from("vendas")
        .update({ status_pagamento: "pago", valor_pago: total, valor_pendente: 0 })
        .eq("id", venda.id);
      if (error) throw error;
      await supabase
        .from("parcelas_venda")
        .update({ status_parcela: "pago", data_pagamento: today })
        .eq("venda_id", venda.id)
        .eq("status_parcela", "pendente");
    },
    onSuccess: () => {
      toast.success("Pagamento confirmado");
      qc.invalidateQueries({ queryKey: ["vendas"] });
      qc.invalidateQueries({ queryKey: ["rel-vendas"] });
      qc.invalidateQueries({ queryKey: ["rel-parcelas"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const cancelMut = useMutation({
    mutationFn: async (venda: any) => {
      if (venda.status_pagamento === "cancelado") throw new Error("Venda já cancelada");
      let pulados = 0;
      // Devolve estoque
      for (const it of venda.itens_venda ?? []) {
        const { data: p, error: ep } = await supabase
          .from("perfumes")
          .select("quantidade_estoque")
          .eq("id", it.perfume_id)
          .maybeSingle();
        if (ep) throw ep;
        if (!p) { pulados++; continue; }
        const novaQtd = (p.quantidade_estoque ?? 0) + it.quantidade;
        const { error: eu } = await supabase
          .from("perfumes")
          .update({ quantidade_estoque: novaQtd })
          .eq("id", it.perfume_id);
        if (eu) throw eu;
        const { error: em } = await supabase.from("movimentacoes_estoque").insert({
          user_id: user!.id,
          perfume_id: it.perfume_id,
          tipo: "devolucao_cancelamento",
          quantidade: it.quantidade,
          motivo: `Cancelamento venda ${venda.id.slice(0, 8)}`,
        });
        if (em) throw em;
      }
      const { error } = await supabase
        .from("vendas")
        .update({ status_pagamento: "cancelado" })
        .eq("id", venda.id);
      if (error) throw error;
      await supabase
        .from("parcelas_venda")
        .update({ status_parcela: "cancelado" })
        .eq("venda_id", venda.id)
        .eq("status_parcela", "pendente");
      return { pulados };
    },
    onSuccess: (res) => {
      if (res?.pulados) toast.warning(`Venda cancelada (${res.pulados} produto(s) já excluído(s) — não devolvidos)`);
      else toast.success("Venda cancelada e estoque devolvido");
      qc.invalidateQueries({ queryKey: ["vendas"] });
      qc.invalidateQueries({ queryKey: ["perfumes"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl">Vendas</h1>
          <p className="text-muted-foreground text-sm">{vendas.length} registradas</p>
        </div>
        <Button asChild>
          <Link to="/vendas/nova"><Plus className="w-4 h-4 mr-2" /> Nova venda</Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando…</div>
      ) : vendas.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <ShoppingCart className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">Nenhuma venda ainda.</p>
          <Button asChild><Link to="/vendas/nova">Registrar primeira venda</Link></Button>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {vendas.map((v) => {
            const cancelada = v.status_pagamento === "cancelado";
            return (
              <Card key={v.id} className={cancelada ? "opacity-60" : ""}>
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-secondary text-secondary-foreground flex items-center justify-center shrink-0">
                      <Receipt className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{v.clientes?.nome ?? "Sem cliente"}</div>
                      <div className="text-xs text-muted-foreground">
                        {fmtDate(v.data_venda)} • {v.itens_venda?.length ?? 0} itens • {v.forma_pagamento ?? "—"}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <div className={`font-serif text-lg ${cancelada ? "line-through text-muted-foreground" : "text-primary"}`}>{fmtBRL(v.total)}</div>
                    <div className="text-xs text-muted-foreground">Lucro {fmtBRL(v.lucro_total)}</div>
                    <div className="flex gap-1">
                      {v.status_pagamento === "pendente" && (
                        <Button size="sm" variant="outline" className="h-7" onClick={() => pagarMut.mutate(v)}>
                          Marcar pago
                        </Button>
                      )}
                      {!cancelada && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-7 w-7">
                              <XCircle className="w-4 h-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Cancelar venda?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Os produtos serão devolvidos ao estoque automaticamente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Voltar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => cancelMut.mutate(v)}>Cancelar venda</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                      {cancelada && <Badge variant="secondary">cancelado</Badge>}
                      {v.status_pagamento === "pago" && <Badge>pago</Badge>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
