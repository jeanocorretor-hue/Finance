export type ExpenseCategory =
  | 'casa'
  | 'veiculo'
  | 'saude'
  | 'servicos'
  | 'assinatura'
  | 'outros'

export type RevenueCategory = 'fixo' | 'comissao' | 'outros'

export type ExpenseRecurrence = 'recorrente' | 'parcelada' | 'avulsa'
export type RevenueRecurrence = 'recorrente' | 'avulsa'

export interface Card {
  id: string
  nome: string
  dia_vencimento: number
  cor: string
}

export interface Expense {
  id: string
  nome: string
  valor_base: number
  categoria: ExpenseCategory
  recorrencia: ExpenseRecurrence
  parcelas?: number
  estimado: boolean
  dia_vencimento?: number | null
  cartao_id?: string | null
  mes_origem: string // "YYYY-MM"
  ativo: boolean
}

export interface Revenue {
  id: string
  nome: string
  valor_base: number
  categoria: RevenueCategory
  recorrencia: RevenueRecurrence
  mes_origem: string
  ativo: boolean
}

export interface MonthState {
  expense_id: string
  mes_ref: string
  valor_real?: number | null
  pago: boolean
  pago_em?: string | null
}

export interface RevenueMonthState {
  revenue_id: string
  mes_ref: string
  valor_real?: number | null
  recebido: boolean
  recebido_em?: string | null
}

export interface ExpenseLogEntry {
  id: string
  expense_id: string
  mes_ref: string
  valor: number
  descricao?: string
  data_registro: string
}

/** Assembled row from finance_month_view */
export interface MonthExpenseRow {
  expense_id: string
  nome: string
  categoria: ExpenseCategory
  recorrencia: ExpenseRecurrence
  valor: number
  estimado: boolean
  estimado_budget: number
  log_count: number
  parcela_atual: number | null
  parcelas_total: number | null
  cartao_id: string | null
  dia_vencimento: number | null
  pago: boolean
  pago_em: string | null
}

/** Assembled row from finance_month_revenue_view */
export interface MonthRevenueRow {
  revenue_id: string
  nome: string
  categoria: RevenueCategory
  recorrencia: RevenueRecurrence
  valor: number
  mes_origem: string
  recebido: boolean
  recebido_em: string | null
}

export interface TrendPoint {
  mes_ref: string
  total_despesa: number
  total_receita: number
}
