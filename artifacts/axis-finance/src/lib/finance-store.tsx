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
  CURRENT_MONTH,
  seedCards,
  seedExpenseLog,
  seedExpenses,
  seedMonthState,
  seedRevenueState,
  seedRevenues,
} from './finance-data'
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

// ─── localStorage helpers ──────────────────────────────────────────────────

const LS_PREFIX = 'axis-finance:'

function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function lsSet<T>(key: string, value: T): void {
  try {
    localStorage.setItem(LS_PREFIX + key, JSON.stringify(value))
  } catch {
    // storage full or private mode — silently ignore
  }
}

// ─── Context ───────────────────────────────────────────────────────────────

interface FinanceContextValue {
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
}

const FinanceContext = createContext<FinanceContextValue | null>(null)

let idCounter = 0
const uid = (prefix: string) => `${prefix}-${Date.now()}-${idCounter++}`

// ─── Provider ──────────────────────────────────────────────────────────────

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [month, setMonth] = useState(() => lsGet('month', CURRENT_MONTH))
  const [expensesRaw, setExpensesRaw] = useState<Expense[]>(() => lsGet('expenses', seedExpenses))
  const [revenuesRaw, setRevenuesRaw] = useState<Revenue[]>(() => lsGet('revenues', seedRevenues))
  const [cards, setCards] = useState<Card[]>(() => lsGet('cards', seedCards))
  const [monthState, setMonthState] = useState<MonthState[]>(() => lsGet('monthState', seedMonthState))
  const [revenueState, setRevenueState] = useState<RevenueMonthState[]>(() => lsGet('revenueState', seedRevenueState))
  const [expenseLog, setExpenseLog] = useState<ExpenseLogEntry[]>(() => lsGet('expenseLog', seedExpenseLog))

  // ── Persist to localStorage on every change ──────────────────────────────
  useEffect(() => { lsSet('month', month) }, [month])
  useEffect(() => { lsSet('expenses', expensesRaw) }, [expensesRaw])
  useEffect(() => { lsSet('revenues', revenuesRaw) }, [revenuesRaw])
  useEffect(() => { lsSet('cards', cards) }, [cards])
  useEffect(() => { lsSet('monthState', monthState) }, [monthState])
  useEffect(() => { lsSet('revenueState', revenueState) }, [revenueState])
  useEffect(() => { lsSet('expenseLog', expenseLog) }, [expenseLog])

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

  // ── Actions ───────────────────────────────────────────────────────────────
  const goToMonth = useCallback((delta: number) => {
    setMonth((m) => addMonths(m, delta))
  }, [])

  const logsFor = useCallback(
    (expenseId: string) =>
      expenseLog
        .filter((l) => l.expense_id === expenseId && l.mes_ref === month)
        .sort((a, b) => b.data_registro.localeCompare(a.data_registro)),
    [expenseLog, month],
  )

  const toggleExpensePaid = useCallback(
    (expenseId: string) => {
      setMonthState((prev) => {
        const existing = prev.find((s) => s.expense_id === expenseId && s.mes_ref === month)
        if (existing) {
          return prev.map((s) =>
            s === existing
              ? { ...s, pago: !s.pago, pago_em: !s.pago ? new Date().toISOString() : null }
              : s,
          )
        }
        return [...prev, { expense_id: expenseId, mes_ref: month, valor_real: null, pago: true, pago_em: new Date().toISOString() }]
      })
    },
    [month],
  )

  const toggleRevenueReceived = useCallback(
    (revenueId: string) => {
      setRevenueState((prev) => {
        const existing = prev.find((s) => s.revenue_id === revenueId && s.mes_ref === month)
        if (existing) {
          return prev.map((s) =>
            s === existing
              ? { ...s, recebido: !s.recebido, recebido_em: !s.recebido ? new Date().toISOString() : null }
              : s,
          )
        }
        return [...prev, { revenue_id: revenueId, mes_ref: month, valor_real: null, recebido: true, recebido_em: new Date().toISOString() }]
      })
    },
    [month],
  )

  const addLogEntry = useCallback(
    (expenseId: string, valor: number, descricao?: string) => {
      setExpenseLog((prev) => [
        ...prev,
        { id: uid('log'), expense_id: expenseId, mes_ref: month, valor, descricao, data_registro: new Date().toISOString() },
      ])
    },
    [month],
  )

  const removeLogEntry = useCallback((logId: string) => {
    setExpenseLog((prev) => prev.filter((l) => l.id !== logId))
  }, [])

  const setExpenseMonthValue = useCallback(
    (expenseId: string, valor: number | null) => {
      setMonthState((prev) => {
        const existing = prev.find((s) => s.expense_id === expenseId && s.mes_ref === month)
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
        if (existing) return prev.map((s) => s === existing ? { ...s, valor_real: valor } : s)
        return [...prev, { revenue_id: revenueId, mes_ref: month, valor_real: valor, recebido: false, recebido_em: null }]
      })
    },
    [month],
  )

  const addExpense = useCallback((draft: ExpenseDraft) => {
    setExpensesRaw((prev) => [...prev, { ...draft, id: uid('exp'), ativo: true }])
  }, [])

  const updateExpense = useCallback((id: string, draft: ExpenseDraft) => {
    setExpensesRaw((prev) => prev.map((e) => (e.id === id ? { ...e, ...draft } : e)))
  }, [])

  const deleteExpense = useCallback((id: string) => {
    setExpensesRaw((prev) => prev.filter((e) => e.id !== id))
    setMonthState((prev) => prev.filter((s) => s.expense_id !== id))
    setExpenseLog((prev) => prev.filter((l) => l.expense_id !== id))
  }, [])

  const addRevenue = useCallback((draft: RevenueDraft) => {
    setRevenuesRaw((prev) => [...prev, { ...draft, id: uid('rev'), ativo: true }])
  }, [])

  const updateRevenue = useCallback((id: string, draft: RevenueDraft) => {
    setRevenuesRaw((prev) => prev.map((r) => (r.id === id ? { ...r, ...draft } : r)))
  }, [])

  const deleteRevenue = useCallback((id: string) => {
    setRevenuesRaw((prev) => prev.filter((r) => r.id !== id))
    setRevenueState((prev) => prev.filter((s) => s.revenue_id !== id))
  }, [])

  const addCard = useCallback((draft: CardDraft) => {
    setCards((prev) => [...prev, { ...draft, id: uid('card') }])
  }, [])

  const updateCard = useCallback((id: string, draft: CardDraft) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...draft } : c)))
  }, [])

  const deleteCard = useCallback((id: string) => {
    setCards((prev) => prev.filter((c) => c.id !== id))
    setExpensesRaw((prev) => prev.map((e) => (e.cartao_id === id ? { ...e, cartao_id: null } : e)))
  }, [])

  /** Limpa o localStorage e restaura os dados de demonstração */
  const resetToSeed = useCallback(() => {
    setMonth(CURRENT_MONTH)
    setExpensesRaw(seedExpenses)
    setRevenuesRaw(seedRevenues)
    setCards(seedCards)
    setMonthState(seedMonthState)
    setRevenueState(seedRevenueState)
    setExpenseLog(seedExpenseLog)
  }, [])

  const value: FinanceContextValue = {
    month, setMonth, goToMonth, cards, expensesRaw, revenuesRaw, expenses, revenues, summary, trend,
    logsFor, toggleExpensePaid, toggleRevenueReceived, addLogEntry, removeLogEntry,
    setExpenseMonthValue, setRevenueMonthValue, addExpense, updateExpense, deleteExpense,
    addRevenue, updateRevenue, deleteRevenue, addCard, updateCard, deleteCard,
    resetToSeed,
  }

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
}

export function useFinance() {
  const ctx = useContext(FinanceContext)
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider')
  return ctx
}
