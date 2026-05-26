import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fmtBRL, fmtDate } from "@/lib/format";
import { Plus, ShoppingCart, Receipt } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/vendas")({
  component: VendasPage,
});

function VendasPage() {
  const qc = useQueryClient();
  const { data: vendas = [], isLoading } = useQuery({
    queryKey: ["vendas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendas")
        .select("id, data_venda, total, lucro_total, status_pagamento, forma_pagamento, clientes(nome), itens_venda(quantidade)")
        .order("data_venda", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as any[];
    },
  });

  const pagarMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vendas").update({ status_pagamento: "pago" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Pagamento confirmado"); qc.invalidateQueries({ queryKey: ["vendas"] }); },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl">Vendas</h1>
          <p className="text-muted-foreground text-sm">{vendas.length} registradas</p>
        </div>
        <Link to="/vendas/nova">
          <Button><Plus className="w-4 h-4 mr-2" /> Nova venda</Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando…</div>
      ) : vendas.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <ShoppingCart className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">Nenhuma venda ainda.</p>
          <Link to="/vendas/nova"><Button>Registrar primeira venda</Button></Link>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {vendas.map((v) => (
            <Card key={v.id}>
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
                <div className="text-right shrink-0">
                  <div className="font-serif text-lg text-primary">{fmtBRL(v.total)}</div>
                  <div className="text-xs text-muted-foreground">Lucro {fmtBRL(v.lucro_total)}</div>
                  {v.status_pagamento === "pendente" ? (
                    <Button size="sm" variant="outline" className="mt-1 h-7" onClick={() => pagarMut.mutate(v.id)}>
                      Marcar pago
                    </Button>
                  ) : (
                    <Badge variant={v.status_pagamento === "pago" ? "default" : "secondary"} className="mt-1">{v.status_pagamento}</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
