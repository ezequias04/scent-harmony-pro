import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtBRL, onlyDigits } from "@/lib/format";
import { BookOpen, MessageCircle, ImageIcon, Share2, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/catalogo")({
  component: CatalogoPage,
});

const CATEGORIAS = ["masculino", "feminino", "unissex", "arabe", "importado", "contratipo", "outro"];
const TIPOS_PRODUTO = ["Perfume", "Perfume spray", "Body splash", "Creme corporal", "Creme hidratante", "Loção", "Óleo corporal", "Kit presente", "Outro"];

function CatalogoPage() {
  const { user } = useAuth();
  const [filtroCat, setFiltroCat] = useState("all");
  const [filtroTipo, setFiltroTipo] = useState("all");
  const [filtroMarca, setFiltroMarca] = useState("all");
  const [precoMin, setPrecoMin] = useState("");
  const [precoMax, setPrecoMax] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [apenasPromo, setApenasPromo] = useState(false);

  const { data: perfumes = [] } = useQuery({
    queryKey: ["catalogo-perfumes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("perfumes")
        .select("*")
        .eq("no_catalogo", true)
        .gt("quantidade_estoque", 0)
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const marcas = useMemo(() => {
    const s = new Set<string>();
    perfumes.forEach((p) => { if (p.marca) s.add(p.marca); });
    return Array.from(s).sort();
  }, [perfumes]);

  const filtered = useMemo(() => {
    const pmin = parseFloat(precoMin) || 0;
    const pmax = parseFloat(precoMax) || Infinity;
    return perfumes.filter((p) => {
      if (filtroCat !== "all" && p.categoria !== filtroCat) return false;
      if (filtroTipo !== "all" && p.tipo_produto !== filtroTipo) return false;
      if (filtroMarca !== "all" && p.marca !== filtroMarca) return false;
      if (apenasPromo && p.status !== "promocao") return false;
      const preco = Number(p.preco_venda);
      if (preco < pmin || preco > pmax) return false;
      return true;
    });
  }, [perfumes, filtroCat, filtroTipo, filtroMarca, precoMin, precoMax, apenasPromo]);

  const { data: loja, refetch: refetchLoja } = useQuery({
    queryKey: ["loja", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("lojas").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const [slugInput, setSlugInput] = useState("");
  const [nomeLoja, setNomeLoja] = useState("");
  const slugSaving = useRef(false);
  const saveSlug = async () => {
    const s = slugInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    if (s.length < 3) return toast.error("Use ao menos 3 caracteres (a-z, 0-9, -)");
    if (slugSaving.current) return;
    slugSaving.current = true;
    try {
      const payload = { user_id: user!.id, slug: s, nome_loja: nomeLoja.trim() || null };
      const { error } = loja
        ? await supabase.from("lojas").update(payload).eq("id", loja.id)
        : await supabase.from("lojas").insert(payload);
      if (error) {
        if (error.code === "23505") toast.error("Esse link já está em uso, escolha outro");
        else toast.error(error.message);
        return;
      }
      toast.success("Link da loja salvo!");
      refetchLoja();
    } finally { slugSaving.current = false; }
  };

  const slugUrl = loja ? `${window.location.origin}/catalogo/${loja.slug}` : "";
  const publicUrl = slugUrl || (user ? `${window.location.origin}/c/${user.id}` : "");

  const copyLink = async () => {
    await navigator.clipboard.writeText(publicUrl);
    toast.success("Link copiado!");
  };

  const shareCatalog = async () => {
    const lines = filtered.map((p) => {
      const tamanho = p.tamanho_volume || (p.volume_ml ? `${p.volume_ml}ml` : "");
      return `• ${p.nome}${p.marca ? ` (${p.marca})` : ""}${tamanho ? ` ${tamanho}` : ""} — ${fmtBRL(p.preco_venda)}`;
    });
    const linkLine = publicUrl ? `\n\n🔗 Catálogo completo: ${publicUrl}` : "";
    const text = `✨ *Catálogo de Produtos*\n\n${lines.join("\n")}${linkLine}\n\nFaça seu pedido! 💬`;
    if (whatsapp) {
      window.open(`https://wa.me/55${onlyDigits(whatsapp)}?text=${encodeURIComponent(text)}`, "_blank");
    } else {
      await navigator.clipboard.writeText(text);
      toast.success("Catálogo copiado!");
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl">Catálogo</h1>
        <p className="text-muted-foreground text-sm">{filtered.length} produtos disponíveis</p>
      </div>

      {publicUrl && (
        <Card className="bg-secondary/30">
          <CardContent className="p-4 space-y-2">
            <div className="text-sm font-medium">Link público do seu catálogo</div>
            <div className="flex gap-2">
              <Input readOnly value={publicUrl} className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={copyLink}><Copy className="w-4 h-4" /></Button>
              <a href={publicUrl} target="_blank" rel="noreferrer">
                <Button variant="outline" size="icon"><ExternalLink className="w-4 h-4" /></Button>
              </a>
            </div>
            <p className="text-xs text-muted-foreground">Compartilhe esse link com seus clientes — eles veem fotos, preços e pedem pelo WhatsApp.</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {TIPOS_PRODUTO.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filtroCat} onValueChange={setFiltroCat}>
              <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filtroMarca} onValueChange={setFiltroMarca}>
              <SelectTrigger><SelectValue placeholder="Marca" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas marcas</SelectItem>
                {marcas.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <div>
              <Label className="text-xs">Preço mín</Label>
              <Input type="number" placeholder="0" value={precoMin} onChange={(e) => setPrecoMin(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Preço máx</Label>
              <Input type="number" placeholder="∞" value={precoMax} onChange={(e) => setPrecoMax(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button variant={apenasPromo ? "default" : "outline"} className="w-full" onClick={() => setApenasPromo((v) => !v)}>
                Promoções
              </Button>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-border">
            <Input placeholder="Seu WhatsApp (opcional)" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
            <Button onClick={shareCatalog}>
              <Share2 className="w-4 h-4 mr-2" /> Compartilhar lista
            </Button>
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <BookOpen className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">Nenhum produto no catálogo.</p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {filtered.map((p) => {
            const tamanho = p.tamanho_volume || (p.volume_ml ? `${p.volume_ml}ml` : "");
            const msg = `Olá, tenho interesse no produto ${p.nome}, ${p.tipo_produto}${tamanho ? `, ${tamanho}` : ""}, no valor de ${fmtBRL(p.preco_venda)}.`;
            const waLink = whatsapp
              ? `https://wa.me/55${onlyDigits(whatsapp)}?text=${encodeURIComponent(msg)}`
              : null;
            return (
              <Card key={p.id} className="overflow-hidden group">
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
                <CardContent className="p-3 space-y-2">
                  <div>
                    <div className="font-medium truncate">{p.nome}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {p.marca}{tamanho ? ` • ${tamanho}` : ""}
                    </div>
                  </div>
                  <div className="font-serif text-xl text-primary">{fmtBRL(p.preco_venda)}</div>
                  {p.descricao && <p className="text-xs text-muted-foreground line-clamp-2">{p.descricao}</p>}
                  {waLink && (
                    <a href={waLink} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="outline" className="w-full">
                        <MessageCircle className="w-4 h-4 mr-1" /> Pedir
                      </Button>
                    </a>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
