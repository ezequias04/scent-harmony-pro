import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Sparkles } from "lucide-react";

export const Route = createFileRoute("/pedido/sucesso")({
  validateSearch: (s) => z.object({ codigo: z.string().optional() }).parse(s),
  head: () => ({ meta: [{ title: "Pedido enviado" }] }),
  component: SucessoPage,
});

function SucessoPage() {
  const { codigo } = Route.useSearch();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardContent className="py-12 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="font-serif text-3xl">Pedido enviado!</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Em breve entraremos em contato para confirmar.
            </p>
          </div>
          {codigo && (
            <div className="bg-secondary/50 rounded-lg p-3 inline-flex items-center gap-2 text-sm">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">Código:</span>
              <span className="font-mono font-medium">{codigo}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
