import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getPublicCatalog = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ userId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { data: produtos, error } = await supabaseAdmin
      .from("perfumes")
      .select(
        "id, nome, marca, categoria, tipo_produto, familia_olfativa, volume_ml, tamanho_volume, preco_venda, descricao, imagem_url, status, quantidade_estoque"
      )
      .eq("user_id", data.userId)
      .eq("no_catalogo", true)
      .gt("quantidade_estoque", 0)
      .order("nome");
    if (error) throw new Error(error.message);
    return { produtos: produtos ?? [] };
  });

export const getPublicCatalogBySlug = createServerFn({ method: "GET" })
  .inputValidator((data) =>
    z.object({ slug: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { data: loja, error: eL } = await supabaseAdmin
      .from("lojas")
      .select("user_id, nome_loja, slug")
      .eq("slug", data.slug)
      .maybeSingle();
    if (eL) throw new Error(eL.message);
    if (!loja) throw new Error("Loja não encontrada");

    const { data: produtos, error } = await supabaseAdmin
      .from("perfumes")
      .select(
        "id, nome, marca, categoria, tipo_produto, familia_olfativa, volume_ml, tamanho_volume, preco_venda, descricao, imagem_url, status, quantidade_estoque",
      )
      .eq("user_id", loja.user_id)
      .eq("no_catalogo", true)
      .gt("quantidade_estoque", 0)
      .order("nome");
    if (error) throw new Error(error.message);

    return {
      loja: { nome_loja: loja.nome_loja, slug: loja.slug },
      produtos: produtos ?? [],
    };
  });

const itemSchema = z.object({
  produto_id: z.string().uuid(),
  quantidade: z.number().int().min(1).max(999),
});

export const createPublicOrder = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        slug: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/),
        nome_cliente: z.string().trim().min(2).max(120),
        telefone_whatsapp: z.string().trim().min(8).max(30),
        instagram: z.string().trim().max(60).optional().nullable(),
        endereco: z.string().trim().max(500).optional().nullable(),
        observacoes_cliente: z.string().trim().max(1000).optional().nullable(),
        itens: z.array(itemSchema).min(1).max(50),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { data: loja, error: eL } = await supabaseAdmin
      .from("lojas")
      .select("user_id")
      .eq("slug", data.slug)
      .maybeSingle();
    if (eL) throw new Error(eL.message);
    if (!loja) throw new Error("Loja não encontrada");

    const ids = data.itens.map((i) => i.produto_id);
    const { data: produtos, error: eP } = await supabaseAdmin
      .from("perfumes")
      .select("id, nome, preco_venda, imagem_url, quantidade_estoque, no_catalogo")
      .eq("user_id", loja.user_id)
      .in("id", ids);
    if (eP) throw new Error(eP.message);

    let subtotal = 0;
    const rows: any[] = [];
    for (const it of data.itens) {
      const p = produtos?.find((x) => x.id === it.produto_id);
      if (!p || !p.no_catalogo)
        throw new Error("Produto indisponível");
      if (p.quantidade_estoque < it.quantidade)
        throw new Error(`Estoque insuficiente para ${p.nome}`);
      const total_item = Number(p.preco_venda) * it.quantidade;
      subtotal += total_item;
      rows.push({
        produto_id: p.id,
        nome_produto_snapshot: p.nome,
        imagem_produto_snapshot: p.imagem_url,
        preco_unitario: Number(p.preco_venda),
        quantidade: it.quantidade,
        total_item,
      });
    }

    const codigo = `P${Date.now().toString(36).toUpperCase().slice(-6)}${Math.random().toString(36).toUpperCase().slice(2, 5)}`;

    const { data: pedido, error: ePed } = await supabaseAdmin
      .from("pedidos")
      .insert({
        user_id: loja.user_id,
        codigo_pedido: codigo,
        nome_cliente: data.nome_cliente,
        telefone_whatsapp: data.telefone_whatsapp,
        instagram: data.instagram || null,
        endereco: data.endereco || null,
        observacoes_cliente: data.observacoes_cliente || null,
        subtotal,
        desconto: 0,
        total: subtotal,
        status_pedido: "novo",
      })
      .select("id, codigo_pedido")
      .single();
    if (ePed) throw new Error(ePed.message);

    const { error: eI } = await supabaseAdmin.from("itens_pedido").insert(
      rows.map((r) => ({ ...r, user_id: loja.user_id, pedido_id: pedido.id })),
    );
    if (eI) throw new Error(eI.message);

    return { codigo_pedido: pedido.codigo_pedido };
  });
