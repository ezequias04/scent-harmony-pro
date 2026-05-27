import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPublicCatalogBySlug, createPublicOrder } from "@/lib/catalog.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { fmtBRL } from "@/lib/format";
import { BookOpen, ImageIcon, Sparkles, Search, ShoppingBag, Plus, Minus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/catalogo/$slug")({
  head: () => ({
    meta: [
      { title: "Catálogo" },
      { name: "description", content: "Confira nossos perfumes, body splash, cremes e mais." },
    ],
  }),
  component: CatalogoSlugPage,
});

const TIPOS = ["Todos", "Perfume", "Perfume spray", "Body splash", "Creme corporal", "Creme hidratante", "Loção", "Óleo corporal", "Kit presente", "Outro"];
const CATEGORIAS = ["Todas", "masculino", "feminino", "unissex", "promocao", "outro"];

type Item = { id: string; nome: string; preco_venda: number; quantidade_estoque: number; imagem_url: string | null };

function CatalogoSlugPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const fetchCatalog = useServerFn(getPublicCatalogBySlug);
  const submitOrder = useServerFn(createPublicOrder);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["public-catalog-slug", slug],
    queryFn: () => fetchCatalog({ data: { slug } }),
    retry: false,
  });

  const [tipo, setTipo] = useState("Todos");
  const [cat, setCat] = useState("Todas");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [form, setForm] = useState({ nome: "", whatsapp: "", instagram: "", endereco: "", obs: "" });
  const [saving, setSaving] = useState(false);

  const produtos = (data?.produtos ?? []) as any[];
  const filtered = useMemo(() => {
    return produtos.filter((p) => {
      if (tipo !== "Todos" && p.tipo_produto !== tipo) return false;
      if (cat !== "Todas") {
        if (cat === "promocao" ? p.status !== "promocao" : p.categoria !== cat) return false;
      }
      if (!search) return true;
      const s = search.toLowerCase();
      return p.nome.toLowerCase().includes(s) || (p.marca ?? "").toLowerCase().includes(s);
    });
  }, [produtos, tipo, cat, search]);

  const add = (p: Item) => {
    setCart((c) => {
      const cur = c[p.id] ?? 0;
      const next = Math.min(cur + 1, p.quantidade_estoque);
      if (next === cur) {
        toast.error("Quantidade máxima em estoque atingida");
        return c;
      }
      toast.success("Adicionado à sacola");
      return { ...c, [p.id]: next };
    });
  };
  const inc = (id: string, max: number) => setCart((c) => ({ ...c, [id]: Math.min((c[id] ?? 0) + 1, max) }));
  const dec = (id: string) => setCart((c) => {
    const v = (c[id] ?? 0) - 1;
    const n = { ...c };
    if (v <= 0) delete n[id]; else n[id] = v;
    return n;
  });
  const remove = (id: string) => setCart((c) => { const n = { ...c }; delete n[id]; return n; });

  const cartItems = Object.entries(cart).map(([id, qtd]) => {
    const p = produtos.find((x) => x.id === id);
    return p ? { ...p, qtd } : null;
  }).filter(Boolean) as any[];
  const totalQtd = cartItems.reduce((s, i) => s + i.qtd, 0);
  const subtotal = cartItems.reduce((s, i) => s + Number(i.preco_venda) * i.qtd, 0);

  const finalizar = async () => {
    if (!form.nome.trim() || form.nome.trim().length < 2) return toast.error("Informe seu nome");
    if (!form.whatsapp.trim() || form.whatsapp.replace(/\D/g, "").length < 8) return toast.error("Informe seu WhatsApp");
    setSaving(true);
    try {
      const res = await submitOrder({
        data: {
          slug,
          nome_cliente: form.nome.trim(),
          telefone_whatsapp: form.whatsapp.trim(),
          instagram: form.instagram.trim() || undefined,
          endereco: form.endereco.trim() || undefined,
          observacoes_cliente: form.obs.trim() || undefined,
          itens: cartItems.map((i) => ({ produto_id: i.id, quantidade: i.qtd })),
        },
      });
      navigate({ to: "/pedido/sucesso", search: { codigo: res.codigo_pedido } });
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao enviar pedido");
    } finally {
      setSaving(false);
    }
  };

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center space-y-2">
            <BookOpen className="w-10 h-10 mx-auto text-muted-foreground" />
            <p className="font-medium">Catálogo indisponível</p>
            <p className="text-sm text-muted-foreground">{(error as any)?.message ?? "Loja não encontrada."}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="border-b border-border bg-card sticky top-0 z-30">
        <div className="container max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-serif text-xl leading-tight truncate">{data?.loja?.nome_loja ?? "Catálogo"}</h1>
            <p className="text-xs text-muted-foreground -mt-0.5">{filtered.length} produtos disponíveis</p>
          </div>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="relative">
                <ShoppingBag className="w-4 h-4 mr-2" /> Sacola
                {totalQtd > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 min-w-5 px-1.5 text-[10px]">{totalQtd}</Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
              <SheetHeader>
                <SheetTitle className="font-serif text-2xl">
                  {checkout ? "Seus dados" : "Sua sacola"}
                </SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto -mx-6 px-6 py-4">
                {!checkout && (
                  cartItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-12">Sacola vazia.</p>
                  ) : (
                    <ul className="space-y-3">
                      {cartItems.map((i) => (
                        <li key={i.id} className="flex gap-3 items-start">
                          <div className="w-14 h-14 rounded-md bg-secondary overflow-hidden shrink-0">
                            {i.imagem_url ? <img src={i.imagem_url} alt="" className="w-full h-full object-cover" /> : null}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{i.nome}</div>
                            <div className="text-xs text-muted-foreground">{fmtBRL(i.preco_venda)} • estoque {i.quantidade_estoque}</div>
                            <div className="flex items-center gap-1 mt-1">
                              <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => dec(i.id)}><Minus className="w-3 h-3" /></Button>
                              <span className="w-8 text-center text-sm">{i.qtd}</span>
                              <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => inc(i.id, i.quantidade_estoque)}><Plus className="w-3 h-3" /></Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 ml-auto" onClick={() => remove(i.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                            </div>
                          </div>
                          <div className="text-sm font-medium shrink-0">{fmtBRL(Number(i.preco_venda) * i.qtd)}</div>
                        </li>
                      ))}
                    </ul>
                  )
                )}
                {checkout && (
                  <div className="space-y-3">
                    <div>
                      <Label>Nome *</Label>
                      <Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} maxLength={120} />
                    </div>
                    <div>
                      <Label>WhatsApp *</Label>
                      <Input value={form.whatsapp} onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))} placeholder="(11) 99999-9999" maxLength={30} />
                    </div>
                    <div>
                      <Label>Instagram</Label>
                      <Input value={form.instagram} onChange={(e) => setForm((f) => ({ ...f, instagram: e.target.value }))} placeholder="@seuinsta" maxLength={60} />
                    </div>
                    <div>
                      <Label>Endereço (opcional)</Label>
                      <Textarea rows={2} value={form.endereco} onChange={(e) => setForm((f) => ({ ...f, endereco: e.target.value }))} maxLength={500} />
                    </div>
                    <div>
                      <Label>Observações</Label>
                      <Textarea rows={2} value={form.obs} onChange={(e) => setForm((f) => ({ ...f, obs: e.target.value }))} maxLength={1000} />
                    </div>
                  </div>
                )}
              </div>
              <SheetFooter className="flex-col gap-2 sm:flex-col">
                <div className="w-full flex justify-between text-sm border-t border-border pt-3">
                  <span>Subtotal ({totalQtd})</span>
                  <span className="font-serif text-lg text-primary">{fmtBRL(subtotal)}</span>
                </div>
                {!checkout ? (
                  <Button className="w-full" disabled={cartItems.length === 0} onClick={() => setCheckout(true)}>
                    Continuar
                  </Button>
                ) : (
                  <div className="w-full flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setCheckout(false)}>Voltar</Button>
                    <Button className="flex-1" disabled={saving} onClick={finalizar}>
                      {saving ? "Enviando…" : "Enviar pedido"}
                    </Button>
                  </div>
                )}
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 py-5 space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar produto ou marca…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>{TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>{CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground text-sm">Carregando…</p>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-16 text-center">
            <BookOpen className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhum produto disponível.</p>
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {filtered.map((p) => {
              const tamanho = p.tamanho_volume || (p.volume_ml ? `${p.volume_ml}ml` : "");
              const inCart = cart[p.id] ?? 0;
              return (
                <Card key={p.id} className="overflow-hidden group flex flex-col">
                  <div className="aspect-square bg-secondary relative">
                    {p.imagem_url ? (
                      <img src={p.imagem_url} alt={p.nome} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <ImageIcon className="w-10 h-10" />
                      </div>
                    )}
                    <Badge className="absolute top-2 left-2 bg-background/90 text-foreground border border-border">{p.tipo_produto}</Badge>
                    {p.status === "promocao" && (
                      <Badge className="absolute top-2 right-2 bg-accent text-accent-foreground">Promoção</Badge>
                    )}
                  </div>
                  <CardContent className="p-3 space-y-2 flex flex-col flex-1">
                    <div>
                      <div className="font-medium truncate">{p.nome}</div>
                      <div className="text-xs text-muted-foreground truncate">{p.marca}{tamanho ? ` • ${tamanho}` : ""}</div>
                    </div>
                    <div className="font-serif text-xl text-primary">{fmtBRL(p.preco_venda)}</div>
                    {p.descricao && <p className="text-xs text-muted-foreground line-clamp-2">{p.descricao}</p>}
                    <div className="mt-auto pt-1">
                      <Button size="sm" className="w-full" onClick={() => add(p)} disabled={inCart >= p.quantidade_estoque}>
                        <Plus className="w-4 h-4 mr-1" /> {inCart > 0 ? `Na sacola (${inCart})` : "Adicionar"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {totalQtd > 0 && (
        <button
          onClick={() => setOpen(true)}
          className="md:hidden fixed bottom-4 right-4 z-40 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center gap-2 px-5 py-3 font-medium active:scale-95 transition"
          style={{ bottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
        >
          <ShoppingBag className="w-5 h-5" />
          {totalQtd} • {fmtBRL(subtotal)}
        </button>
      )}
    </div>
  );
}
