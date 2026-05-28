import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fmtBRL, fmtDate } from "@/lib/format";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/relatorios")({ component: Relatorios });

function Relatorios() {
  const qc = useQueryClient();

  const { data: pedidos = [] } = useQuery({
    queryKey: ["rel-pedidos"],
    queryFn: async () => {
      const { data } = await supabase.from("pedidos").select("id,status_pedido,total,data_pedido");
      return data ?? [];
    },
  });

  const { data: vendas = [] } = useQuery({
    queryKey: ["rel-vendas"],
    queryFn: async () => {
      const { data } = await supabase
        .from("vendas")
        .select("id,total,valor_pago,valor_pendente,tipo_venda,status_pagamento,data_venda,clientes(nome)")
        .neq("status_pagamento", "cancelado");
      return data as any[] ?? [];
    },
  });

  const { data: parcelas = [] } = useQuery({
    queryKey: ["rel-parcelas"],
    queryFn: async () => {
      const { data } = await supabase
        .from("parcelas_venda")
        .select("id,numero_parcela,valor_parcela,data_vencimento,status_parcela,venda_id,vendas(clientes(nome))")
        .order("data_vencimento", { ascending: true });
      return data as any[] ?? [];
    },
  });

  const pagarParcela = async (id: string) => {
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase
      .from("parcelas_venda")
      .update({ status_parcela: "pago", data_pagamento: today })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Parcela quitada");
    qc.invalidateQueries({ queryKey: ["rel-parcelas"] });
  };

  // Métricas
  const totalPedidos = pedidos.length;
  const convertidos = pedidos.filter((p) => p.status_pedido === "convertido_em_venda").length;
  const cancelados = pedidos.filter((p) => p.status_pedido === "cancelado").length;
  const taxa = totalPedidos === 0 ? 0 : Math.round((convertidos / totalPedidos) * 100);

  const receber = vendas.reduce((s, v) => s + Number(v.valor_pendente ?? 0), 0);
  const recebido = vendas.reduce((s, v) => s + Number(v.valor_pago ?? 0), 0);

  const hoje = new Date().toISOString().slice(0, 10);
  const vencidas = parcelas.filter((p) => p.status_parcela === "pendente" && p.data_vencimento < hoje);
  const proximas = parcelas.filter((p) => p.status_parcela === "pendente" && p.data_vencimento >= hoje).slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl">Relatórios</h1>
        <p className="text-muted-foreground text-sm">Visão geral de conversão e contas a receber</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Pedidos recebidos" value={String(totalPedidos)} />
        <Stat label="Convertidos em venda" value={`${convertidos} (${taxa}%)`} accent />
        <Stat label="Cancelados" value={String(cancelados)} />
        <Stat label="A receber" value={fmtBRL(receber)} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Parcelas vencidas</CardTitle>
            <Badge variant="destructive">{vencidas.length}</Badge>
          </CardHeader>
          <CardContent>
            {vencidas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma parcela vencida.</p>
            ) : (
              <ul className="space-y-2">
                {vencidas.map((p) => (
                  <li key={p.id} className="flex items-center justify-between text-sm gap-2">
                    <div className="min-w-0">
                      <div className="truncate">{p.vendas?.clientes?.nome ?? "Sem cliente"}</div>
                      <div className="text-xs text-destructive">Venceu em {fmtDate(p.data_vencimento)} • Parc. {p.numero_parcela}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-medium">{fmtBRL(p.valor_parcela)}</span>
                      <Button size="sm" variant="outline" onClick={() => pagarParcela(p.id)}>Quitar</Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Próximas parcelas</CardTitle>
            <Badge variant="secondary">{proximas.length}</Badge>
          </CardHeader>
          <CardContent>
            {proximas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem parcelas a vencer.</p>
            ) : (
              <ul className="space-y-2">
                {proximas.map((p) => (
                  <li key={p.id} className="flex items-center justify-between text-sm gap-2">
                    <div className="min-w-0">
                      <div className="truncate">{p.vendas?.clientes?.nome ?? "Sem cliente"}</div>
                      <div className="text-xs text-muted-foreground">Vence em {fmtDate(p.data_vencimento)} • Parc. {p.numero_parcela}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-medium">{fmtBRL(p.valor_parcela)}</span>
                      <Button size="sm" variant="outline" onClick={() => pagarParcela(p.id)}>Quitar</Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Resumo financeiro</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-3 text-sm">
          <div className="p-3 rounded bg-secondary/40">
            <div className="text-xs text-muted-foreground">Total recebido</div>
            <div className="font-serif text-xl text-primary">{fmtBRL(recebido)}</div>
          </div>
          <div className="p-3 rounded bg-secondary/40">
            <div className="text-xs text-muted-foreground">A receber</div>
            <div className="font-serif text-xl">{fmtBRL(receber)}</div>
          </div>
          <div className="p-3 rounded bg-secondary/40">
            <div className="text-xs text-muted-foreground">Vendas (ativas)</div>
            <div className="font-serif text-xl">{vendas.length}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Card className={accent ? "border-accent/50" : ""}>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground mb-1">{label}</div>
        <div className="font-serif text-xl md:text-2xl">{value}</div>
      </CardContent>
    </Card>
  );
}
