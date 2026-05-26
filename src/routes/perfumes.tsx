import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent, type ChangeEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { fmtBRL } from "@/lib/format";
import { Plus, Search, Pencil, Trash2, ImageIcon, Package, PackagePlus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/perfumes")({
  component: PerfumesPage,
});

type Perfume = {
  id: string;
  nome: string;
  marca: string | null;
  categoria: string | null;
  tipo_produto: string;
  familia_olfativa: string | null;
  tamanho_volume: string | null;
  volume_ml: number | null;
  preco_custo: number;
  preco_venda: number;
  quantidade_estoque: number;
  estoque_minimo: number;
  fornecedor: string | null;
  descricao: string | null;
  imagem_url: string | null;
  status: string;
  no_catalogo: boolean;
};

const CATEGORIAS = ["masculino", "feminino", "unissex", "arabe", "importado", "contratipo", "outro"];
const TIPOS_PRODUTO = ["Perfume", "Perfume spray", "Body splash", "Creme corporal", "Creme hidratante", "Loção", "Óleo corporal", "Kit presente", "Outro"];
const FAMILIAS = ["Floral", "Amadeirado", "Doce", "Cítrico", "Oriental", "Aromático", "Frutado"];

type ReporForm = {
  quantidade: string;
  preco_custo: string;
  fornecedor: string;
  data: string;
  observacoes: string;
};

const emptyReporForm: ReporForm = {
  quantidade: "",
  preco_custo: "",
  fornecedor: "",
  data: new Date().toISOString().slice(0, 10),
  observacoes: "",
};

function PerfumesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState<string>("all");
  const [filtroTipo, setFiltroTipo] = useState<string>("all");
  const [editing, setEditing] = useState<Perfume | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reporProduto, setReporProduto] = useState<Perfume | null>(null);
  const [reporForm, setReporForm] = useState<ReporForm>(emptyReporForm);

  const { data: perfumes = [], isLoading } = useQuery({
    queryKey: ["perfumes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("perfumes").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Perfume[];
    },
  });

  const filtered = useMemo(() => {
    return perfumes.filter((p) => {
      if (filtroCategoria !== "all" && p.categoria !== filtroCategoria) return false;
      if (filtroTipo !== "all" && p.tipo_produto !== filtroTipo) return false;
      if (!search) return true;
      const s = search.toLowerCase();
      return p.nome.toLowerCase().includes(s) || (p.marca ?? "").toLowerCase().includes(s);
    });
  }, [perfumes, search, filtroCategoria, filtroTipo]);

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("perfumes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produto excluído");
      qc.invalidateQueries({ queryKey: ["perfumes"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const reporMut = useMutation({
    mutationFn: async ({ perfume, form }: { perfume: Perfume; form: ReporForm }) => {
      const qtd = parseInt(form.quantidade);
      if (!qtd || qtd <= 0) throw new Error("Informe uma quantidade válida");
      const newQtd = perfume.quantidade_estoque + qtd;
      const update: { quantidade_estoque: number; preco_custo?: number; fornecedor?: string } = { quantidade_estoque: newQtd };
      if (form.preco_custo) update.preco_custo = parseFloat(form.preco_custo);
      if (form.fornecedor) update.fornecedor = form.fornecedor;
      const { error: e1 } = await supabase.from("perfumes").update(update).eq("id", perfume.id);
      if (e1) throw e1;
      const motivo = [
        `Reposição (${form.data})`,
        form.fornecedor ? `Fornecedor: ${form.fornecedor}` : null,
      ].filter(Boolean).join(" • ");
      const { error: e2 } = await supabase.from("movimentacoes_estoque").insert({
        user_id: user!.id,
        perfume_id: perfume.id,
        tipo: "entrada_reposicao",
        quantidade: qtd,
        motivo,
        observacoes: form.observacoes || null,
      });
      if (e2) throw e2;
    },
    onSuccess: () => {
      toast.success("Estoque reposto");
      qc.invalidateQueries({ queryKey: ["perfumes"] });
      setReporProduto(null);
      setReporForm(emptyReporForm);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl">Produtos</h1>
          <p className="text-muted-foreground text-sm">{perfumes.length} cadastrados</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(null)}>
              <Plus className="w-4 h-4 mr-2" /> Novo produto
            </Button>
          </DialogTrigger>
          <PerfumeFormDialog editing={editing} onClose={() => setDialogOpen(false)} />
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por nome ou marca..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="sm:w-44"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {TIPOS_PRODUTO.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
          <SelectTrigger className="sm:w-44"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground text-sm">Carregando…</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhum produto encontrado.</p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {filtered.map((p) => {
            const lucro = Number(p.preco_venda) - Number(p.preco_custo);
            const baixo = p.quantidade_estoque <= p.estoque_minimo;
            const tamanho = p.tamanho_volume || (p.volume_ml ? `${p.volume_ml}ml` : "");
            return (
              <Card key={p.id} className="overflow-hidden">
                <div className="aspect-square bg-secondary relative">
                  {p.imagem_url ? (
                    <img src={p.imagem_url} alt={p.nome} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <ImageIcon className="w-10 h-10" />
                    </div>
                  )}
                  <Badge className="absolute top-2 left-2 bg-background/90 text-foreground border border-border">{p.tipo_produto}</Badge>
                  {baixo && (
                    <Badge className="absolute top-2 right-2" variant="destructive">Estoque baixo</Badge>
                  )}
                </div>
                <CardContent className="p-3 space-y-2">
                  <div>
                    <div className="font-medium truncate">{p.nome}</div>
                    <div className="text-xs text-muted-foreground truncate">{p.marca}{tamanho ? ` • ${tamanho}` : ""}</div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-serif text-lg text-primary">{fmtBRL(p.preco_venda)}</span>
                    <Badge variant="outline">{p.quantidade_estoque} un</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">Lucro: {fmtBRL(lucro)}</div>
                  <div className="flex gap-1 pt-1">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => { setReporProduto(p); setReporForm({ ...emptyReporForm, preco_custo: String(p.preco_custo ?? ""), fornecedor: p.fornecedor ?? "" }); }}>
                      <PackagePlus className="w-3.5 h-3.5 mr-1" /> Repor
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setDialogOpen(true); }}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
                          <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => delMut.mutate(p.id)}>Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Repor estoque */}
      <Dialog open={!!reporProduto} onOpenChange={(o) => { if (!o) { setReporProduto(null); setReporForm(emptyReporForm); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Repor estoque</DialogTitle>
          </DialogHeader>
          {reporProduto && (
            <div className="space-y-3">
              <div className="text-sm">
                <div className="font-medium">{reporProduto.nome}</div>
                <div className="text-muted-foreground">Estoque atual: {reporProduto.quantidade_estoque} un</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Quantidade *</Label>
                  <Input type="number" min={1} value={reporForm.quantidade} onChange={(e) => setReporForm({ ...reporForm, quantidade: e.target.value })} />
                </div>
                <div>
                  <Label>Preço custo unitário</Label>
                  <Input type="number" step="0.01" value={reporForm.preco_custo} onChange={(e) => setReporForm({ ...reporForm, preco_custo: e.target.value })} />
                </div>
                <div>
                  <Label>Fornecedor</Label>
                  <Input value={reporForm.fornecedor} onChange={(e) => setReporForm({ ...reporForm, fornecedor: e.target.value })} />
                </div>
                <div>
                  <Label>Data</Label>
                  <Input type="date" value={reporForm.data} onChange={(e) => setReporForm({ ...reporForm, data: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea rows={2} value={reporForm.observacoes} onChange={(e) => setReporForm({ ...reporForm, observacoes: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReporProduto(null)}>Cancelar</Button>
            <Button disabled={reporMut.isPending} onClick={() => reporMut.mutate({ perfume: reporProduto!, form: reporForm })}>
              {reporMut.isPending ? "Salvando..." : "Confirmar reposição"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PerfumeFormDialog({ editing, onClose }: { editing: Perfume | null; onClose: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [imgPreview, setImgPreview] = useState<string | null>(editing?.imagem_url ?? null);
  const [imgFile, setImgFile] = useState<File | null>(null);

  const [form, setForm] = useState({
    nome: editing?.nome ?? "",
    marca: editing?.marca ?? "",
    categoria: editing?.categoria ?? "",
    tipo_produto: editing?.tipo_produto ?? "Perfume",
    familia_olfativa: editing?.familia_olfativa ?? "",
    tamanho_volume: editing?.tamanho_volume ?? "",
    volume_ml: editing?.volume_ml?.toString() ?? "",
    preco_custo: editing?.preco_custo?.toString() ?? "",
    preco_venda: editing?.preco_venda?.toString() ?? "",
    quantidade_estoque: editing?.quantidade_estoque?.toString() ?? "0",
    estoque_minimo: editing?.estoque_minimo?.toString() ?? "1",
    fornecedor: editing?.fornecedor ?? "",
    descricao: editing?.descricao ?? "",
    status: editing?.status ?? "disponivel",
    no_catalogo: editing?.no_catalogo ?? true,
  });

  const isPerfume = form.tipo_produto === "Perfume" || form.tipo_produto === "Perfume spray";

  const onImg = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setImgFile(f);
    setImgPreview(URL.createObjectURL(f));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const pvenda = parseFloat(form.preco_venda || "0");
    const pcusto = parseFloat(form.preco_custo || "0");
    const qest = parseInt(form.quantidade_estoque || "0");
    if (pvenda <= 0) return toast.error("Preço de venda deve ser maior que zero");
    if (pcusto < 0) return toast.error("Preço de custo não pode ser negativo");
    if (qest < 0) return toast.error("Estoque não pode ser negativo");
    setSaving(true);
    try {
      let imagem_url = editing?.imagem_url ?? null;
      if (imgFile) {
        const ext = imgFile.name.split(".").pop();
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("perfume-imagens").upload(path, imgFile);
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("perfume-imagens").getPublicUrl(path);
        imagem_url = pub.publicUrl;
      }

      const payload = {
        user_id: user.id,
        nome: form.nome,
        marca: form.marca || null,
        categoria: form.categoria || null,
        tipo_produto: form.tipo_produto,
        familia_olfativa: form.familia_olfativa || null,
        tamanho_volume: form.tamanho_volume || null,
        volume_ml: form.volume_ml ? parseInt(form.volume_ml) : null,
        preco_custo: pcusto,
        preco_venda: pvenda,
        quantidade_estoque: qest,
        estoque_minimo: parseInt(form.estoque_minimo || "1"),
        fornecedor: form.fornecedor || null,
        descricao: form.descricao || null,
        status: form.status,
        no_catalogo: form.no_catalogo,
        imagem_url,
      };

      if (editing) {
        const { error } = await supabase.from("perfumes").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Produto atualizado");
      } else {
        const { error: insErr, data: ins } = await supabase.from("perfumes").insert(payload).select().single();
        if (insErr) throw insErr;
        if (qest > 0 && ins) {
          await supabase.from("movimentacoes_estoque").insert({
            user_id: user.id,
            perfume_id: ins.id,
            tipo: "entrada_inicial",
            quantidade: qest,
            motivo: "Cadastro inicial",
          });
        }
        toast.success("Produto cadastrado");
      }
      qc.invalidateQueries({ queryKey: ["perfumes"] });
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const lucroUnit = (parseFloat(form.preco_venda || "0") - parseFloat(form.preco_custo || "0")) || 0;
  const margem = parseFloat(form.preco_venda || "0") > 0
    ? (lucroUnit / parseFloat(form.preco_venda)) * 100
    : 0;

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{editing ? "Editar produto" : "Novo produto"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="flex gap-4 items-start">
          <label className="w-28 h-28 rounded-lg border-2 border-dashed border-border bg-secondary flex items-center justify-center cursor-pointer overflow-hidden shrink-0">
            {imgPreview ? (
              <img src={imgPreview} alt="" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="w-8 h-8 text-muted-foreground" />
            )}
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onImg} />
          </label>
          <div className="flex-1 grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Nome *</Label>
              <Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div>
              <Label>Tipo de produto *</Label>
              <Select value={form.tipo_produto} onValueChange={(v) => setForm({ ...form, tipo_produto: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TIPOS_PRODUTO.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Marca</Label>
              <Input value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {isPerfume && (
            <div>
              <Label>Categoria</Label>
              <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          {isPerfume && (
            <div>
              <Label>Família olfativa</Label>
              <Select value={form.familia_olfativa} onValueChange={(v) => setForm({ ...form, familia_olfativa: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{FAMILIAS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          {isPerfume ? (
            <div>
              <Label>Volume (ml)</Label>
              <Input type="number" value={form.volume_ml} onChange={(e) => setForm({ ...form, volume_ml: e.target.value })} />
            </div>
          ) : (
            <div>
              <Label>Tamanho</Label>
              <Input placeholder="Ex: 250g, 500ml" value={form.tamanho_volume} onChange={(e) => setForm({ ...form, tamanho_volume: e.target.value })} />
            </div>
          )}
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="disponivel">Disponível</SelectItem>
                <SelectItem value="esgotado">Esgotado</SelectItem>
                <SelectItem value="promocao">Promoção</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Fornecedor</Label>
            <Input value={form.fornecedor} onChange={(e) => setForm({ ...form, fornecedor: e.target.value })} />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <Label>Preço custo</Label>
            <Input type="number" step="0.01" min="0" value={form.preco_custo} onChange={(e) => setForm({ ...form, preco_custo: e.target.value })} />
          </div>
          <div>
            <Label>Preço venda *</Label>
            <Input type="number" step="0.01" min="0.01" required value={form.preco_venda} onChange={(e) => setForm({ ...form, preco_venda: e.target.value })} />
          </div>
          <div>
            <Label>Estoque</Label>
            <Input type="number" min="0" value={form.quantidade_estoque} onChange={(e) => setForm({ ...form, quantidade_estoque: e.target.value })} />
          </div>
          <div>
            <Label>Estoque mínimo</Label>
            <Input type="number" min="0" value={form.estoque_minimo} onChange={(e) => setForm({ ...form, estoque_minimo: e.target.value })} />
          </div>
        </div>

        <div className="bg-secondary rounded-lg p-3 text-sm flex items-center justify-between">
          <span>Lucro por unidade: <strong className="text-primary">{fmtBRL(lucroUnit)}</strong></span>
          <span>Margem: <strong>{margem.toFixed(1)}%</strong></span>
        </div>

        <div>
          <Label>Descrição</Label>
          <Textarea rows={3} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
