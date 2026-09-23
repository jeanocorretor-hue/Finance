import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  monthExpenseView,
  monthRevenueView,
  summarize,
  trendSeries,
  type FinanceDataset,
  type MonthSummary,
} from './finance-logic'
import { addMonths } from './format'
import type {
  Card,
  Expense,
  ExpenseLogEntry,
  MonthExpenseRow,
  MonthRevenueRow,
  MonthState,
  Revenue,
  RevenueMonthState,
  TrendPoint,
} from './finance-types'

export type ExpenseDraft = Omit<Expense, 'id' | 'ativo'>
export type RevenueDraft = Omit<Revenue, 'id' | 'ativo'>
export type CardDraft = Omit<Card, 'id'>

// ─── API helpers ──────────────────────────────────────────────────────────────

const API = '/api/finance'

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`)
  return res.json() as Promise<T>
}

/** Drizzle returns numeric columns as strings; normalize to number */
function toNum(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function normalizeExpense(e: Record<string, unknown>): Expense {
  return {
    id: e.id as string,
    nome: e.nome as string,
    valor_base: Number(e.valor_base),
    categoria: e.categoria as Expense['categoria'],
    recorrencia: e.recorrencia as Expense['recorrencia'],
    parcelas: e.parcelas != null ? Number(e.parcelas) : undefined,
    estimado: Boolean(e.estimado),
    dia_vencimento: e.dia_vencimento != null ? Number(e.dia_vencimento) : null,
    cartao_id: (e.cartao_id as string | null) ?? null,
    mes_origem: e.mes_origem as string,
    ativo: Boolean(e.ativo),
  }
}

function normalizeRevenue(r: Record<string, unknown>): Revenue {
  return {
    id: r.id as string,
    nome: r.nome as string,
    valor_base: Number(r.valor_base),
    categoria: r.categoria as Revenue['categoria'],
    recorrencia: r.recorrencia as Revenue['recorrencia'],
    mes_origem: r.mes_origem as string,
    ativo: Boolean(r.ativo),
  }
}

function normalizeCard(c: Record<string, unknown>): Card {
  return {
    id: c.id as string,
    nome: c.nome as string,
    dia_vencimento: Number(c.dia_vencimento),
    cor: c.cor as string,
  }
}

function normalizeMonthState(s: Record<string, unknown>): MonthState {
  return {
    expense_id: s.expense_id as string,
    mes_ref: s.mes_ref as string,
    valor_real: toNum(s.valor_real as string | null),
    pago: Boolean(s.pago),
    pago_em: (s.pago_em as string | null) ?? null,
  }
}

function normalizeRevenueState(s: Record<string, unknown>): RevenueMonthState {
  return {
    revenue_id: s.revenue_id as string,
    mes_ref: s.mes_ref as string,
    valor_real: toNum(s.valor_real as string | null),
    recebido: Boolean(s.recebido),
    recebido_em: (s.recebido_em as string | null) ?? null,
  }
}

function normalizeLogEntry(l: Record<string, unknown>): ExpenseLogEntry {
  return {
    id: l.id as string,
    expense_id: l.expense_id as string,
    mes_ref: l.mes_ref as string,
    valor: Number(l.valor),
    descricao: (l.descricao as string | undefined) ?? undefined,
    data_registro: l.data_registro as string,
  }
}

// Saved month preference in localStorage only (not sensitive data)
const LS_MONTH = 'finance:month'

function readMonthFromStorage(): string {
  if (typeof window === 'undefined') return '2026-07'
  try {
    const raw = localStorage.getItem(LS_MONTH)
    if (!raw) return '2026-07'
    const parsed = JSON.parse(raw)
    if (typeof parsed === 'string' && /^\d{4}-\d{2}$/.test(parsed)) return parsed
    return '2026-07'
  } catch {
    const raw = localStorage.getItem(LS_MONTH) ?? ''
    return /^\d{4}-\d{2}$/.test(raw) ? raw : '2026-07'
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface FinanceContextValue {
  loading: boolean
  month: string
  setMonth: (m: string) => void
  goToMonth: (delta: number) => void
  cards: Card[]
  expensesRaw: Expense[]
  revenuesRaw: Revenue[]
  expenses: MonthExpenseRow[]
  revenues: MonthRevenueRow[]
  summary: MonthSummary
  trend: TrendPoint[]
  logsFor: (expenseId: string) => ExpenseLogEntry[]
  toggleExpensePaid: (expenseId: string) => void
  toggleRevenueReceived: (revenueId: string) => void
  addLogEntry: (expenseId: string, valor: number, descricao?: string) => void
  removeLogEntry: (logId: string) => void
  setExpenseMonthValue: (expenseId: string, valor: number | null) => void
  setRevenueMonthValue: (revenueId: string, valor: number | null) => void
  addExpense: (draft: ExpenseDraft) => void
  updateExpense: (id: string, draft: ExpenseDraft) => void
  deleteExpense: (id: string) => void
  addRevenue: (draft: RevenueDraft) => void
  updateRevenue: (id: string, draft: RevenueDraft) => void
  deleteRevenue: (id: string) => void
  addCard: (draft: CardDraft) => void
  updateCard: (id: string, draft: CardDraft) => void
  deleteCard: (id: string) => void
  resetToSeed: () => void
  reload: () => Promise<void>
}

const FinanceContext = createContext<FinanceContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [month, setMonthRaw] = useState<string>(readMonthFromStorage)
  const [expensesRaw, setExpensesRaw] = useState<Expense[]>([])
  const [revenuesRaw, setRevenuesRaw] = useState<Revenue[]>([])
  const [cards, setCards] = useState<Card[]>([])
  const [monthState, setMonthState_] = useState<MonthState[]>([])
  const [revenueState, setRevenueState] = useState<RevenueMonthState[]>([])
  const [expenseLog, setExpenseLog] = useState<ExpenseLogEntry[]>([])

  // Persist chosen month to localStorage
  const setMonth = useCallback((m: string) => {
    setMonthRaw(m)
    if (typeof window !== 'undefined') {
      localStorage.setItem(LS_MONTH, m)
    }
  }, [])

  // ── Load all data from API ───────────────────────────────────────
  const reload = useCallback(async () => {
    try {
      const data = await apiFetch<Record<string, unknown[]>>('/data')
      setCards((data.cards as Record<string, unknown>[]).map(normalizeCard))
      setExpensesRaw((data.expenses as Record<string, unknown>[]).map(normalizeExpense))
      setRevenuesRaw((data.revenues as Record<string, unknown>[]).map(normalizeRevenue))
      setMonthState_((data.monthState as Record<string, unknown>[]).map(normalizeMonthState))
      setRevenueState((data.revenueState as Record<string, unknown>[]).map(normalizeRevenueState))
      setExpenseLog((data.expenseLog as Record<string, unknown>[]).map(normalizeLogEntry))
    } catch (err) {
      console.error('Erro ao recarregar dados do Finance:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  // ── Derived views ─────────────────────────────────────────────────────────
  const dataset: FinanceDataset = useMemo(
    () => ({ cards, expenses: expensesRaw, revenues: revenuesRaw, monthState, revenueState, expenseLog }),
    [cards, expensesRaw, revenuesRaw, monthState, revenueState, expenseLog],
  )

  const expenses = useMemo(() => monthExpenseView(dataset, month), [dataset, month])
  const revenues = useMemo(() => monthRevenueView(dataset, month), [dataset, month])
  const summary = useMemo(() => summarize(expenses, revenues), [expenses, revenues])
  const trend = useMemo(
    () => trendSeries(dataset, addMonths(month, -5), addMonths(month, 6)),
    [dataset, month],
  )

  const goToMonth = useCallback((delta: number) => {
    setMonth(addMonths(month, delta))
  }, [month, setMonth])

  const logsFor = useCallback(
    (expenseId: string) =>
      expenseLog
        .filter((l) => l.expense_id === expenseId && l.mes_ref === month)
        .sort((a, b) => b.data_registro.localeCompare(a.data_registro)),
    [expenseLog, month],
  )

  // ── Mutations — optimistic update + fire-and-forget API call ─────────────

  const toggleExpensePaid = useCallback(
    (expenseId: string) => {
      setMonthState_((prev) => {
        const existing = prev.find((s) => s.expense_id === expenseId && s.mes_ref === month)
        const newPago = existing ? !existing.pago : true
        const newPagoEm = newPago ? new Date().toISOString() : null

        apiFetch('/month-state', {
          method: 'PUT',
          body: JSON.stringify({ expense_id: expenseId, mes_ref: month, pago: newPago, pago_em: newPagoEm }),
        }).then((row) => {
          setMonthState_((s) => {
            const idx = s.findIndex((x) => x.expense_id === expenseId && x.mes_ref === month)
            const normalized = normalizeMonthState(row as Record<string, unknown>)
            if (idx >= 0) return s.map((x, i) => i === idx ? normalized : x)
            return [...s, normalized]
          })
        }).catch(console.error)

        if (existing) {
          return prev.map((s) => s === existing ? { ...s, pago: newPago, pago_em: newPagoEm } : s)
        }
        return [...prev, { expense_id: expenseId, mes_ref: month, valor_real: null, pago: true, pago_em: newPagoEm }]
      })
    },
    [month],
  )

  const toggleRevenueReceived = useCallback(
    (revenueId: string) => {
      setRevenueState((prev) => {
        const existing = prev.find((s) => s.revenue_id === revenueId && s.mes_ref === month)
        const newRecebido = existing ? !existing.recebido : true
        const newRecebidoEm = newRecebido ? new Date().toISOString() : null

        apiFetch('/revenue-state', {
          method: 'PUT',
          body: JSON.stringify({ revenue_id: revenueId, mes_ref: month, recebido: newRecebido, recebido_em: newRecebidoEm }),
        }).then((row) => {
          setRevenueState((s) => {
            const idx = s.findIndex((x) => x.revenue_id === revenueId && x.mes_ref === month)
            const normalized = normalizeRevenueState(row as Record<string, unknown>)
            if (idx >= 0) return s.map((x, i) => i === idx ? normalized : x)
            return [...s, normalized]
          })
        }).catch(console.error)

        if (existing) {
          return prev.map((s) => s === existing ? { ...s, recebido: newRecebido, recebido_em: newRecebidoEm } : s)
        }
        return [...prev, { revenue_id: revenueId, mes_ref: month, valor_real: null, recebido: true, recebido_em: newRecebidoEm }]
      })
    },
    [month],
  )

  const addLogEntry = useCallback(
    (expenseId: string, valor: number, descricao?: string) => {
      const tempId = `log-temp-${Date.now()}`
      const tempEntry: ExpenseLogEntry = {
        id: tempId, expense_id: expenseId, mes_ref: month,
        valor, descricao, data_registro: new Date().toISOString(),
      }
      setExpenseLog((prev) => [...prev, tempEntry])
      apiFetch<Record<string, unknown>>('/expense-log', {
        method: 'POST',
        body: JSON.stringify({ expense_id: expenseId, mes_ref: month, valor: String(valor), descricao }),
      }).then((row) => {
        setExpenseLog((prev) => prev.map((l) => l.id === tempId ? normalizeLogEntry(row) : l))
      }).catch(console.error)
    },
    [month],
  )

  const removeLogEntry = useCallback((logId: string) => {
    setExpenseLog((prev) => prev.filter((l) => l.id !== logId))
    apiFetch(`/expense-log/${logId}`, { method: 'DELETE' }).catch(console.error)
  }, [])

  const setExpenseMonthValue = useCallback(
    (expenseId: string, valor: number | null) => {
      setMonthState_((prev) => {
        const existing = prev.find((s) => s.expense_id === expenseId && s.mes_ref === month)
        apiFetch('/month-state', {
          method: 'PUT',
          body: JSON.stringify({ expense_id: expenseId, mes_ref: month, valor_real: valor !== null ? String(valor) : null }),
        }).then((row) => {
          setMonthState_((s) => {
            const idx = s.findIndex((x) => x.expense_id === expenseId && x.mes_ref === month)
            const normalized = normalizeMonthState(row as Record<string, unknown>)
            if (idx >= 0) return s.map((x, i) => i === idx ? normalized : x)
            return [...s, normalized]
          })
        }).catch(console.error)
        if (existing) return prev.map((s) => s === existing ? { ...s, valor_real: valor } : s)
        return [...prev, { expense_id: expenseId, mes_ref: month, valor_real: valor, pago: false, pago_em: null }]
      })
    },
    [month],
  )

  const setRevenueMonthValue = useCallback(
    (revenueId: string, valor: number | null) => {
      setRevenueState((prev) => {
        const existing = prev.find((s) => s.revenue_id === revenueId && s.mes_ref === month)
        apiFetch('/revenue-state', {
          method: 'PUT',
          body: JSON.stringify({ revenue_id: revenueId, mes_ref: month, valor_real: valor !== null ? String(valor) : null }),
        }).then((row) => {
          setRevenueState((s) => {
            const idx = s.findIndex((x) => x.revenue_id === revenueId && x.mes_ref === month)
            const normalized = normalizeRevenueState(row as Record<string, unknown>)
            if (idx >= 0) return s.map((x, i) => i === idx ? normalized : x)
            return [...s, normalized]
          })
        }).catch(console.error)
        if (existing) return prev.map((s) => s === existing ? { ...s, valor_real: valor } : s)
        return [...prev, { revenue_id: revenueId, mes_ref: month, valor_real: valor, recebido: false, recebido_em: null }]
      })
    },
    [month],
  )

  const addExpense = useCallback((draft: ExpenseDraft) => {
    apiFetch<Record<string, unknown>>('/expenses', {
      method: 'POST',
      body: JSON.stringify({ ...draft, valor_base: String(draft.valor_base) }),
    }).then((row) => {
      setExpensesRaw((prev) => [...prev, normalizeExpense(row)])
    }).catch(console.error)
  }, [])

  const updateExpense = useCallback((id: string, draft: ExpenseDraft) => {
    setExpensesRaw((prev) => prev.map((e) => e.id === id ? { ...e, ...draft } : e))
    apiFetch<Record<string, unknown>>(`/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ ...draft, valor_base: String(draft.valor_base) }),
    }).then((row) => {
      setExpensesRaw((prev) => prev.map((e) => e.id === id ? normalizeExpense(row) : e))
    }).catch(console.error)
  }, [])

  const deleteExpense = useCallback((id: string) => {
    setExpensesRaw((prev) => prev.filter((e) => e.id !== id))
    setMonthState_((prev) => prev.filter((s) => s.expense_id !== id))
    setExpenseLog((prev) => prev.filter((l) => l.expense_id !== id))
    apiFetch(`/expenses/${id}`, { method: 'DELETE' }).catch(console.error)
  }, [])

  const addRevenue = useCallback((draft: RevenueDraft) => {
    apiFetch<Record<string, unknown>>('/revenues', {
      method: 'POST',
      body: JSON.stringify({ ...draft, valor_base: String(draft.valor_base) }),
    }).then((row) => {
      setRevenuesRaw((prev) => [...prev, normalizeRevenue(row)])
    }).catch(console.error)
  }, [])

  const updateRevenue = useCallback((id: string, draft: RevenueDraft) => {
    setRevenuesRaw((prev) => prev.map((r) => r.id === id ? { ...r, ...draft } : r))
    apiFetch<Record<string, unknown>>(`/revenues/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ ...draft, valor_base: String(draft.valor_base) }),
    }).then((row) => {
      setRevenuesRaw((prev) => prev.map((r) => r.id === id ? normalizeRevenue(row) : r))
    }).catch(console.error)
  }, [])

  const deleteRevenue = useCallback((id: string) => {
    setRevenuesRaw((prev) => prev.filter((r) => r.id !== id))
    setRevenueState((prev) => prev.filter((s) => s.revenue_id !== id))
    apiFetch(`/revenues/${id}`, { method: 'DELETE' }).catch(console.error)
  }, [])

  const addCard = useCallback((draft: CardDraft) => {
    apiFetch<Record<string, unknown>>('/cards', {
      method: 'POST',
      body: JSON.stringify(draft),
    }).then((row) => {
      setCards((prev) => [...prev, normalizeCard(row)])
    }).catch(console.error)
  }, [])

  const updateCard = useCallback((id: string, draft: CardDraft) => {
    setCards((prev) => prev.map((c) => c.id === id ? { ...c, ...draft } : c))
    apiFetch<Record<string, unknown>>(`/cards/${id}`, {
      method: 'PUT',
      body: JSON.stringify(draft),
    }).then((row) => {
      setCards((prev) => prev.map((c) => c.id === id ? normalizeCard(row) : c))
    }).catch(console.error)
  }, [])

  const deleteCard = useCallback((id: string) => {
    setCards((prev) => prev.filter((c) => c.id !== id))
    setExpensesRaw((prev) => prev.map((e) => e.cartao_id === id ? { ...e, cartao_id: null } : e))
    apiFetch(`/cards/${id}`, { method: 'DELETE' }).catch(console.error)
  }, [])

  const resetToSeed = useCallback(() => {
    apiFetch<Record<string, unknown[]>>('/reset', { method: 'POST' })
      .then(() => apiFetch<Record<string, unknown[]>>('/data'))
      .then((data) => {
        setCards((data.cards as Record<string, unknown>[]).map(normalizeCard))
        setExpensesRaw((data.expenses as Record<string, unknown>[]).map(normalizeExpense))
        setRevenuesRaw((data.revenues as Record<string, unknown>[]).map(normalizeRevenue))
        setMonthState_((data.monthState as Record<string, unknown>[]).map(normalizeMonthState))
        setRevenueState((data.revenueState as Record<string, unknown>[]).map(normalizeRevenueState))
        setExpenseLog((data.expenseLog as Record<string, unknown>[]).map(normalizeLogEntry))
        setMonth('2026-07')
      })
      .catch(console.error)
  }, [setMonth])

  const value: FinanceContextValue = {
    loading, month, setMonth, goToMonth, cards, expensesRaw, revenuesRaw,
    expenses, revenues, summary, trend, logsFor,
    toggleExpensePaid, toggleRevenueReceived, addLogEntry, removeLogEntry,
    setExpenseMonthValue, setRevenueMonthValue,
    addExpense, updateExpense, deleteExpense,
    addRevenue, updateRevenue, deleteRevenue,
    addCard, updateCard, deleteCard,
    resetToSeed,
    reload,
  }

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
}

export function useFinance() {
  const ctx = useContext(FinanceContext)
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider')
  return ctx
}
