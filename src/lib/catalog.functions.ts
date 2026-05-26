import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getPublicCatalog = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ userId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { data: produtos, error } = await supabaseAdmin
      .from("perfumes")
      .select(
        "id, nome, marca, categoria, tipo_produto, familia_olfativa, volume_ml, tamanho_volume, preco_venda, descricao, imagem_url, status"
      )
      .eq("user_id", data.userId)
      .eq("no_catalogo", true)
      .gt("quantidade_estoque", 0)
      .order("nome");
    if (error) throw new Error(error.message);
    return { produtos: produtos ?? [] };
  });
