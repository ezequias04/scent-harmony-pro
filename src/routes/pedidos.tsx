import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { convertPedidoToVenda } from "@/lib/pedidos.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { fmtBRL, fmtDateTime, onlyDigits } from "@/lib/format";
import { ClipboardList, MessageCircle, ShoppingCart, X, Search, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/pedidos")({ component: PedidosPage });

const STATUS = [
  { v: "novo", label: "Novo", color: "bg-blue-500/15 text-blue-700 dark:text-blue-300" },
  { v: "em_atendimento", label: "Em atendimento", color: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  { v: "confirmado", label: "Confirmado", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  { v: "convertido_em_venda", label: "Convertido", color: "bg-primary/15 text-primary" },
  { v: "cancelado", label: "Cancelado", color: "bg-destructive/15 text-destructive" },
];

function statusBadge(s: string) {
  const meta = STATUS.find((x) => x.v === s);
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${meta?.color ?? "bg-secondary"}`}>{meta?.label ?? s}</span>;
}

function PedidosPage() {
  const qc = useQueryClient();
  const [filtroStatus, setFiltroStatus] = useState("all");
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<any | null>(null);
  const [converter, setConverter] = useState<any | null>(null);

  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ["pedidos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedidos")
        .select("*, itens_pedido(*)")
        .order("data_pedido", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as any[];
    },
  });

  const filtered = useMemo(() => {
    const b = busca.toLowerCase().trim();
    return pedidos.filter((p) => {
      if (filtroStatus !== "all" && p.status_pedido !== filtroStatus) return false;
      if (!b) return true;
      return (
        p.nome_cliente?.toLowerCase().includes(b) ||
        p.telefone_whatsapp?.toLowerCase().includes(b) ||
        p.codigo_pedido?.toLowerCase().includes(b)
      );
    });
  }, [pedidos, filtroStatus, busca]);

  const statusMut = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("pedidos").update({ status_pedido: status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Status atualizado"); qc.invalidateQueries({ queryKey: ["pedidos"] }); },
  });

  const obsMut = useMutation({
    mutationFn: async ({ id, observacoes_internas }: { id: string; observacoes_internas: string }) => {
      const { error } = await supabase.from("pedidos").update({ observacoes_internas }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Observações salvas"); qc.invalidateQueries({ queryKey: ["pedidos"] }); },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl">Pedidos</h1>
        <p className="text-muted-foreground text-sm">{pedidos.length} recebidos</p>
      </div>

      <Card>
        <CardContent className="p-3 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar por nome, telefone ou código…" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="sm:w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {STATUS.map((s) => <SelectItem key={s.v} value={s.v}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <ClipboardList className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">Nenhum pedido encontrado.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <Card key={p.id} className="cursor-pointer hover:border-primary/40 transition" onClick={() => setAberto(p)}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-muted-foreground">{p.codigo_pedido}</span>
                    {statusBadge(p.status_pedido)}
                  </div>
                  <div className="font-medium truncate mt-0.5">{p.nome_cliente}</div>
                  <div className="text-xs text-muted-foreground">
                    {fmtDateTime(p.data_pedido)} • {p.itens_pedido?.length ?? 0} itens • {p.telefone_whatsapp}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-serif text-lg text-primary">{fmtBRL(p.total)}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detalhes */}
      <Dialog open={!!aberto} onOpenChange={(v) => !v && setAberto(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {aberto && (
            <>
              <DialogHeader>
                <DialogTitle className="font-serif text-2xl flex items-center gap-2">
                  Pedido <span className="font-mono text-sm text-muted-foreground">{aberto.codigo_pedido}</span>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div className="flex items-center gap-2">
                  {statusBadge(aberto.status_pedido)}
                  <span className="text-xs text-muted-foreground">{fmtDateTime(aberto.data_pedido)}</span>
                </div>

                <div className="bg-secondary/40 rounded-lg p-3 space-y-1">
                  <div><strong>{aberto.nome_cliente}</strong></div>
                  <div className="text-muted-foreground">WhatsApp: {aberto.telefone_whatsapp}</div>
                  {aberto.instagram && <div className="text-muted-foreground">Instagram: {aberto.instagram}</div>}
                  {aberto.endereco && <div className="text-muted-foreground">Endereço: {aberto.endereco}</div>}
                  {aberto.observacoes_cliente && <div className="text-muted-foreground italic">"{aberto.observacoes_cliente}"</div>}
                  <a
                    href={`https://wa.me/55${onlyDigits(aberto.telefone_whatsapp)}?text=${encodeURIComponent(`Olá, ${aberto.nome_cliente}! Recebi seu pedido ${aberto.codigo_pedido} no valor de ${fmtBRL(aberto.total)}. Vou confirmar a disponibilidade e já te retorno.`)}`}
                    target="_blank" rel="noreferrer"
                  >
                    <Button size="sm" variant="outline" className="mt-2"><MessageCircle className="w-4 h-4 mr-1" /> WhatsApp</Button>
                  </a>
                </div>

                <div>
                  <div className="font-medium mb-1">Itens</div>
                  <ul className="space-y-2">
                    {(aberto.itens_pedido ?? []).map((it: any) => (
                      <li key={it.id} className="flex gap-2 items-center">
                        <div className="w-10 h-10 rounded bg-secondary overflow-hidden shrink-0">
                          {it.imagem_produto_snapshot ? <img src={it.imagem_produto_snapshot} alt="" className="w-full h-full object-cover" /> : null}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="truncate">{it.nome_produto_snapshot}</div>
                          <div className="text-xs text-muted-foreground">{it.quantidade}× {fmtBRL(it.preco_unitario)}</div>
                        </div>
                        <div className="font-medium">{fmtBRL(it.total_item)}</div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex justify-between text-base font-medium border-t pt-2">
                  <span>Total</span>
                  <span className="font-serif text-xl text-primary">{fmtBRL(aberto.total)}</span>
                </div>

                <div>
                  <Label className="text-xs">Status</Label>
                  <Select
                    value={aberto.status_pedido}
                    onValueChange={(v) => {
                      statusMut.mutate({ id: aberto.id, status: v });
                      setAberto({ ...aberto, status_pedido: v });
                    }}
                    disabled={aberto.status_pedido === "convertido_em_venda"}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS.filter((s) => s.v !== "convertido_em_venda").map((s) => <SelectItem key={s.v} value={s.v}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Observações internas</Label>
                  <Textarea
                    rows={2}
                    defaultValue={aberto.observacoes_internas ?? ""}
                    onBlur={(e) => {
                      if (e.target.value !== (aberto.observacoes_internas ?? "")) {
                        obsMut.mutate({ id: aberto.id, observacoes_internas: e.target.value });
                      }
                    }}
                  />
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-2">
                {aberto.status_pedido !== "convertido_em_venda" && aberto.status_pedido !== "cancelado" && (
                  <Button
                    className="flex-1"
                    onClick={() => { setConverter(aberto); setAberto(null); }}
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" /> Converter em venda
                  </Button>
                )}
                <Button variant="outline" onClick={() => setAberto(null)}><X className="w-4 h-4" /></Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConvertDialog pedido={converter} onClose={() => setConverter(null)} />
    </div>
  );
}

function ConvertDialog({ pedido, onClose }: { pedido: any | null; onClose: () => void }) {
  const qc = useQueryClient();
  const convert = useServerFn(convertPedidoToVenda);
  const [tipo, setTipo] = useState<"a_vista" | "a_prazo">("a_vista");
  const [forma, setForma] = useState("pix");
  const [desconto, setDesconto] = useState("0");
  const [clienteMode, setClienteMode] = useState<"novo" | "vincular" | "sem">("novo");
  const [clienteLink, setClienteLink] = useState<string>("");
  const [parcelas, setParcelas] = useState("1");
  const [vencimento, setVencimento] = useState("");
  const [valorPago, setValorPago] = useState("0");
  const [obsPag, setObsPag] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes-list"],
    queryFn: async () => {
      const { data } = await supabase.from("clientes").select("id, nome, telefone_whatsapp, whatsapp").order("nome");
      return data ?? [];
    },
    enabled: !!pedido,
  });

  const submit = async () => {
    if (!pedido) return;
    setSaving(true);
    try {
      await convert({
        data: {
          pedido_id: pedido.id,
          tipo_venda: tipo,
          forma_pagamento: forma,
          desconto: parseFloat(desconto) || 0,
          cliente_mode: clienteMode,
          cliente_id_link: clienteMode === "vincular" ? clienteLink : null,
          quantidade_parcelas: tipo === "a_prazo" ? parseInt(parcelas) || 1 : 1,
          data_vencimento: tipo === "a_prazo" && vencimento ? vencimento : null,
          valor_pago: tipo === "a_prazo" ? parseFloat(valorPago) || 0 : 0,
          observacoes_pagamento: obsPag || undefined,
        },
      });
      toast.success("Pedido convertido em venda!");
      qc.invalidateQueries({ queryKey: ["pedidos"] });
      qc.invalidateQueries({ queryKey: ["vendas"] });
      qc.invalidateQueries({ queryKey: ["perfumes"] });
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao converter");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!pedido} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        {pedido && (
          <>
            <DialogHeader>
              <DialogTitle>Converter em venda</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="bg-secondary/40 rounded p-2 text-xs">
                <div><strong>{pedido.nome_cliente}</strong> • {fmtBRL(pedido.total)}</div>
                <div className="text-muted-foreground">{pedido.itens_pedido?.length ?? 0} itens</div>
              </div>

              <div>
                <Label>Tipo da venda</Label>
                <Select value={tipo} onValueChange={(v: any) => setTipo(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="a_vista">À vista (pago)</SelectItem>
                    <SelectItem value="a_prazo">A prazo (pendente)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Forma de pagamento</Label>
                <Select value={forma} onValueChange={setForma}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">Pix</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="cartao_credito">Cartão de crédito</SelectItem>
                    <SelectItem value="cartao_debito">Cartão de débito</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="fiado">Fiado</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Desconto (R$)</Label>
                <Input type="number" step="0.01" value={desconto} onChange={(e) => setDesconto(e.target.value)} />
              </div>

              {tipo === "a_prazo" && (
                <div className="grid grid-cols-2 gap-2 p-3 rounded bg-amber-500/5 border border-amber-500/20">
                  <div>
                    <Label>Parcelas</Label>
                    <Input type="number" min={1} max={36} value={parcelas} onChange={(e) => setParcelas(e.target.value)} />
                  </div>
                  <div>
                    <Label>1º vencimento</Label>
                    <Input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <Label>Valor pago agora (R$)</Label>
                    <Input type="number" step="0.01" value={valorPago} onChange={(e) => setValorPago(e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <Label>Obs. do pagamento</Label>
                    <Textarea rows={2} value={obsPag} onChange={(e) => setObsPag(e.target.value)} />
                  </div>
                </div>
              )}

              <div>
                <Label>Cliente</Label>
                <Select value={clienteMode} onValueChange={(v: any) => setClienteMode(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="novo">Criar novo cliente ({pedido.nome_cliente})</SelectItem>
                    <SelectItem value="vincular">Vincular a cliente existente</SelectItem>
                    <SelectItem value="sem">Sem cliente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {clienteMode === "vincular" && (
                <Select value={clienteLink} onValueChange={setClienteLink}>
                  <SelectTrigger><SelectValue placeholder="Selecione o cliente…" /></SelectTrigger>
                  <SelectContent>
                    {clientes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome}{c.whatsapp ? ` — ${c.whatsapp}` : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
              <Button onClick={submit} disabled={saving || (clienteMode === "vincular" && !clienteLink)}>
                {saving ? "Convertendo…" : "Confirmar"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
