import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtBRL, onlyDigits } from "@/lib/format";
import { BookOpen, MessageCircle, ImageIcon, Share2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/catalogo")({
  component: CatalogoPage,
});

const CATEGORIAS = ["masculino", "feminino", "unissex", "arabe", "importado", "contratipo", "outro"];

function CatalogoPage() {
  const [filtroCat, setFiltroCat] = useState("all");
  const [whatsapp, setWhatsapp] = useState("");

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

  const filtered = useMemo(() => {
    return perfumes.filter((p) => filtroCat === "all" || p.categoria === filtroCat);
  }, [perfumes, filtroCat]);

  const shareCatalog = async () => {
    const lines = filtered.map((p) =>
      `• ${p.nome}${p.marca ? ` (${p.marca})` : ""}${p.volume_ml ? ` ${p.volume_ml}ml` : ""} — ${fmtBRL(p.preco_venda)}`
    );
    const text = `✨ *Catálogo de Perfumes*\n\n${lines.join("\n")}\n\nFaça seu pedido! 💬`;
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
        <p className="text-muted-foreground text-sm">{filtered.length} perfumes disponíveis</p>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-2">
          <Select value={filtroCat} onValueChange={setFiltroCat}>
            <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="Seu WhatsApp para receber pedidos" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
          <Button onClick={shareCatalog}>
            <Share2 className="w-4 h-4 mr-2" /> Compartilhar
          </Button>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <BookOpen className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">Nenhum perfume no catálogo.</p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {filtered.map((p) => {
            const msg = `Olá, tenho interesse no perfume ${p.nome}${p.volume_ml ? ` de ${p.volume_ml}ml` : ""} no valor de ${fmtBRL(p.preco_venda)}.`;
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
                  {p.status === "promocao" && (
                    <Badge className="absolute top-2 left-2 bg-accent text-accent-foreground">Promoção</Badge>
                  )}
                </div>
                <CardContent className="p-3 space-y-2">
                  <div>
                    <div className="font-medium truncate">{p.nome}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {p.marca}{p.volume_ml ? ` • ${p.volume_ml}ml` : ""}
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
