
-- clientes
DROP POLICY IF EXISTS "own clientes" ON public.clientes;
CREATE POLICY "own clientes" ON public.clientes
  AS PERMISSIVE FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- perfumes
DROP POLICY IF EXISTS "own perfumes" ON public.perfumes;
CREATE POLICY "own perfumes" ON public.perfumes
  AS PERMISSIVE FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- despesas
DROP POLICY IF EXISTS "own despesas" ON public.despesas;
CREATE POLICY "own despesas" ON public.despesas
  AS PERMISSIVE FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- vendas
DROP POLICY IF EXISTS "own vendas" ON public.vendas;
CREATE POLICY "own vendas" ON public.vendas
  AS PERMISSIVE FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- itens_venda
DROP POLICY IF EXISTS "own itens_venda" ON public.itens_venda;
CREATE POLICY "own itens_venda" ON public.itens_venda
  AS PERMISSIVE FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- movimentacoes_estoque
DROP POLICY IF EXISTS "own mov" ON public.movimentacoes_estoque;
CREATE POLICY "own mov" ON public.movimentacoes_estoque
  AS PERMISSIVE FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
