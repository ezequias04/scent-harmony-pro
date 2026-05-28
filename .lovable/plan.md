
## Auditoria — Gestor de Perfumes

Revisei rotas, autenticação, RLS, cadastro de produtos, estoque, sacola, pedidos, vendas, conversão pedido→venda, parcelas e relatórios. Abaixo o que encontrei e o que proponho corrigir.

---

### 🔴 Erros encontrados

**Segurança (crítico)**
- **S1 — Política duplicada na tabela `itens_venda`.** Existem hoje DUAS políticas: `own itens_venda` (correta, escopo `authenticated`) e **`own itens`** (escopo `{public}` → permite leitura via chave anônima). A `own itens` foi esquecida na rodada anterior de hardening e re-expõe os itens de venda.

**Bugs de lógica financeira**
- **B1 — "Marcar pago" só troca o status.** Em `src/routes/vendas.tsx` o `pagarMut` faz `update({ status_pagamento: 'pago' })` mas **não** atualiza `valor_pago`/`valor_pendente` nem marca as `parcelas_venda` pendentes como `pago`. Resultado: o relatório continua mostrando o valor "a receber" e parcelas em aberto mesmo após quitar.
- **B2 — Venda a prazo com 1 parcela não cria registro em `parcelas_venda`.** Em `src/routes/vendas.nova.tsx` (e em `convertPedidoToVenda`) o `insert` em `parcelas_venda` só roda quando `parcelas > 1`. Vendas "a prazo" com parcela única ficam pendentes mas invisíveis na tela de Relatórios → Parcelas/Próximas.
- **B3 — Dashboard soma vendas canceladas.** Em `src/routes/index.tsx` os totais do dia/semana/mês e o lucro do mês não filtram `status_pagamento !== 'cancelado'`, então uma venda cancelada continua inflando o faturamento.
- **B4 — Saída de estoque sem checagem de erro.** Em `vendas.nova.tsx` os `update` de `perfumes.quantidade_estoque` e o `insert` em `movimentacoes_estoque` são feitos em loop **sem** `await ... ; if (error) throw`. Se um deles falhar (RLS, rede), a venda fica salva mas o estoque não baixa.
- **B5 — Devolução de estoque quebra se o produto foi excluído.** Em `vendas.tsx` o `cancelMut` faz `.single()` sobre `perfumes`; se o perfume não existir mais, a operação inteira falha sem cancelar a venda. Deve usar `.maybeSingle()` e pular itens órfãos.

**Pequenos**
- **P1 — Caches não invalidam ao trocar de usuário.** Sem `onAuthStateChange` no root chamando `queryClient.invalidateQueries()`, dados do usuário anterior podem aparecer por um instante após login.
- **P2 — Catálogo público (`/catalogo/$slug`) trata `isError` mas o `useQuery` está com `retry: false` e sem `staleTime`** — ok funcional, só observação de UX (vou deixar como está).
- **P3 — `ConvertDialog` permite clicar "Confirmar" com `forma_pagamento` vazio se o usuário limpar manualmente.** Defaults garantem `"pix"`, então na prática não acontece — não vou mexer.

---

### ✅ O que vou corrigir

**1. Segurança — migration**
- Dropar a policy `own itens` em `public.itens_venda` (mantendo a `own itens_venda` correta).

**2. `src/routes/vendas.tsx`**
- `pagarMut`: buscar `total` da venda, fazer `update({ status_pagamento:'pago', valor_pago: total, valor_pendente: 0 })` e em seguida `parcelas_venda.update({ status_parcela:'pago', data_pagamento: hoje }).eq('venda_id', id).eq('status_parcela','pendente')`.
- `cancelMut`: trocar `.single()` por `.maybeSingle()` e pular item se o produto não existir mais (com `toast.warning` agregado).

**3. `src/routes/vendas.nova.tsx`**
- Quando `tipoVenda === 'a_prazo'`, **sempre** inserir parcelas (inclusive quando `nParc === 1`).
- Trocar o loop de baixa de estoque por chamadas com checagem de erro (`if (error) throw error`) para abortar com mensagem clara em caso de falha.

**4. `src/lib/pedidos.functions.ts` (`convertPedidoToVenda`)**
- Mesma correção do B2: inserir em `parcelas_venda` sempre que `isPrazo`, mesmo com 1 parcela.

**5. `src/routes/index.tsx` (Dashboard)**
- Filtrar `status_pagamento !== 'cancelado'` em totalDia / totalSemana / totalMes / lucroMes e nos pontos do gráfico.

**6. `src/routes/__root.tsx`**
- Adicionar listener `supabase.auth.onAuthStateChange` que chama `queryClient.invalidateQueries()` para limpar cache entre sessões.

Nenhuma mudança de design, nomes de tabelas ou de rotas.

---

### 📁 Arquivos que serão alterados

- `supabase/migrations/<nova>.sql` (drop da policy duplicada)
- `src/routes/vendas.tsx`
- `src/routes/vendas.nova.tsx`
- `src/routes/index.tsx`
- `src/routes/__root.tsx`
- `src/lib/pedidos.functions.ts`

---

### ▶️ Como rodar o projeto

```bash
bun install
bun run dev    # ambiente de desenvolvimento
bun run build  # build de produção
```

URLs principais:
- App admin: `/` (login obrigatório)
- Catálogo público: `/catalogo/<slug-da-loja>` (ou `/c/<user-id>` como fallback)
- Confirmação de pedido público: `/pedido/sucesso?codigo=...`

---

### ✅ Checklist de teste manual

**Autenticação**
- [ ] Criar conta com e-mail + senha, confirmar pelo e-mail, fazer login.
- [ ] Sair (logout) e logar com outra conta — verificar que os dados do usuário anterior não aparecem.

**Produtos / Estoque**
- [ ] Cadastrar produto com imagem, preço de custo, preço de venda, estoque inicial. Conferir movimentação "entrada_inicial".
- [ ] Editar produto, marcar/desmarcar "no catálogo".
- [ ] Repor estoque pelo botão "Repor" e conferir movimentação "entrada_reposicao".

**Catálogo público**
- [ ] Definir slug em /catalogo, abrir o link em aba anônima, adicionar itens à sacola, enviar pedido com nome + WhatsApp.
- [ ] Confirmar que o pedido aparece em /pedidos com código `P...`.

**Pedidos → Venda**
- [ ] Converter pedido "à vista" criando cliente novo: estoque baixa, venda criada como `pago`, pedido marcado `convertido_em_venda`.
- [ ] Converter pedido "a prazo" com 3 parcelas: ver 3 linhas em parcelas, valor pendente correto.
- [ ] Converter pedido "a prazo" com 1 parcela: agora deve aparecer 1 parcela pendente em Relatórios.

**Vendas manuais**
- [ ] Registrar venda à vista, conferir baixa de estoque e movimentação `saida_venda`.
- [ ] Registrar venda a prazo 2x — conferir parcelas.
- [ ] "Marcar pago" numa venda pendente — conferir que `valor_pendente` zera e as parcelas viram `pago` na tela de Relatórios.
- [ ] Cancelar venda — estoque é devolvido, parcelas pendentes viram `cancelado`.

**Relatórios**
- [ ] Conferir taxa de conversão, totais a receber/recebido, listas de vencidas e próximas.
- [ ] Quitar uma parcela vencida — sai da lista.

**Dashboard**
- [ ] Após cancelar uma venda, o total do mês e o lucro do mês **devem diminuir** (correção do B3).

---

### 🚧 O que ainda pode ser melhorado (fora do escopo desta correção)

- Soft-delete para produtos (hoje a exclusão real quebra histórico de vendas antigas).
- Página `/reset-password` para fluxo completo de "esqueci minha senha".
- Adicionar Google sign-in via broker Lovable (hoje só email+senha).
- Trocar os múltiplos `supabase.from(...)` em loop por uma `rpc` única transacional (atomicidade no checkout/conversão).
- Paginação real nas listas (hoje há `limit(100/200)` fixos).
- Testes automatizados (Vitest) ao menos para os helpers de cálculo de venda e parcelas.
- Indicadores de carregamento mais explícitos em algumas listas (Skeletons).

Aprova para eu já aplicar as correções acima?
