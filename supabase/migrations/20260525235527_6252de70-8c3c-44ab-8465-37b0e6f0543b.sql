
-- Perfumes
CREATE TABLE public.perfumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  marca TEXT,
  categoria TEXT,
  volume_ml INTEGER,
  preco_custo NUMERIC(10,2) NOT NULL DEFAULT 0,
  preco_venda NUMERIC(10,2) NOT NULL DEFAULT 0,
  quantidade_estoque INTEGER NOT NULL DEFAULT 0,
  estoque_minimo INTEGER NOT NULL DEFAULT 1,
  fornecedor TEXT,
  descricao TEXT,
  imagem_url TEXT,
  status TEXT NOT NULL DEFAULT 'disponivel',
  no_catalogo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Clientes
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  telefone TEXT,
  whatsapp TEXT,
  instagram TEXT,
  endereco TEXT,
  aniversario DATE,
  preferencias TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Vendas
CREATE TABLE public.vendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  data_venda TIMESTAMPTZ NOT NULL DEFAULT now(),
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  desconto NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  custo_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  lucro_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  forma_pagamento TEXT,
  status_pagamento TEXT NOT NULL DEFAULT 'pago',
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Itens da venda
CREATE TABLE public.itens_venda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  venda_id UUID NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
  perfume_id UUID NOT NULL REFERENCES public.perfumes(id) ON DELETE RESTRICT,
  quantidade INTEGER NOT NULL,
  preco_unitario NUMERIC(10,2) NOT NULL,
  custo_unitario NUMERIC(10,2) NOT NULL,
  total_item NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Movimentações de estoque
CREATE TABLE public.movimentacoes_estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  perfume_id UUID NOT NULL REFERENCES public.perfumes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL, -- 'entrada' | 'saida' | 'venda' | 'cancelamento'
  quantidade INTEGER NOT NULL,
  motivo TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Despesas
CREATE TABLE public.despesas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  categoria TEXT,
  valor NUMERIC(10,2) NOT NULL,
  data_despesa DATE NOT NULL DEFAULT CURRENT_DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_perfumes_updated BEFORE UPDATE ON public.perfumes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_clientes_updated BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_vendas_updated BEFORE UPDATE ON public.vendas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_despesas_updated BEFORE UPDATE ON public.despesas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.perfumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_venda ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;

-- RLS policies (owner only)
CREATE POLICY "own perfumes" ON public.perfumes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own clientes" ON public.clientes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own vendas" ON public.vendas FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own itens" ON public.itens_venda FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own mov" ON public.movimentacoes_estoque FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own despesas" ON public.despesas FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Storage bucket para imagens
INSERT INTO storage.buckets (id, name, public) VALUES ('perfume-imagens', 'perfume-imagens', true);

CREATE POLICY "perfume imgs public read" ON storage.objects FOR SELECT USING (bucket_id = 'perfume-imagens');
CREATE POLICY "perfume imgs owner upload" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'perfume-imagens' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "perfume imgs owner update" ON storage.objects FOR UPDATE USING (
  bucket_id = 'perfume-imagens' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "perfume imgs owner delete" ON storage.objects FOR DELETE USING (
  bucket_id = 'perfume-imagens' AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Índices úteis
CREATE INDEX idx_perfumes_user ON public.perfumes(user_id);
CREATE INDEX idx_clientes_user ON public.clientes(user_id);
CREATE INDEX idx_vendas_user_data ON public.vendas(user_id, data_venda DESC);
CREATE INDEX idx_itens_venda ON public.itens_venda(venda_id);
CREATE INDEX idx_mov_perfume ON public.movimentacoes_estoque(perfume_id);
