import { Router } from 'express'
import { eq, and } from 'drizzle-orm'
import { db } from '@workspace/db'
import {
  cardsTable,
  expensesTable,
  revenuesTable,
  monthStateTable,
  revenueStateTable,
  expenseLogTable,
} from '@workspace/db'

const router = Router()

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/** Seed data inserted on first init */
const SEED_CARDS = [
  { id: 'card-nubank', nome: 'Nubank', dia_vencimento: 5, cor: '#8B5CF6' },
  { id: 'card-neon', nome: 'Neon', dia_vencimento: 5, cor: '#22D3EE' },
  { id: 'card-sicredi', nome: 'Sicredi Empresa', dia_vencimento: 13, cor: '#4ADE80' },
]

const SEED_EXPENSES = [
  { id: 'exp-agua', nome: 'Água', valor_base: '150', categoria: 'casa', recorrencia: 'recorrente', parcelas: null, estimado: false, dia_vencimento: 20, cartao_id: null, mes_origem: '2026-01', ativo: true },
  { id: 'exp-alternador', nome: 'Alternador', valor_base: '230', categoria: 'veiculo', recorrencia: 'parcelada', parcelas: 3, estimado: false, dia_vencimento: null, cartao_id: 'card-neon', mes_origem: '2026-06', ativo: true },
  { id: 'exp-anthropic', nome: 'Anthropic', valor_base: '110', categoria: 'assinatura', recorrencia: 'recorrente', parcelas: null, estimado: false, dia_vencimento: null, cartao_id: 'card-nubank', mes_origem: '2026-01', ativo: true },
  { id: 'exp-gemini', nome: 'API Gemini Axis', valor_base: '50', categoria: 'assinatura', recorrencia: 'recorrente', parcelas: null, estimado: false, dia_vencimento: null, cartao_id: 'card-nubank', mes_origem: '2026-01', ativo: true },
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
]

const SEED_REVENUES = [
  { id: 'rev-comissao', nome: 'Comissão', valor_base: '18750', categoria: 'comissao', recorrencia: 'avulsa', mes_origem: '2026-11', ativo: true },
  { id: 'rev-fixo', nome: 'Fixo Mensal', valor_base: '6000', categoria: 'fixo', recorrencia: 'recorrente', mes_origem: '2026-07', ativo: true },
  { id: 'rev-salario', nome: 'Salário', valor_base: '2000', categoria: 'fixo', recorrencia: 'recorrente', mes_origem: '2026-07', ativo: true },
]

const SEED_MONTH_STATE = SEED_EXPENSES.map((e) => ({
  expense_id: e.id,
  mes_ref: '2026-07',
  valor_real: null as string | null,
  pago: true,
  pago_em: new Date('2026-07-06T09:00:00Z'),
}))

// ─── GET /api/finance/data — load everything (seed on first call) ──────────

router.get('/data', async (_req, res) => {
  try {
    const [cards, expenses, revenues, monthState, revenueState, expenseLog] =
      await Promise.all([
        db.select().from(cardsTable),
        db.select().from(expensesTable),
        db.select().from(revenuesTable),
        db.select().from(monthStateTable),
        db.select().from(revenueStateTable),
        db.select().from(expenseLogTable),
      ])

    // Seed on first load
    if (cards.length === 0 && expenses.length === 0) {
      await db.insert(cardsTable).values(SEED_CARDS)
      await db.insert(expensesTable).values(SEED_EXPENSES)
      await db.insert(revenuesTable).values(SEED_REVENUES)
      await db.insert(monthStateTable).values(SEED_MONTH_STATE)

      const [seededCards, seededExpenses, seededRevenues, seededMonthState] =
        await Promise.all([
          db.select().from(cardsTable),
          db.select().from(expensesTable),
          db.select().from(revenuesTable),
          db.select().from(monthStateTable),
        ])
      return res.json({
        cards: seededCards,
        expenses: seededExpenses,
        revenues: seededRevenues,
        monthState: seededMonthState,
        revenueState: [],
        expenseLog: [],
      })
    }

    res.json({ cards, expenses, revenues, monthState, revenueState, expenseLog })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// ─── POST /api/finance/reset — wipe and re-seed ───────────────────────────

router.post('/reset', async (_req, res) => {
  try {
    await db.delete(expenseLogTable)
    await db.delete(monthStateTable)
    await db.delete(revenueStateTable)
    await db.delete(expensesTable)
    await db.delete(revenuesTable)
    await db.delete(cardsTable)

    await db.insert(cardsTable).values(SEED_CARDS)
    await db.insert(expensesTable).values(SEED_EXPENSES)
    await db.insert(revenuesTable).values(SEED_REVENUES)
    await db.insert(monthStateTable).values(SEED_MONTH_STATE)

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// ─── Cards CRUD ───────────────────────────────────────────────────────────────

router.post('/cards', async (req, res) => {
  try {
    const { nome, dia_vencimento, cor } = req.body as {
      nome: string; dia_vencimento: number; cor: string
    }
    const id = uid('card')
    const [row] = await db.insert(cardsTable).values({ id, nome, dia_vencimento, cor }).returning()
    res.json(row)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

router.put('/cards/:id', async (req, res) => {
  try {
    const { nome, dia_vencimento, cor } = req.body as {
      nome: string; dia_vencimento: number; cor: string
    }
    const [row] = await db
      .update(cardsTable)
      .set({ nome, dia_vencimento, cor })
      .where(eq(cardsTable.id, req.params.id))
      .returning()
    res.json(row)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

router.delete('/cards/:id', async (req, res) => {
  try {
    // Unlink expenses
    await db
      .update(expensesTable)
      .set({ cartao_id: null })
      .where(eq(expensesTable.cartao_id, req.params.id))
    await db.delete(cardsTable).where(eq(cardsTable.id, req.params.id))
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// ─── Expenses CRUD ────────────────────────────────────────────────────────────

router.post('/expenses', async (req, res) => {
  try {
    const body = req.body as {
      nome: string; valor_base: string; categoria: string; recorrencia: string
      parcelas?: number | null; estimado: boolean; dia_vencimento?: number | null
      cartao_id?: string | null; mes_origem: string
    }
    const id = uid('exp')
    const [row] = await db.insert(expensesTable).values({ id, ativo: true, ...body }).returning()
    res.json(row)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

router.put('/expenses/:id', async (req, res) => {
  try {
    const body = req.body as {
      nome: string; valor_base: string; categoria: string; recorrencia: string
      parcelas?: number | null; estimado: boolean; dia_vencimento?: number | null
      cartao_id?: string | null; mes_origem: string
    }
    const [row] = await db
      .update(expensesTable)
      .set(body)
      .where(eq(expensesTable.id, req.params.id))
      .returning()
    res.json(row)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

router.delete('/expenses/:id', async (req, res) => {
  try {
    const id = req.params.id
    await db.delete(expenseLogTable).where(eq(expenseLogTable.expense_id, id))
    await db.delete(monthStateTable).where(eq(monthStateTable.expense_id, id))
    await db.delete(expensesTable).where(eq(expensesTable.id, id))
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// ─── Revenues CRUD ────────────────────────────────────────────────────────────

router.post('/revenues', async (req, res) => {
  try {
    const body = req.body as {
      nome: string; valor_base: string; categoria: string
      recorrencia: string; mes_origem: string
    }
    const id = uid('rev')
    const [row] = await db.insert(revenuesTable).values({ id, ativo: true, ...body }).returning()
    res.json(row)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

router.put('/revenues/:id', async (req, res) => {
  try {
    const body = req.body as {
      nome: string; valor_base: string; categoria: string
      recorrencia: string; mes_origem: string
    }
    const [row] = await db
      .update(revenuesTable)
      .set(body)
      .where(eq(revenuesTable.id, req.params.id))
      .returning()
    res.json(row)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

router.delete('/revenues/:id', async (req, res) => {
  try {
    const id = req.params.id
    await db.delete(revenueStateTable).where(eq(revenueStateTable.revenue_id, id))
    await db.delete(revenuesTable).where(eq(revenuesTable.id, id))
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// ─── Month state (expense paid/value) ─────────────────────────────────────────

router.put('/month-state', async (req, res) => {
  try {
    const { expense_id, mes_ref, pago, pago_em, valor_real } = req.body as {
      expense_id: string; mes_ref: string
      pago?: boolean; pago_em?: string | null; valor_real?: string | null
    }

    const existing = await db
      .select()
      .from(monthStateTable)
      .where(and(eq(monthStateTable.expense_id, expense_id), eq(monthStateTable.mes_ref, mes_ref)))
      .limit(1)

    let row
    if (existing.length > 0) {
      const updates: Record<string, unknown> = {}
      if (pago !== undefined) updates.pago = pago
      if (pago_em !== undefined) updates.pago_em = pago_em ? new Date(pago_em) : null
      if (valor_real !== undefined) updates.valor_real = valor_real
      ;[row] = await db
        .update(monthStateTable)
        .set(updates)
        .where(and(eq(monthStateTable.expense_id, expense_id), eq(monthStateTable.mes_ref, mes_ref)))
        .returning()
    } else {
      ;[row] = await db
        .insert(monthStateTable)
        .values({
          expense_id, mes_ref,
          pago: pago ?? false,
          pago_em: pago_em ? new Date(pago_em) : null,
          valor_real: valor_real ?? null,
        })
        .returning()
    }
    res.json(row)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// ─── Revenue state (received/value) ──────────────────────────────────────────

router.put('/revenue-state', async (req, res) => {
  try {
    const { revenue_id, mes_ref, recebido, recebido_em, valor_real } = req.body as {
      revenue_id: string; mes_ref: string
      recebido?: boolean; recebido_em?: string | null; valor_real?: string | null
    }

    const existing = await db
      .select()
      .from(revenueStateTable)
      .where(and(eq(revenueStateTable.revenue_id, revenue_id), eq(revenueStateTable.mes_ref, mes_ref)))
      .limit(1)

    let row
    if (existing.length > 0) {
      const updates: Record<string, unknown> = {}
      if (recebido !== undefined) updates.recebido = recebido
      if (recebido_em !== undefined) updates.recebido_em = recebido_em ? new Date(recebido_em) : null
      if (valor_real !== undefined) updates.valor_real = valor_real
      ;[row] = await db
        .update(revenueStateTable)
        .set(updates)
        .where(and(eq(revenueStateTable.revenue_id, revenue_id), eq(revenueStateTable.mes_ref, mes_ref)))
        .returning()
    } else {
      ;[row] = await db
        .insert(revenueStateTable)
        .values({
          revenue_id, mes_ref,
          recebido: recebido ?? false,
          recebido_em: recebido_em ? new Date(recebido_em) : null,
          valor_real: valor_real ?? null,
        })
        .returning()
    }
    res.json(row)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// ─── Expense log ──────────────────────────────────────────────────────────────

router.post('/expense-log', async (req, res) => {
  try {
    const { expense_id, mes_ref, valor, descricao } = req.body as {
      expense_id: string; mes_ref: string; valor: string; descricao?: string
    }
    const id = uid('log')
    const [row] = await db
      .insert(expenseLogTable)
      .values({ id, expense_id, mes_ref, valor, descricao: descricao || null })
      .returning()
    res.json(row)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

router.delete('/expense-log/:id', async (req, res) => {
  try {
    await db.delete(expenseLogTable).where(eq(expenseLogTable.id, req.params.id))
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

export default router
