import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtBRL } from "@/lib/format";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/vendas/nova")({
  component: NovaVenda,
});

type Perfume = { id: string; nome: string; marca: string | null; tipo_produto: string; tamanho_volume: string | null; volume_ml: number | null; imagem_url: string | null; preco_venda: number; preco_custo: number; quantidade_estoque: number };

type ItemForm = { perfume_id: string; quantidade: number };

function NovaVenda() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: perfumes = [] } = useQuery({
    queryKey: ["perfumes-vendaveis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("perfumes")
        .select("id, nome, marca, tipo_produto, tamanho_volume, volume_ml, imagem_url, preco_venda, preco_custo, quantidade_estoque")
        .gt("quantidade_estoque", 0)
        .order("nome");
      if (error) throw error;
      return data as Perfume[];
    },
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes-simples"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clientes").select("id,nome").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const [clienteId, setClienteId] = useState<string>("none");
  const [itens, setItens] = useState<ItemForm[]>([]);
  const [desconto, setDesconto] = useState("0");
  const [forma, setForma] = useState("pix");
  const [status, setStatus] = useState("pago");
  const [obs, setObs] = useState("");
  const [saving, setSaving] = useState(false);

  const addItem = () => setItens((arr) => [...arr, { perfume_id: "", quantidade: 1 }]);
  const updateItem = (idx: number, patch: Partial<ItemForm>) =>
    setItens((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const removeItem = (idx: number) => setItens((arr) => arr.filter((_, i) => i !== idx));

  const calc = () => {
    let subtotal = 0;
    let custoTotal = 0;
    for (const it of itens) {
      const p = perfumes.find((x) => x.id === it.perfume_id);
      if (!p) continue;
      subtotal += Number(p.preco_venda) * it.quantidade;
      custoTotal += Number(p.preco_custo) * it.quantidade;
    }
    const desc = parseFloat(desconto || "0");
    const total = Math.max(0, subtotal - desc);
    const lucro = total - custoTotal;
    return { subtotal, custoTotal, total, lucro, desc };
  };
  const { subtotal, custoTotal, total, lucro, desc } = calc();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (itens.length === 0) return toast.error("Adicione ao menos um perfume");
    for (const it of itens) {
      if (!it.perfume_id) return toast.error("Selecione todos os perfumes");
      const p = perfumes.find((x) => x.id === it.perfume_id)!;
      if (it.quantidade > p.quantidade_estoque) return toast.error(`Estoque insuficiente para ${p.nome}`);
    }
    setSaving(true);
    try {
      const { data: venda, error: ev } = await supabase
        .from("vendas")
        .insert({
          user_id: user!.id,
          cliente_id: clienteId === "none" ? null : clienteId,
          subtotal,
          desconto: desc,
          total,
          custo_total: custoTotal,
          lucro_total: lucro,
          forma_pagamento: forma,
          status_pagamento: status,
          observacoes: obs || null,
        })
        .select()
        .single();
      if (ev) throw ev;

      const itensRows = itens.map((it) => {
        const p = perfumes.find((x) => x.id === it.perfume_id)!;
        return {
          user_id: user!.id,
          venda_id: venda.id,
          perfume_id: p.id,
          quantidade: it.quantidade,
          preco_unitario: p.preco_venda,
          custo_unitario: p.preco_custo,
          total_item: Number(p.preco_venda) * it.quantidade,
        };
      });
      const { error: ei } = await supabase.from("itens_venda").insert(itensRows);
      if (ei) throw ei;

      // Atualizar estoque
      for (const it of itens) {
        const p = perfumes.find((x) => x.id === it.perfume_id)!;
        const newQtd = p.quantidade_estoque - it.quantidade;
        await supabase.from("perfumes").update({ quantidade_estoque: newQtd }).eq("id", p.id);
        await supabase.from("movimentacoes_estoque").insert({
          user_id: user!.id,
          perfume_id: p.id,
          tipo: "saida_venda",
          quantidade: it.quantidade,
          motivo: `Venda ${venda.id.slice(0, 8)}`,
        });
      }

      toast.success("Venda registrada!");
      navigate({ to: "/vendas" });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" size="icon" onClick={() => navigate({ to: "/vendas" })}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-3xl">Nova venda</h1>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Cliente</CardTitle></CardHeader>
        <CardContent>
          <Select value={clienteId} onValueChange={setClienteId}>
            <SelectTrigger><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem cliente</SelectItem>
              {clientes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Perfumes</CardTitle>
          <Button type="button" size="sm" variant="outline" onClick={addItem}>
            <Plus className="w-4 h-4 mr-1" /> Adicionar
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {itens.length === 0 && <p className="text-sm text-muted-foreground">Nenhum item adicionado.</p>}
          {itens.map((it, idx) => {
            const p = perfumes.find((x) => x.id === it.perfume_id);
            return (
              <div key={idx} className="flex gap-2 items-end">
                <div className="flex-1">
                  <Label className="text-xs">Perfume</Label>
                  <Select value={it.perfume_id} onValueChange={(v) => updateItem(idx, { perfume_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {perfumes.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nome} {p.marca ? `(${p.marca})` : ""} — {fmtBRL(p.preco_venda)} • {p.quantidade_estoque} un
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-20">
                  <Label className="text-xs">Qtd</Label>
                  <Input type="number" min={1} max={p?.quantidade_estoque}
                    value={it.quantidade}
                    onChange={(e) => updateItem(idx, { quantidade: Math.max(1, parseInt(e.target.value) || 1) })} />
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(idx)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Pagamento</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-3">
          <div>
            <Label>Forma</Label>
            <Select value={forma} onValueChange={setForma}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pix">Pix</SelectItem>
                <SelectItem value="dinheiro">Dinheiro</SelectItem>
                <SelectItem value="cartao">Cartão</SelectItem>
                <SelectItem value="boleto">Boleto</SelectItem>
                <SelectItem value="fiado">Fiado</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pago">Pago</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Desconto (R$)</Label>
            <Input type="number" step="0.01" value={desconto} onChange={(e) => setDesconto(e.target.value)} />
          </div>
          <div className="sm:col-span-3">
            <Label>Observações</Label>
            <Textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-secondary/50">
        <CardContent className="p-4 space-y-1 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{fmtBRL(subtotal)}</span></div>
          <div className="flex justify-between"><span>Desconto</span><span>- {fmtBRL(desc)}</span></div>
          <div className="flex justify-between text-base font-medium pt-2 border-t border-border">
            <span>Total</span><span className="font-serif text-xl text-primary">{fmtBRL(total)}</span>
          </div>
          <div className="flex justify-between text-success-foreground/80 pt-1">
            <span>Lucro estimado</span><strong>{fmtBRL(lucro)}</strong>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2 sticky bottom-0 bg-background pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={() => navigate({ to: "/vendas" })}>Cancelar</Button>
        <Button type="submit" className="flex-1" disabled={saving || itens.length === 0}>
          {saving ? "Salvando..." : "Finalizar venda"}
        </Button>
      </div>
    </form>
  );
}
