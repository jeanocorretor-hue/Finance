import { NextRequest, NextResponse } from 'next/server';
import { eq, and, desc, asc, lte, gt, count } from 'drizzle-orm';
import {
  db,
  cardsTable,
  expensesTable,
  revenuesTable,
  monthStateTable,
  revenueStateTable,
  expenseLogTable,
  pluggyItemsTable,
  pluggyTransactionsTable,
} from '@/db';
import {
  createPluggyConnectToken,
  sincronizarPluggyItem,
} from '@/lib/pluggy';
import {
  classificarTransacaoComJev,
  classificarLoteTransacoesComJev,
  encontrarMatchDespesaComJev,
} from '@/lib/typesafe';

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const SEED_CARDS = [
  { id: 'card-nubank', nome: 'Nubank', dia_vencimento: 5, cor: '#8B5CF6' },
  { id: 'card-neon', nome: 'Neon', dia_vencimento: 5, cor: '#22D3EE' },
  { id: 'card-sicredi', nome: 'Sicredi Empresa', dia_vencimento: 13, cor: '#4ADE80' },
];

const SEED_EXPENSES = [
  { id: 'exp-agua', nome: 'Água', valor_base: '150', categoria: 'casa', recorrencia: 'recorrente', parcelas: null, estimado: false, dia_vencimento: 20, cartao_id: null, mes_origem: '2026-01', ativo: true },
  { id: 'exp-alternador', nome: 'Alternador', valor_base: '230', categoria: 'veiculo', recorrencia: 'parcelada', parcelas: 3, estimado: false, dia_vencimento: null, cartao_id: 'card-neon', mes_origem: '2026-06', ativo: true },
  { id: 'exp-anthropic', nome: 'Anthropic', valor_base: '110', categoria: 'assinatura', recorrencia: 'recorrente', parcelas: null, estimado: false, dia_vencimento: null, cartao_id: 'card-nubank', mes_origem: '2026-01', ativo: true },
  { id: 'exp-gemini', nome: 'API Gemini Finance', valor_base: '50', categoria: 'assinatura', recorrencia: 'recorrente', parcelas: null, estimado: false, dia_vencimento: null, cartao_id: 'card-nubank', mes_origem: '2026-01', ativo: true },
  { id: 'exp-casa', nome: 'Casa', valor_base: '577', categoria: 'casa', recorrencia: 'recorrente', parcelas: null, estimado: false, dia_vencimento: 5, cartao_id: null, mes_origem: '2026-01', ativo: true },
  { id: 'exp-emprestimo', nome: 'Empréstimo', valor_base: '172', categoria: 'servicos', recorrencia: 'parcelada', parcelas: 6, estimado: false, dia_vencimento: 8, cartao_id: null, mes_origem: '2026-04', ativo: true },
  { id: 'exp-gasolina', nome: 'Gasolina', valor_base: '800', categoria: 'veiculo', recorrencia: 'recorrente', parcelas: null, estimado: true, dia_vencimento: null, cartao_id: null, mes_origem: '2026-01', ativo: true },
  { id: 'exp-icloud', nome: 'iCloud', valor_base: '19.90', categoria: 'assinatura', recorrencia: 'recorrente', parcelas: null, estimado: false, dia_vencimento: null, cartao_id: 'card-nubank', mes_origem: '2026-01', ativo: true },
  { id: 'exp-internet', nome: 'Internet', valor_base: '123', categoria: 'servicos', recorrencia: 'recorrente', parcelas: null, estimado: false, dia_vencimento: 15, cartao_id: null, mes_origem: '2026-01', ativo: true },
  { id: 'exp-iptu', nome: 'IPTU', valor_base: '203', categoria: 'casa', recorrencia: 'parcelada', parcelas: 23, estimado: false, dia_vencimento: 10, cartao_id: null, mes_origem: '2026-01', ativo: true },
  { id: 'exp-lightroom', nome: 'Lightroom', valor_base: '35', categoria: 'assinatura', recorrencia: 'recorrente', parcelas: null, estimado: false, dia_vencimento: null, cartao_id: 'card-nubank', mes_origem: '2026-01', ativo: true },
  { id: 'exp-luz', nome: 'Luz', valor_base: '225', categoria: 'casa', recorrencia: 'recorrente', parcelas: null, estimado: true, dia_vencimento: 25, cartao_id: null, mes_origem: '2026-01', ativo: true },
  { id: 'exp-oral-unic', nome: 'Oral Unic', valor_base: '360', categoria: 'saude', recorrencia: 'recorrente', parcelas: null, estimado: false, dia_vencimento: 10, cartao_id: null, mes_origem: '2026-01', ativo: true },
  { id: 'exp-parcela-carro', nome: 'Parcela do Carro', valor_base: '1263', categoria: 'veiculo', recorrencia: 'parcelada', parcelas: 3, estimado: false, dia_vencimento: 12, cartao_id: null, mes_origem: '2026-05', ativo: true },
  { id: 'exp-pneu', nome: 'Pneu', valor_base: '180.85', categoria: 'veiculo', recorrencia: 'parcelada', parcelas: 6, estimado: false, dia_vencimento: null, cartao_id: 'card-sicredi', mes_origem: '2026-07', ativo: true },
  { id: 'exp-susp', nome: 'Susp.', valor_base: '1080', categoria: 'veiculo', recorrencia: 'parcelada', parcelas: 6, estimado: false, dia_vencimento: null, cartao_id: 'card-sicredi', mes_origem: '2026-07', ativo: true },
  { id: 'exp-telefone', nome: 'Telefone', valor_base: '55', categoria: 'servicos', recorrencia: 'recorrente', parcelas: null, estimado: false, dia_vencimento: 18, cartao_id: null, mes_origem: '2026-01', ativo: true },
  { id: 'exp-zapi', nome: 'Z-API', valor_base: '100', categoria: 'assinatura', recorrencia: 'recorrente', parcelas: null, estimado: false, dia_vencimento: null, cartao_id: 'card-nubank', mes_origem: '2026-01', ativo: true },
];

const SEED_REVENUES = [
  { id: 'rev-comissao', nome: 'Comissão', valor_base: '18750', categoria: 'comissao', recorrencia: 'avulsa', mes_origem: '2026-11', ativo: true },
  { id: 'rev-fixo', nome: 'Fixo Mensal', valor_base: '6000', categoria: 'fixo', recorrencia: 'recorrente', mes_origem: '2026-07', ativo: true },
  { id: 'rev-salario', nome: 'Salário', valor_base: '2000', categoria: 'fixo', recorrencia: 'recorrente', mes_origem: '2026-07', ativo: true },
];

const SEED_MONTH_STATE = SEED_EXPENSES.map((e) => ({
  expense_id: e.id,
  mes_ref: '2026-07',
  valor_real: null as string | null,
  pago: true,
  pago_em: new Date('2026-07-06T09:00:00Z'),
}));

async function handleGet(subPath: string[]) {
  const endpoint = subPath.join('/');
  if (endpoint === 'data') {
    let [cards, expenses, revenues, monthState, revenueState, expenseLog] =
      await Promise.all([
        db.select().from(cardsTable),
        db.select().from(expensesTable),
        db.select().from(revenuesTable),
        db.select().from(monthStateTable),
        db.select().from(revenueStateTable),
        db.select().from(expenseLogTable),
      ]);

    if (cards.length === 0 && expenses.length === 0) {
      await db.insert(cardsTable).values(SEED_CARDS);
      await db.insert(expensesTable).values(SEED_EXPENSES);
      await db.insert(revenuesTable).values(SEED_REVENUES);
      await db.insert(monthStateTable).values(SEED_MONTH_STATE);

      [cards, expenses, revenues, monthState] = await Promise.all([
        db.select().from(cardsTable),
        db.select().from(expensesTable),
        db.select().from(revenuesTable),
        db.select().from(monthStateTable),
      ]);
    }

    return NextResponse.json({
      cards,
      expenses,
      revenues,
      monthState,
      revenueState,
      expenseLog,
    });
  }

  if (endpoint === 'pluggy/token') {
    try {
      const connectToken = await createPluggyConnectToken({
        clientUserId: 'finance-personal-user',
      });
      return NextResponse.json({ connectToken });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  if (endpoint === 'pluggy/status') {
    const items = await db.select().from(pluggyItemsTable);
    const now = new Date();

    // Extrato realizado (até o momento presente) em ordem cronológica decrescente
    const recentTransactions = await db
      .select()
      .from(pluggyTransactionsTable)
      .where(lte(pluggyTransactionsTable.date, now))
      .orderBy(desc(pluggyTransactionsTable.date))
      .limit(100);

    // Parcelamentos futuros do cartão de crédito ordenados do mais próximo para o mais distante
    const futureTransactions = await db
      .select()
      .from(pluggyTransactionsTable)
      .where(gt(pluggyTransactionsTable.date, now))
      .orderBy(asc(pluggyTransactionsTable.date))
      .limit(50);

    // Pendentes de conciliação (apenas movimentações já ocorridas)
    const pendingTransactions = await db
      .select()
      .from(pluggyTransactionsTable)
      .where(and(eq(pluggyTransactionsTable.status, 'pending'), lte(pluggyTransactionsTable.date, now)))
      .orderBy(desc(pluggyTransactionsTable.date))
      .limit(50);

    const [txCountRes] = await db
      .select({ val: count() })
      .from(pluggyTransactionsTable);
    const totalTransactions = Number(txCountRes?.val ?? 0);

    return NextResponse.json({
      configured: !!(process.env.PLUGGY_CLIENT_ID && process.env.PLUGGY_CLIENT_SECRET),
      items,
      totalTransactions,
      recentTransactions,
      futureTransactions,
      pendingTransactions,
    });
  }

  return NextResponse.json({ error: 'Endpoint não encontrado' }, { status: 404 });
}

async function handlePost(subPath: string[], req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const pathStr = subPath.join('/');

  // onSuccess do widget -> salva item e sincroniza imediatamente
  if (pathStr === 'pluggy/item') {
    const { itemId, connectorName, connectorId } = body;
    if (!itemId) {
      return NextResponse.json({ error: 'itemId é obrigatório' }, { status: 400 });
    }

    try {
      const result = await sincronizarPluggyItem(itemId);

      // Upsert do item com saldo e nome reais
      const totalBalanceStr = String(result.totalBalance || 0);
      // Nome do banco: pega da primeira conta não-credit ou o nome do conector
      const realBankName =
        result.accounts.find((a) => a.account_type !== 'CREDIT')?.account_name ||
        connectorName ||
        result.connectorName;

      await db
        .insert(pluggyItemsTable)
        .values({
          id: itemId,
          connector_id: connectorId || null,
          connector_name: realBankName,
          status: 'UPDATED',
          balance: totalBalanceStr,
          last_sync_at: new Date(),
        })
        .onConflictDoUpdate({
          target: pluggyItemsTable.id,
          set: {
            connector_name: realBankName,
            balance: totalBalanceStr,
            last_sync_at: new Date(),
            status: 'UPDATED',
          },
        });

      // Upsert das transações com dedup por pluggy_transaction_id
      let importadas = 0;
      for (const tx of result.transactions) {
        const existing = await db
          .select({ id: pluggyTransactionsTable.id })
          .from(pluggyTransactionsTable)
          .where(eq(pluggyTransactionsTable.id, tx.pluggy_transaction_id))
          .limit(1);

        if (existing.length === 0) {
          await db.insert(pluggyTransactionsTable).values({
            id: tx.pluggy_transaction_id,
            item_id: itemId,
            account_id: tx.account_id,
            account_name: tx.account_name,
            account_type: tx.account_type,
            description: tx.description,
            amount: String(tx.amount),
            date: new Date(tx.date),
            type: tx.type,
            category: tx.category,
            status: 'pending',
          }).onConflictDoNothing();
          importadas++;
        }
      }

      return NextResponse.json({
        ok: true,
        itemId,
        connectorName: realBankName,
        totalBalance: result.totalBalance,
        accounts: result.accounts,
        contasCount: result.contasCount,
        transacoesImportadas: importadas,
      });
    } catch (err: any) {
      console.error('Erro ao sincronizar item:', err);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  // Sincronização manual (botão "Sincronizar Bancos")
  if (pathStr === 'pluggy/sync') {
    const items = await db.select().from(pluggyItemsTable);
    let totalImportadas = 0;

    for (const item of items) {
      try {
        const result = await sincronizarPluggyItem(item.id);

        for (const tx of result.transactions) {
          await db
            .insert(pluggyTransactionsTable)
            .values({
              id: tx.pluggy_transaction_id,
              item_id: item.id,
              account_id: tx.account_id,
              account_name: tx.account_name,
              account_type: tx.account_type,
              description: tx.description,
              amount: String(tx.amount),
              date: new Date(tx.date),
              type: tx.type,
              category: tx.category,
              status: 'pending',
            })
            .onConflictDoNothing();
          totalImportadas++;
        }

        await db
          .update(pluggyItemsTable)
          .set({ last_sync_at: new Date(), status: 'UPDATED' })
          .where(eq(pluggyItemsTable.id, item.id));
      } catch (err) {
        console.error(`Erro sync item ${item.id}:`, err);
        await db
          .update(pluggyItemsTable)
          .set({ status: 'ERROR' })
          .where(eq(pluggyItemsTable.id, item.id));
      }
    }

    const updatedItems = await db.select().from(pluggyItemsTable);
    const now = new Date();
    const recentTransactions = await db
      .select()
      .from(pluggyTransactionsTable)
      .where(lte(pluggyTransactionsTable.date, now))
      .orderBy(desc(pluggyTransactionsTable.date))
      .limit(100);
    const futureTransactions = await db
      .select()
      .from(pluggyTransactionsTable)
      .where(gt(pluggyTransactionsTable.date, now))
      .orderBy(asc(pluggyTransactionsTable.date))
      .limit(50);
    const pendingTransactions = await db
      .select()
      .from(pluggyTransactionsTable)
      .where(and(eq(pluggyTransactionsTable.status, 'pending'), lte(pluggyTransactionsTable.date, now)))
      .orderBy(desc(pluggyTransactionsTable.date))
      .limit(50);

    return NextResponse.json({
      ok: true,
      totalImportadas,
      items: updatedItems,
      recentTransactions,
      futureTransactions,
      pendingTransactions,
    });
  }

  // Marcar transação como vinculada a uma despesa
  if (pathStr === 'pluggy/link-expense') {
    const { transactionId, expenseId, mesRef } = body;
    if (!transactionId || !expenseId || !mesRef) {
      return NextResponse.json({ error: 'transactionId, expenseId e mesRef são obrigatórios' }, { status: 400 });
    }

    // Busca a transação
    const [tx] = await db
      .select()
      .from(pluggyTransactionsTable)
      .where(eq(pluggyTransactionsTable.id, transactionId))
      .limit(1);

    if (!tx) return NextResponse.json({ error: 'Transação não encontrada' }, { status: 404 });

    // Dá baixa na despesa (upsert no monthState)
    await db
      .insert(monthStateTable)
      .values({
        expense_id: expenseId,
        mes_ref: mesRef,
        valor_real: tx.amount,
        pago: true,
        pago_em: tx.date,
      })
      .onConflictDoUpdate({
        target: [monthStateTable.expense_id, monthStateTable.mes_ref],
        set: {
          valor_real: tx.amount,
          pago: true,
          pago_em: tx.date,
        },
      });

    // Marca a transação como vinculada
    await db
      .update(pluggyTransactionsTable)
      .set({ status: 'linked', expense_id: expenseId })
      .where(eq(pluggyTransactionsTable.id, transactionId));

    return NextResponse.json({ ok: true });
  }

  // Ignorar transação (ex: transferência entre contas próprias)
  if (pathStr === 'pluggy/ignore') {
    const { transactionId } = body;
    if (!transactionId) return NextResponse.json({ error: 'transactionId obrigatório' }, { status: 400 });
    await db
      .update(pluggyTransactionsTable)
      .set({ status: 'ignored' })
      .where(eq(pluggyTransactionsTable.id, transactionId));
    return NextResponse.json({ ok: true });
  }

  // Classificação Inteligente com Jev (TypeSafe AI)
  if (pathStr === 'pluggy/ai-classify') {
    const { transactionId, classifyAll, limit = 15 } = body;

    try {
      if (transactionId) {
        const [tx] = await db
          .select()
          .from(pluggyTransactionsTable)
          .where(eq(pluggyTransactionsTable.id, transactionId))
          .limit(1);

        if (!tx) {
          return NextResponse.json({ error: 'Transação não encontrada' }, { status: 404 });
        }

        const resultado = await classificarTransacaoComJev({
          descricao: tx.description,
          valor: tx.amount,
          tipo: tx.type,
          contaNome: tx.account_name || undefined,
          categoriaAtual: tx.category,
        });

        const newStatus = resultado.ehTransferencia
          ? 'transfer'
          : resultado.sugestaoAcao === 'aprovar_automatico'
          ? 'linked'
          : tx.status;

        await db
          .update(pluggyTransactionsTable)
          .set({
            category: resultado.categoria,
            status: newStatus,
          })
          .where(eq(pluggyTransactionsTable.id, transactionId));

        return NextResponse.json({ ok: true, resultado });
      }

      if (classifyAll) {
        const pendentes = await db
          .select()
          .from(pluggyTransactionsTable)
          .where(eq(pluggyTransactionsTable.status, 'pending'))
          .orderBy(desc(pluggyTransactionsTable.date))
          .limit(Math.min(limit, 30));

        if (pendentes.length === 0) {
          return NextResponse.json({ ok: true, processadas: 0, mensagem: 'Nenhuma transação pendente' });
        }

        const resultadosLote = await classificarLoteTransacoesComJev(pendentes);

        let atualizadas = 0;
        let autoAprovadas = 0;
        let transferencias = 0;

        for (const item of resultadosLote) {
          if (!item.resultado) continue;
          const { resultado, id } = item;

          let newStatus = 'pending';
          if (resultado.ehTransferencia) {
            newStatus = 'transfer';
            transferencias++;
          } else if (resultado.sugestaoAcao === 'aprovar_automatico') {
            newStatus = 'linked';
            autoAprovadas++;
          }

          await db
            .update(pluggyTransactionsTable)
            .set({
              category: resultado.categoria,
              status: newStatus,
            })
            .where(eq(pluggyTransactionsTable.id, id));

          atualizadas++;
        }

        return NextResponse.json({
          ok: true,
          processadas: atualizadas,
          autoAprovadas,
          transferencias,
          resultados: resultadosLote,
        });
      }

      return NextResponse.json({ error: 'Parâmetro inválido' }, { status: 400 });
    } catch (err: any) {
      console.error('Erro na classificação Jev:', err);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  // Aprovar transação e vincular categoria
  if (pathStr === 'pluggy/approve') {
    const { transactionId, category } = body;
    if (!transactionId) {
      return NextResponse.json({ error: 'transactionId obrigatório' }, { status: 400 });
    }

    await db
      .update(pluggyTransactionsTable)
      .set({
        status: 'linked',
        ...(category ? { category } : {}),
      })
      .where(eq(pluggyTransactionsTable.id, transactionId));

    return NextResponse.json({ ok: true });
  }

  // Buscar correspondência com despesas cadastradas via IA Jev
  if (pathStr === 'pluggy/match-expense') {
    const { transactionId } = body;
    if (!transactionId) {
      return NextResponse.json({ error: 'transactionId obrigatório' }, { status: 400 });
    }

    const [tx] = await db
      .select()
      .from(pluggyTransactionsTable)
      .where(eq(pluggyTransactionsTable.id, transactionId))
      .limit(1);

    if (!tx) {
      return NextResponse.json({ error: 'Transação não encontrada' }, { status: 404 });
    }

    const despesas = await db
      .select({
        id: expensesTable.id,
        nome: expensesTable.nome,
        valor_base: expensesTable.valor_base,
        categoria: expensesTable.categoria,
      })
      .from(expensesTable)
      .where(eq(expensesTable.ativo, true));

    const match = await encontrarMatchDespesaComJev({
      descricao: tx.description,
      valor: tx.amount,
      despesas,
    });

    return NextResponse.json({ ok: true, match });
  }

  // Conciliar transação do extrato com uma despesa e dar baixa no mês
  if (pathStr === 'pluggy/reconcile') {
    const { transactionId, expenseId, mesRef } = body;
    if (!transactionId || !expenseId) {
      return NextResponse.json({ error: 'transactionId e expenseId são obrigatórios' }, { status: 400 });
    }

    const [tx] = await db
      .select()
      .from(pluggyTransactionsTable)
      .where(eq(pluggyTransactionsTable.id, transactionId))
      .limit(1);

    if (!tx) {
      return NextResponse.json({ error: 'Transação não encontrada' }, { status: 404 });
    }

    // Calcula o mes_ref (YYYY-MM) se não enviado
    const mes = mesRef || new Date(tx.date).toISOString().slice(0, 7);

    // Marca a despesa como paga em monthStateTable
    const existing = await db
      .select()
      .from(monthStateTable)
      .where(and(eq(monthStateTable.expense_id, expenseId), eq(monthStateTable.mes_ref, mes)));

    if (existing.length > 0) {
      await db
        .update(monthStateTable)
        .set({
          pago: true,
          valor_real: String(tx.amount),
          pago_em: new Date(tx.date),
        })
        .where(eq(monthStateTable.id, existing[0].id));
    } else {
      await db.insert(monthStateTable).values({
        expense_id: expenseId,
        mes_ref: mes,
        pago: true,
        valor_real: String(tx.amount),
        pago_em: new Date(tx.date),
      });
    }

    // Vincula a transação no extrato
    await db
      .update(pluggyTransactionsTable)
      .set({
        status: 'linked',
        expense_id: expenseId,
      })
      .where(eq(pluggyTransactionsTable.id, transactionId));

    return NextResponse.json({ ok: true, message: 'Despesa baixada e conciliada com sucesso' });
  }

  if (pathStr === 'reset-seed' || pathStr === 'reset') {
    await Promise.all([
      db.delete(cardsTable),
      db.delete(expensesTable),
      db.delete(revenuesTable),
      db.delete(monthStateTable),
      db.delete(revenueStateTable),
      db.delete(expenseLogTable),
    ]);
    await db.insert(cardsTable).values(SEED_CARDS);
    await db.insert(expensesTable).values(SEED_EXPENSES);
    await db.insert(revenuesTable).values(SEED_REVENUES);
    await db.insert(monthStateTable).values(SEED_MONTH_STATE);

    const [cards, expenses, revenues, monthState] = await Promise.all([
      db.select().from(cardsTable),
      db.select().from(expensesTable),
      db.select().from(revenuesTable),
      db.select().from(monthStateTable),
    ]);
    return NextResponse.json({ cards, expenses, revenues, monthState, revenueState: [], expenseLog: [] });
  }

  if (pathStr === 'cards') {
    const id = uid('card');
    const [card] = await db
      .insert(cardsTable)
      .values({
        id,
        nome: body.nome,
        dia_vencimento: body.dia_vencimento,
        cor: body.cor,
      })
      .returning();
    return NextResponse.json(card);
  }

  if (pathStr === 'expenses') {
    const id = uid('exp');
    const [expense] = await db
      .insert(expensesTable)
      .values({
        id,
        nome: body.nome,
        valor_base: String(body.valor_base),
        categoria: body.categoria,
        recorrencia: body.recorrencia,
        parcelas: body.parcelas ?? null,
        estimado: body.estimado ?? false,
        dia_vencimento: body.dia_vencimento ?? null,
        cartao_id: body.cartao_id ?? null,
        mes_origem: body.mes_origem,
        ativo: true,
      })
      .returning();
    return NextResponse.json(expense);
  }

  if (pathStr === 'revenues') {
    const id = uid('rev');
    const [revenue] = await db
      .insert(revenuesTable)
      .values({
        id,
        nome: body.nome,
        valor_base: String(body.valor_base),
        categoria: body.categoria,
        recorrencia: body.recorrencia,
        mes_origem: body.mes_origem,
        ativo: true,
      })
      .returning();
    return NextResponse.json(revenue);
  }

  // Flat route: POST /month-state with { expense_id, mes_ref, pago?, valor_real? }
  if (pathStr === 'month-state') {
    const { expense_id, mes_ref, valor_real, pago } = body;
    const existing = await db
      .select()
      .from(monthStateTable)
      .where(and(eq(monthStateTable.expense_id, expense_id), eq(monthStateTable.mes_ref, mes_ref)));

    if (existing.length > 0) {
      const [updated] = await db
        .update(monthStateTable)
        .set({
          valor_real: valor_real !== undefined ? (valor_real !== null ? String(valor_real) : null) : existing[0].valor_real,
          pago: pago !== undefined ? pago : existing[0].pago,
          pago_em: pago ? new Date() : existing[0].pago_em,
        })
        .where(eq(monthStateTable.id, existing[0].id))
        .returning();
      return NextResponse.json(updated);
    }

    const [created] = await db
      .insert(monthStateTable)
      .values({
        expense_id,
        mes_ref,
        valor_real: valor_real !== undefined && valor_real !== null ? String(valor_real) : null,
        pago: pago ?? false,
        pago_em: pago ? new Date() : null,
      })
      .returning();
    return NextResponse.json(created);
  }

  // Flat route: POST /revenue-state with { revenue_id, mes_ref, recebido?, valor_real? }
  if (pathStr === 'revenue-state') {
    const { revenue_id, mes_ref, valor_real, recebido } = body;
    const existing = await db
      .select()
      .from(revenueStateTable)
      .where(and(eq(revenueStateTable.revenue_id, revenue_id), eq(revenueStateTable.mes_ref, mes_ref)));

    if (existing.length > 0) {
      const [updated] = await db
        .update(revenueStateTable)
        .set({
          valor_real: valor_real !== undefined ? (valor_real !== null ? String(valor_real) : null) : existing[0].valor_real,
          recebido: recebido !== undefined ? recebido : existing[0].recebido,
          recebido_em: recebido ? new Date() : existing[0].recebido_em,
        })
        .where(eq(revenueStateTable.id, existing[0].id))
        .returning();
      return NextResponse.json(updated);
    }

    const [created] = await db
      .insert(revenueStateTable)
      .values({
        revenue_id,
        mes_ref,
        valor_real: valor_real !== undefined && valor_real !== null ? String(valor_real) : null,
        recebido: recebido ?? false,
        recebido_em: recebido ? new Date() : null,
      })
      .returning();
    return NextResponse.json(created);
  }

  // Flat route: POST /expense-log with { expense_id, mes_ref, valor, descricao? }
  if (pathStr === 'expense-log') {
    const id = uid('log');
    const [entry] = await db
      .insert(expenseLogTable)
      .values({
        id,
        expense_id: body.expense_id,
        mes_ref: body.mes_ref,
        valor: String(body.valor),
        descricao: body.descricao ?? null,
      })
      .returning();
    return NextResponse.json(entry);
  }

  return NextResponse.json({ error: 'Endpoint não encontrado' }, { status: 404 });
}


async function handlePut(subPath: string[], req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const pathStr = subPath.join('/');

  // Flat route: PUT /month-state with { expense_id, mes_ref, pago?, valor_real? }
  if (pathStr === 'month-state') {
    const { expense_id, mes_ref, valor_real, pago } = body;
    const existing = await db
      .select()
      .from(monthStateTable)
      .where(and(eq(monthStateTable.expense_id, expense_id), eq(monthStateTable.mes_ref, mes_ref)));

    if (existing.length > 0) {
      const [updated] = await db
        .update(monthStateTable)
        .set({
          valor_real: valor_real !== undefined ? (valor_real !== null ? String(valor_real) : null) : existing[0].valor_real,
          pago: pago !== undefined ? pago : existing[0].pago,
          pago_em: pago ? new Date() : existing[0].pago_em,
        })
        .where(eq(monthStateTable.id, existing[0].id))
        .returning();
      return NextResponse.json(updated);
    }

    const [created] = await db
      .insert(monthStateTable)
      .values({
        expense_id,
        mes_ref,
        valor_real: valor_real !== undefined && valor_real !== null ? String(valor_real) : null,
        pago: pago ?? false,
        pago_em: pago ? new Date() : null,
      })
      .returning();
    return NextResponse.json(created);
  }

  // Flat route: PUT /revenue-state with { revenue_id, mes_ref, recebido?, valor_real? }
  if (pathStr === 'revenue-state') {
    const { revenue_id, mes_ref, valor_real, recebido } = body;
    const existing = await db
      .select()
      .from(revenueStateTable)
      .where(and(eq(revenueStateTable.revenue_id, revenue_id), eq(revenueStateTable.mes_ref, mes_ref)));

    if (existing.length > 0) {
      const [updated] = await db
        .update(revenueStateTable)
        .set({
          valor_real: valor_real !== undefined ? (valor_real !== null ? String(valor_real) : null) : existing[0].valor_real,
          recebido: recebido !== undefined ? recebido : existing[0].recebido,
          recebido_em: recebido ? new Date() : existing[0].recebido_em,
        })
        .where(eq(revenueStateTable.id, existing[0].id))
        .returning();
      return NextResponse.json(updated);
    }

    const [created] = await db
      .insert(revenueStateTable)
      .values({
        revenue_id,
        mes_ref,
        valor_real: valor_real !== undefined && valor_real !== null ? String(valor_real) : null,
        recebido: recebido ?? false,
        recebido_em: recebido ? new Date() : null,
      })
      .returning();
    return NextResponse.json(created);
  }

  if (subPath[0] === 'cards' && subPath[1]) {
    const [card] = await db
      .update(cardsTable)
      .set({
        nome: body.nome,
        dia_vencimento: body.dia_vencimento,
        cor: body.cor,
      })
      .where(eq(cardsTable.id, subPath[1]))
      .returning();
    return NextResponse.json(card);
  }

  if (subPath[0] === 'expenses' && subPath[1]) {
    const [expense] = await db
      .update(expensesTable)
      .set({
        nome: body.nome,
        valor_base: String(body.valor_base),
        categoria: body.categoria,
        recorrencia: body.recorrencia,
        parcelas: body.parcelas ?? null,
        estimado: body.estimado ?? false,
        dia_vencimento: body.dia_vencimento ?? null,
        cartao_id: body.cartao_id ?? null,
        mes_origem: body.mes_origem,
      })
      .where(eq(expensesTable.id, subPath[1]))
      .returning();
    return NextResponse.json(expense);
  }

  if (subPath[0] === 'revenues' && subPath[1]) {
    const [revenue] = await db
      .update(revenuesTable)
      .set({
        nome: body.nome,
        valor_base: String(body.valor_base),
        categoria: body.categoria,
        recorrencia: body.recorrencia,
        mes_origem: body.mes_origem,
      })
      .where(eq(revenuesTable.id, subPath[1]))
      .returning();
    return NextResponse.json(revenue);
  }

  return NextResponse.json({ error: 'Endpoint não encontrado' }, { status: 404 });
}


async function handleDelete(subPath: string[]) {
  if (subPath[0] === 'cards' && subPath[1]) {
    await db.delete(cardsTable).where(eq(cardsTable.id, subPath[1]));
    return NextResponse.json({ ok: true });
  }

  // Flat route: DELETE /expense-log/{logId}
  if (subPath[0] === 'expense-log' && subPath[1]) {
    await db.delete(expenseLogTable).where(eq(expenseLogTable.id, subPath[1]));
    return NextResponse.json({ ok: true });
  }

  if (subPath[0] === 'expenses' && subPath[1] && subPath[2] === 'log' && subPath[3]) {
    await db.delete(expenseLogTable).where(eq(expenseLogTable.id, subPath[3]));
    return NextResponse.json({ ok: true });
  }

  if (subPath[0] === 'expenses' && subPath[1]) {
    await db.update(expensesTable).set({ ativo: false }).where(eq(expensesTable.id, subPath[1]));
    return NextResponse.json({ ok: true });
  }

  if (subPath[0] === 'revenues' && subPath[1]) {
    await db.update(revenuesTable).set({ ativo: false }).where(eq(revenuesTable.id, subPath[1]));
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Endpoint não encontrado' }, { status: 404 });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return handleGet(path);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return handlePost(path, req);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return handlePut(path, req);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return handleDelete(path);
}
