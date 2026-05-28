import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fmtBRL } from "@/lib/format";
import { TrendingUp, Package, AlertTriangle, ShoppingBag, DollarSign } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const userId = user?.id;

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard", userId],
    enabled: !!userId,
    queryFn: async () => {
      const now = new Date();
      const startDay = new Date(now); startDay.setHours(0, 0, 0, 0);
      const startWeek = new Date(now); startWeek.setDate(now.getDate() - 7);
      const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startChart = new Date(now); startChart.setDate(now.getDate() - 13);
      startChart.setHours(0, 0, 0, 0);

      const [vendasRes, perfumesRes, pendentesRes] = await Promise.all([
        supabase.from("vendas").select("id,total,lucro_total,data_venda,status_pagamento")
          .gte("data_venda", startChart.toISOString()).order("data_venda", { ascending: true }),
        supabase.from("perfumes").select("id,nome,quantidade_estoque,estoque_minimo,preco_venda,preco_custo"),
        supabase.from("vendas").select("id,total,cliente_id,data_venda").eq("status_pagamento", "pendente"),
      ]);

      const vendasAll = vendasRes.data ?? [];
      // Ignora vendas canceladas em todos os totais e no gráfico
      const vendas = vendasAll.filter(v => v.status_pagamento !== "cancelado");
      const perfumes = perfumesRes.data ?? [];
      const pendentes = pendentesRes.data ?? [];

      const totalDia = vendas.filter(v => new Date(v.data_venda) >= startDay).reduce((s, v) => s + Number(v.total), 0);
      const totalSemana = vendas.filter(v => new Date(v.data_venda) >= startWeek).reduce((s, v) => s + Number(v.total), 0);
      const totalMes = vendas.filter(v => new Date(v.data_venda) >= startMonth).reduce((s, v) => s + Number(v.total), 0);
      const lucroMes = vendas.filter(v => new Date(v.data_venda) >= startMonth).reduce((s, v) => s + Number(v.lucro_total), 0);
      const estoqueTotal = perfumes.reduce((s, p) => s + p.quantidade_estoque, 0);
      const estoqueBaixo = perfumes.filter(p => p.quantidade_estoque <= p.estoque_minimo);

      // Chart: últimos 14 dias
      const days: { dia: string; total: number; lucro: number }[] = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
        const next = new Date(d); next.setDate(d.getDate() + 1);
        const dayVendas = vendas.filter(v => {
          const dv = new Date(v.data_venda);
          return dv >= d && dv < next;
        });
        days.push({
          dia: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
          total: dayVendas.reduce((s, v) => s + Number(v.total), 0),
          lucro: dayVendas.reduce((s, v) => s + Number(v.lucro_total), 0),
        });
      }

      return { totalDia, totalSemana, totalMes, lucroMes, estoqueTotal, estoqueBaixo, pendentes, chart: days };
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl">Olá!</h1>
        <p className="text-muted-foreground">Resumo do seu negócio hoje.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard icon={DollarSign} label="Vendas hoje" value={fmtBRL(stats?.totalDia)} />
        <StatCard icon={TrendingUp} label="Vendas no mês" value={fmtBRL(stats?.totalMes)} />
        <StatCard icon={ShoppingBag} label="Lucro do mês" value={fmtBRL(stats?.lucroMes)} accent />
        <StatCard icon={Package} label="Itens em estoque" value={String(stats?.estoqueTotal ?? 0)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Vendas — últimos 14 dias</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.chart ?? []} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="dia" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
                <Tooltip
                  contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }}
                  formatter={(v: number) => fmtBRL(v)}
                />
                <Bar dataKey="total" fill="var(--color-primary)" radius={[6, 6, 0, 0]} name="Total" />
                <Bar dataKey="lucro" fill="var(--color-accent)" radius={[6, 6, 0, 0]} name="Lucro" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" /> Estoque baixo
            </CardTitle>
            <Badge variant="secondary">{stats?.estoqueBaixo?.length ?? 0}</Badge>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando…</p>
            ) : stats?.estoqueBaixo.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tudo certo com seu estoque.</p>
            ) : (
              <ul className="space-y-2">
                {stats?.estoqueBaixo.slice(0, 6).map((p) => (
                  <li key={p.id} className="flex items-center justify-between text-sm">
                    <span className="truncate">{p.nome}</span>
                    <Badge variant="outline">{p.quantidade_estoque} un</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Pagamentos pendentes</CardTitle>
            <Badge variant="secondary">{stats?.pendentes?.length ?? 0}</Badge>
          </CardHeader>
          <CardContent>
            {stats?.pendentes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma pendência.</p>
            ) : (
              <ul className="space-y-2">
                {stats?.pendentes.slice(0, 6).map((v) => (
                  <li key={v.id} className="flex items-center justify-between text-sm">
                    <span>Venda {new Date(v.data_venda).toLocaleDateString("pt-BR")}</span>
                    <Badge>{fmtBRL(Number(v.total))}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent?: boolean }) {
  return (
    <Card className={accent ? "border-accent/50" : ""}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">{label}</span>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent ? "bg-accent text-accent-foreground" : "bg-secondary text-secondary-foreground"}`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
        <div className="font-serif text-xl md:text-2xl">{value}</div>
      </CardContent>
    </Card>
  );
}
