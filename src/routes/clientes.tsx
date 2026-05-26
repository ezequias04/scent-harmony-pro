import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Search, Users, Pencil, Trash2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { onlyDigits } from "@/lib/format";

export const Route = createFileRoute("/clientes")({
  component: ClientesPage,
});

type Cliente = {
  id: string; nome: string; telefone: string | null; whatsapp: string | null;
  instagram: string | null; endereco: string | null; aniversario: string | null;
  preferencias: string | null; observacoes: string | null;
};

function ClientesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [open, setOpen] = useState(false);

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clientes").select("*").order("nome");
      if (error) throw error;
      return data as Cliente[];
    },
  });

  const filtered = clientes.filter((c) =>
    !search || c.nome.toLowerCase().includes(search.toLowerCase()) || (c.telefone ?? "").includes(search)
  );

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clientes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Cliente excluído"); qc.invalidateQueries({ queryKey: ["clientes"] }); },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl">Clientes</h1>
          <p className="text-muted-foreground text-sm">{clientes.length} cadastrados</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(null)}>
              <Plus className="w-4 h-4 mr-2" /> Novo cliente
            </Button>
          </DialogTrigger>
          <ClienteForm editing={editing} userId={user?.id} onClose={() => setOpen(false)} />
        </Dialog>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar por nome ou telefone..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhum cliente.</p>
        </CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {filtered.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{c.nome}</div>
                    {c.telefone && <div className="text-sm text-muted-foreground">{c.telefone}</div>}
                    {c.instagram && <div className="text-xs text-muted-foreground">@{c.instagram.replace("@", "")}</div>}
                  </div>
                  <div className="flex gap-1">
                    {c.whatsapp && (
                      <a href={`https://wa.me/55${onlyDigits(c.whatsapp)}`} target="_blank" rel="noreferrer">
                        <Button size="icon" variant="ghost" title="WhatsApp">
                          <MessageCircle className="w-4 h-4 text-success" />
                        </Button>
                      </a>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setOpen(true); }}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
                          <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => delMut.mutate(c.id)}>Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                {c.preferencias && <p className="text-xs text-muted-foreground mt-2">Prefere: {c.preferencias}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ClienteForm({ editing, userId, onClose }: { editing: Cliente | null; userId?: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome: editing?.nome ?? "",
    telefone: editing?.telefone ?? "",
    whatsapp: editing?.whatsapp ?? "",
    instagram: editing?.instagram ?? "",
    endereco: editing?.endereco ?? "",
    aniversario: editing?.aniversario ?? "",
    preferencias: editing?.preferencias ?? "",
    observacoes: editing?.observacoes ?? "",
  });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    try {
      const payload = {
        user_id: userId,
        nome: form.nome,
        telefone: form.telefone || null,
        whatsapp: form.whatsapp || form.telefone || null,
        instagram: form.instagram || null,
        endereco: form.endereco || null,
        aniversario: form.aniversario || null,
        preferencias: form.preferencias || null,
        observacoes: form.observacoes || null,
      };
      if (editing) {
        const { error } = await supabase.from("clientes").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Cliente atualizado");
      } else {
        const { error } = await supabase.from("clientes").insert(payload);
        if (error) throw error;
        toast.success("Cliente cadastrado");
      }
      qc.invalidateQueries({ queryKey: ["clientes"] });
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{editing ? "Editar cliente" : "Novo cliente"}</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <Label>Nome *</Label>
          <Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Telefone / WhatsApp</Label>
            <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value, whatsapp: e.target.value })} placeholder="(11) 9..." />
          </div>
          <div>
            <Label>Instagram</Label>
            <Input value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} placeholder="@usuario" />
          </div>
        </div>
        <div>
          <Label>Endereço</Label>
          <Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
        </div>
        <div>
          <Label>Aniversário</Label>
          <Input type="date" value={form.aniversario ?? ""} onChange={(e) => setForm({ ...form, aniversario: e.target.value })} />
        </div>
        <div>
          <Label>Preferências de perfume</Label>
          <Input value={form.preferencias} onChange={(e) => setForm({ ...form, preferencias: e.target.value })} placeholder="Florais, amadeirados…" />
        </div>
        <div>
          <Label>Observações</Label>
          <Textarea rows={2} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
