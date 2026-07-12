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

export interface FinanceDataset {
  cards: Card[]
  expenses: Expense[]
  revenues: Revenue[]
  monthState: MonthState[]
  revenueState: RevenueMonthState[]
  expenseLog: ExpenseLogEntry[]
}

/** Month difference between two "YYYY-MM" references (target - origin). */
function monthDiff(target: string, origin: string): number {
  const [ty, tm] = target.split('-').map(Number)
  const [oy, om] = origin.split('-').map(Number)
  return (ty - oy) * 12 + (tm - om)
}

export function monthExpenseView(
  data: FinanceDataset,
  mes: string,
): MonthExpenseRow[] {
  const cardById = new Map(data.cards.map((c) => [c.id, c]))

  return data.expenses
    .filter((e) => e.ativo)
    .map((e) => {
      const diff = monthDiff(mes, e.mes_origem)

      let visible = false
      if (e.recorrencia === 'recorrente') visible = diff >= 0
      else if (e.recorrencia === 'avulsa') visible = diff === 0
      else if (e.recorrencia === 'parcelada')
        visible = diff >= 0 && diff < (e.parcelas ?? 0)
      if (!visible) return null

      const logs = data.expenseLog.filter(
        (l) => l.expense_id === e.id && l.mes_ref === mes,
      )
      const logTotal = logs.length
        ? logs.reduce((sum, l) => sum + l.valor, 0)
        : null

      const ms = data.monthState.find(
        (s) => s.expense_id === e.id && s.mes_ref === mes,
      )

      const valor = logTotal ?? ms?.valor_real ?? e.valor_base

      const estimado =
        logTotal !== null ? false : ms?.valor_real != null ? false : e.estimado

      const card = e.cartao_id ? cardById.get(e.cartao_id) : undefined

      const row: MonthExpenseRow = {
        expense_id: e.id,
        nome: e.nome,
        categoria: e.categoria,
        recorrencia: e.recorrencia,
        valor,
        estimado,
        estimado_budget: e.valor_base,
        log_count: logs.length,
        parcela_atual: e.recorrencia === 'parcelada' ? diff + 1 : null,
        parcelas_total: e.parcelas ?? null,
        cartao_id: e.cartao_id ?? null,
        dia_vencimento: e.dia_vencimento ?? card?.dia_vencimento ?? null,
        pago: ms?.pago ?? false,
        pago_em: ms?.pago_em ?? null,
      }
      return row
    })
    .filter((r): r is MonthExpenseRow => r !== null)
    .sort((a, b) => b.valor - a.valor)
}

export function monthRevenueView(
  data: FinanceDataset,
  mes: string,
): MonthRevenueRow[] {
  return data.revenues
    .filter((r) => r.ativo)
    .map((r) => {
      const diff = monthDiff(mes, r.mes_origem)

      let visible = false
      if (r.recorrencia === 'recorrente') visible = diff >= 0
      else if (r.recorrencia === 'avulsa') visible = diff === 0
      if (!visible) return null

      const ms = data.revenueState.find(
        (s) => s.revenue_id === r.id && s.mes_ref === mes,
      )

      const row: MonthRevenueRow = {
        revenue_id: r.id,
        nome: r.nome,
        categoria: r.categoria,
        recorrencia: r.recorrencia,
        valor: ms?.valor_real ?? r.valor_base,
        mes_origem: r.mes_origem,
        recebido: ms?.recebido ?? false,
        recebido_em: ms?.recebido_em ?? null,
      }
      return row
    })
    .filter((r): r is MonthRevenueRow => r !== null)
    .sort((a, b) => b.valor - a.valor)
}

export function trendSeries(
  data: FinanceDataset,
  startMes: string,
  endMes: string,
): TrendPoint[] {
  const points: TrendPoint[] = []
  let curr = startMes
  for (let i = 0; i < 240; i++) {
    const despesas = monthExpenseView(data, curr).reduce(
      (sum, r) => sum + r.valor,
      0,
    )
    const receitas = monthRevenueView(data, curr).reduce(
      (sum, r) => sum + r.valor,
      0,
    )
    points.push({
      mes_ref: curr,
      total_despesa: despesas,
      total_receita: receitas,
    })
    if (curr === endMes) break
    curr = addMonths(curr, 1)
  }
  return points
}

export interface MonthSummary {
  totalReceita: number
  totalDespesa: number
  projectedNet: number
  receivedRevenue: number
  paidExpense: number
  actualNet: number
  pendingExpense: number
  pendingRevenue: number
  expenseCount: number
  paidCount: number
}

export function summarize(
  expenses: MonthExpenseRow[],
  revenues: MonthRevenueRow[],
): MonthSummary {
  const totalReceita = revenues.reduce((s, r) => s + r.valor, 0)
  const totalDespesa = expenses.reduce((s, e) => s + e.valor, 0)
  const receivedRevenue = revenues
    .filter((r) => r.recebido)
    .reduce((s, r) => s + r.valor, 0)
  const paidExpense = expenses
    .filter((e) => e.pago)
    .reduce((s, e) => s + e.valor, 0)

  return {
    totalReceita,
    totalDespesa,
    projectedNet: totalReceita - totalDespesa,
    receivedRevenue,
    paidExpense,
    actualNet: receivedRevenue - paidExpense,
    pendingExpense: totalDespesa - paidExpense,
    pendingRevenue: totalReceita - receivedRevenue,
    expenseCount: expenses.length,
    paidCount: expenses.filter((e) => e.pago).length,
  }
}
