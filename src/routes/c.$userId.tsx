import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPublicCatalog } from "@/lib/catalog.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtBRL } from "@/lib/format";
import { BookOpen, MessageCircle, ImageIcon, Sparkles, Search } from "lucide-react";

export const Route = createFileRoute("/c/$userId")({
  head: () => ({
    meta: [
      { title: "Catálogo de Produtos" },
      { name: "description", content: "Confira nossos perfumes, body splash, cremes e mais." },
      { property: "og:title", content: "Catálogo de Produtos" },
      { property: "og:description", content: "Confira nossos produtos e faça seu pedido pelo WhatsApp." },
    ],
  }),
  component: CatalogoPublicoPage,
});

const TIPOS = ["Todos", "Perfume", "Perfume spray", "Body splash", "Creme corporal", "Creme hidratante", "Loção", "Óleo corporal", "Kit presente", "Outro"];

function CatalogoPublicoPage() {
  const { userId } = Route.useParams();
  const fetchCatalog = useServerFn(getPublicCatalog);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["public-catalog", userId],
    queryFn: () => fetchCatalog({ data: { userId } }),
  });

  const [tipo, setTipo] = useState("Todos");
  const [search, setSearch] = useState("");

  const produtos = data?.produtos ?? [];
  const filtered = useMemo(() => {
    return produtos.filter((p) => {
      if (tipo !== "Todos" && p.tipo_produto !== tipo) return false;
      if (!search) return true;
      const s = search.toLowerCase();
      return p.nome.toLowerCase().includes(s) || (p.marca ?? "").toLowerCase().includes(s);
    });
  }, [produtos, tipo, search]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-30">
        <div className="container max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-serif text-2xl leading-tight">Catálogo</h1>
            <p className="text-xs text-muted-foreground -mt-0.5">{filtered.length} produtos disponíveis</p>
          </div>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 py-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger className="sm:w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground text-sm">Carregando...</p>
        ) : isError ? (
          <Card><CardContent className="py-16 text-center">
            <p className="text-muted-foreground">Catálogo indisponível.</p>
          </CardContent></Card>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-16 text-center">
            <BookOpen className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhum produto disponível no momento.</p>
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {filtered.map((p) => {
              const tamanho = p.tamanho_volume || (p.volume_ml ? `${p.volume_ml}ml` : "");
              const msg = `Olá, tenho interesse no produto ${p.nome}, ${p.tipo_produto}${tamanho ? `, ${tamanho}` : ""}, no valor de ${fmtBRL(p.preco_venda)}.`;
              const waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
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
                    <a href={waUrl} target="_blank" rel="noreferrer">
                      <Button size="sm" className="w-full">
                        <MessageCircle className="w-4 h-4 mr-1" /> Pedir pelo WhatsApp
                      </Button>
                    </a>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
