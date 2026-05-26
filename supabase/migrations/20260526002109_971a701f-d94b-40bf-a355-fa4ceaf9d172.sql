
ALTER TABLE public.perfumes
  ADD COLUMN IF NOT EXISTS tipo_produto text NOT NULL DEFAULT 'Perfume',
  ADD COLUMN IF NOT EXISTS familia_olfativa text,
  ADD COLUMN IF NOT EXISTS tamanho_volume text;

CREATE INDEX IF NOT EXISTS idx_perfumes_tipo_produto ON public.perfumes(tipo_produto);
