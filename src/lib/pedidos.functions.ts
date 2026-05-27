import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const convertSchema = z.object({
  pedido_id: z.string().uuid(),
  tipo_venda: z.enum(["a_vista", "a_prazo"]),
  forma_pagamento: z.string().min(1).max(40),
  desconto: z.number().min(0).default(0),
  // cliente
  cliente_mode: z.enum(["novo", "vincular", "sem"]),
  cliente_id_link: z.string().uuid().optional().nullable(),
  // a prazo
  quantidade_parcelas: z.number().int().min(1).max(36).default(1),
  data_vencimento: z.string().optional().nullable(),
  valor_pago: z.number().min(0).default(0),
  observacoes_pagamento: z.string().max(500).optional().nullable(),
});

export const convertPedidoToVenda = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => convertSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: pedido, error: eP } = await supabase
      .from("pedidos")
      .select("*, itens_pedido(*)")
      .eq("id", data.pedido_id)
      .single();
    if (eP) throw new Error(eP.message);
    if (pedido.status_pedido === "convertido_em_venda" || pedido.venda_id)
      throw new Error("Este pedido já foi convertido em venda");
    if (pedido.status_pedido === "cancelado")
      throw new Error("Pedido cancelado não pode ser convertido");

    const itens = (pedido.itens_pedido ?? []) as any[];
    if (itens.length === 0) throw new Error("Pedido sem itens");

    // Validar estoque + buscar custos
    const ids = itens.map((i) => i.produto_id);
    const { data: produtos, error: eProds } = await supabase
      .from("perfumes")
      .select("id, nome, quantidade_estoque, preco_custo")
      .in("id", ids);
    if (eProds) throw new Error(eProds.message);

    for (const it of itens) {
      const p = produtos?.find((x) => x.id === it.produto_id);
      if (!p) throw new Error(`Produto removido: ${it.nome_produto_snapshot}`);
      if (p.quantidade_estoque < it.quantidade)
        throw new Error(`Estoque insuficiente para ${p.nome} (tem ${p.quantidade_estoque}, precisa ${it.quantidade})`);
    }

    // Cliente
    let clienteId: string | null = null;
    if (data.cliente_mode === "vincular" && data.cliente_id_link) {
      clienteId = data.cliente_id_link;
      await supabase
        .from("clientes")
        .update({
          telefone_whatsapp: pedido.telefone_whatsapp,
          instagram: pedido.instagram,
        })
        .eq("id", clienteId);
    } else if (data.cliente_mode === "novo") {
      const { data: novoCli, error: eC } = await supabase
        .from("clientes")
        .insert({
          user_id: userId,
          nome: pedido.nome_cliente,
          telefone_whatsapp: pedido.telefone_whatsapp,
          whatsapp: pedido.telefone_whatsapp,
          instagram: pedido.instagram,
          endereco: pedido.endereco,
          origem_cliente: "catalogo",
        })
        .select("id")
        .single();
      if (eC) throw new Error(eC.message);
      clienteId = novoCli.id;
    }

    // Calcular totais
    const subtotal = itens.reduce((s, it) => s + Number(it.total_item), 0);
    const total = Math.max(0, subtotal - data.desconto);
    const custoTotal = itens.reduce((s, it) => {
      const p = produtos?.find((x) => x.id === it.produto_id);
      return s + (Number(p?.preco_custo ?? 0) * it.quantidade);
    }, 0);
    const lucro = total - custoTotal;

    const isPrazo = data.tipo_venda === "a_prazo";
    const valor_pago = isPrazo ? Math.min(data.valor_pago, total) : total;
    const valor_pendente = Math.max(0, total - valor_pago);
    const status_pagamento = valor_pendente <= 0.0001 ? "pago" : "pendente";

    // Criar venda
    const { data: venda, error: eV } = await supabase
      .from("vendas")
      .insert({
        user_id: userId,
        cliente_id: clienteId,
        subtotal,
        desconto: data.desconto,
        total,
        custo_total: custoTotal,
        lucro_total: lucro,
        forma_pagamento: data.forma_pagamento,
        status_pagamento,
        tipo_venda: data.tipo_venda,
        valor_pago,
        valor_pendente,
        data_vencimento: isPrazo ? data.data_vencimento : null,
        quantidade_parcelas: isPrazo ? data.quantidade_parcelas : 1,
        origem_venda: "catalogo",
        pedido_id: pedido.id,
        observacoes: data.observacoes_pagamento || null,
      })
      .select("id")
      .single();
    if (eV) throw new Error(eV.message);

    // Itens venda
    const itensRows = itens.map((it) => {
      const p = produtos?.find((x) => x.id === it.produto_id);
      return {
        user_id: userId,
        venda_id: venda.id,
        perfume_id: it.produto_id,
        quantidade: it.quantidade,
        preco_unitario: it.preco_unitario,
        custo_unitario: Number(p?.preco_custo ?? 0),
        total_item: it.total_item,
      };
    });
    const { error: eIV } = await supabase.from("itens_venda").insert(itensRows);
    if (eIV) throw new Error(eIV.message);

    // Parcelas
    if (isPrazo && data.quantidade_parcelas > 1) {
      const valorPorParcela = Number((total / data.quantidade_parcelas).toFixed(2));
      const baseDate = data.data_vencimento ? new Date(data.data_vencimento) : new Date();
      const parcelas = Array.from({ length: data.quantidade_parcelas }, (_, i) => {
        const d = new Date(baseDate);
        d.setMonth(d.getMonth() + i);
        return {
          user_id: userId,
          venda_id: venda.id,
          numero_parcela: i + 1,
          valor_parcela: valorPorParcela,
          data_vencimento: d.toISOString().slice(0, 10),
          status_parcela: "pendente",
        };
      });
      await supabase.from("parcelas_venda").insert(parcelas);
    }

    // Baixar estoque + movimentações
    for (const it of itens) {
      const p = produtos!.find((x) => x.id === it.produto_id)!;
      const novaQtd = p.quantidade_estoque - it.quantidade;
      await supabase.from("perfumes").update({ quantidade_estoque: novaQtd }).eq("id", it.produto_id);
      await supabase.from("movimentacoes_estoque").insert({
        user_id: userId,
        perfume_id: it.produto_id,
        tipo: "saida_pedido_convertido",
        quantidade: it.quantidade,
        motivo: `Pedido ${pedido.codigo_pedido}`,
      });
    }

    // Atualizar pedido
    await supabase
      .from("pedidos")
      .update({ status_pedido: "convertido_em_venda", venda_id: venda.id, cliente_id: clienteId })
      .eq("id", pedido.id);

    return { venda_id: venda.id };
  });
