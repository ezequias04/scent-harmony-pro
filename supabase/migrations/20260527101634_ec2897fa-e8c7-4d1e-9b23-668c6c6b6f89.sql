
-- 1. LOJAS (slug público)
CREATE TABLE public.lojas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  nome_loja text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lojas TO authenticated;
GRANT ALL ON public.lojas TO service_role;
ALTER TABLE public.lojas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own loja" ON public.lojas FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_lojas_updated BEFORE UPDATE ON public.lojas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. VENDAS — novos campos
ALTER TABLE public.vendas
  ADD COLUMN IF NOT EXISTS tipo_venda text NOT NULL DEFAULT 'a_vista',
  ADD COLUMN IF NOT EXISTS valor_pago numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_pendente numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS data_vencimento date,
  ADD COLUMN IF NOT EXISTS quantidade_parcelas integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS origem_venda text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS pedido_id uuid;

-- 3. CLIENTES — novos campos
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS telefone_whatsapp text,
  ADD COLUMN IF NOT EXISTS origem_cliente text DEFAULT 'manual';

-- 4. PEDIDOS
CREATE TABLE public.pedidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  cliente_id uuid,
  codigo_pedido text NOT NULL,
  nome_cliente text NOT NULL,
  telefone_whatsapp text NOT NULL,
  instagram text,
  endereco text,
  observacoes_cliente text,
  observacoes_internas text,
  subtotal numeric NOT NULL DEFAULT 0,
  desconto numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  status_pedido text NOT NULL DEFAULT 'novo',
  venda_id uuid,
  data_pedido timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pedidos TO authenticated;
GRANT ALL ON public.pedidos TO service_role;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pedidos" ON public.pedidos FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_pedidos_user_status ON public.pedidos(user_id, status_pedido);
CREATE TRIGGER trg_pedidos_updated BEFORE UPDATE ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. ITENS_PEDIDO
CREATE TABLE public.itens_pedido (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  pedido_id uuid NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  produto_id uuid NOT NULL,
  nome_produto_snapshot text NOT NULL,
  imagem_produto_snapshot text,
  quantidade integer NOT NULL,
  preco_unitario numeric NOT NULL,
  total_item numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.itens_pedido TO authenticated;
GRANT ALL ON public.itens_pedido TO service_role;
ALTER TABLE public.itens_pedido ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own itens_pedido" ON public.itens_pedido FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_itens_pedido_pedido ON public.itens_pedido(pedido_id);

-- 6. PARCELAS_VENDA
CREATE TABLE public.parcelas_venda (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  venda_id uuid NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
  numero_parcela integer NOT NULL,
  valor_parcela numeric NOT NULL,
  data_vencimento date NOT NULL,
  data_pagamento date,
  status_parcela text NOT NULL DEFAULT 'pendente',
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parcelas_venda TO authenticated;
GRANT ALL ON public.parcelas_venda TO service_role;
ALTER TABLE public.parcelas_venda ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own parcelas" ON public.parcelas_venda FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_parcelas_venda ON public.parcelas_venda(venda_id);
CREATE TRIGGER trg_parcelas_updated BEFORE UPDATE ON public.parcelas_venda
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
