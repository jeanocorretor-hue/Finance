import type {
  Card,
  Expense,
  ExpenseLogEntry,
  MonthState,
  Revenue,
  RevenueMonthState,
} from './finance-types'

/** Reference "current" month for the seed (export generated 2026-07-12). */
export const CURRENT_MONTH = '2026-07'

export const seedCards: Card[] = [
  { id: 'card-nubank', nome: 'Nubank', dia_vencimento: 5, cor: '#8B5CF6' },
  { id: 'card-neon', nome: 'Neon', dia_vencimento: 5, cor: '#22D3EE' },
  { id: 'card-sicredi', nome: 'Sicredi Empresa', dia_vencimento: 13, cor: '#4ADE80' },
]

export const seedExpenses: Expense[] = [
  { id: 'exp-agua', nome: 'Água', valor_base: 150, categoria: 'casa', recorrencia: 'recorrente', estimado: false, dia_vencimento: 20, cartao_id: null, mes_origem: '2026-01', ativo: true },
  { id: 'exp-alternador', nome: 'Alternador', valor_base: 230, categoria: 'veiculo', recorrencia: 'parcelada', parcelas: 3, estimado: false, cartao_id: 'card-neon', mes_origem: '2026-06', ativo: true },
  { id: 'exp-anthropic', nome: 'Anthropic', valor_base: 110, categoria: 'assinatura', recorrencia: 'recorrente', estimado: false, cartao_id: 'card-nubank', mes_origem: '2026-01', ativo: true },
  { id: 'exp-gemini', nome: 'API Gemini Finance', valor_base: 50, categoria: 'assinatura', recorrencia: 'recorrente', estimado: false, cartao_id: 'card-nubank', mes_origem: '2026-01', ativo: true },
  { id: 'exp-casa', nome: 'Casa', valor_base: 577, categoria: 'casa', recorrencia: 'recorrente', estimado: false, dia_vencimento: 5, cartao_id: null, mes_origem: '2026-01', ativo: true },
  { id: 'exp-emprestimo', nome: 'Empréstimo', valor_base: 172, categoria: 'servicos', recorrencia: 'parcelada', parcelas: 6, estimado: false, dia_vencimento: 8, cartao_id: null, mes_origem: '2026-04', ativo: true },
  { id: 'exp-gasolina', nome: 'Gasolina', valor_base: 800, categoria: 'veiculo', recorrencia: 'recorrente', estimado: true, dia_vencimento: null, cartao_id: null, mes_origem: '2026-01', ativo: true },
  { id: 'exp-icloud', nome: 'iCloud', valor_base: 19.9, categoria: 'assinatura', recorrencia: 'recorrente', estimado: false, cartao_id: 'card-nubank', mes_origem: '2026-01', ativo: true },
  { id: 'exp-internet', nome: 'Internet', valor_base: 123, categoria: 'servicos', recorrencia: 'recorrente', estimado: false, dia_vencimento: 15, cartao_id: null, mes_origem: '2026-01', ativo: true },
  { id: 'exp-iptu', nome: 'IPTU', valor_base: 203, categoria: 'casa', recorrencia: 'parcelada', parcelas: 23, estimado: false, dia_vencimento: 10, cartao_id: null, mes_origem: '2026-01', ativo: true },
  { id: 'exp-lightroom', nome: 'Lightroom', valor_base: 35, categoria: 'assinatura', recorrencia: 'recorrente', estimado: false, cartao_id: 'card-nubank', mes_origem: '2026-01', ativo: true },
  { id: 'exp-luz', nome: 'Luz', valor_base: 225, categoria: 'casa', recorrencia: 'recorrente', estimado: true, dia_vencimento: 25, cartao_id: null, mes_origem: '2026-01', ativo: true },
  { id: 'exp-oral-unic', nome: 'Oral Unic', valor_base: 360, categoria: 'saude', recorrencia: 'recorrente', estimado: false, dia_vencimento: 10, cartao_id: null, mes_origem: '2026-01', ativo: true },
  { id: 'exp-parcela-carro', nome: 'Parcela do Carro', valor_base: 1263, categoria: 'veiculo', recorrencia: 'parcelada', parcelas: 3, estimado: false, dia_vencimento: 12, cartao_id: null, mes_origem: '2026-05', ativo: true },
  { id: 'exp-pneu', nome: 'Pneu', valor_base: 180.85, categoria: 'veiculo', recorrencia: 'parcelada', parcelas: 6, estimado: false, cartao_id: 'card-sicredi', mes_origem: '2026-07', ativo: true },
  { id: 'exp-susp', nome: 'Susp.', valor_base: 1080, categoria: 'veiculo', recorrencia: 'parcelada', parcelas: 6, estimado: false, cartao_id: 'card-sicredi', mes_origem: '2026-07', ativo: true },
  { id: 'exp-telefone', nome: 'Telefone', valor_base: 55, categoria: 'servicos', recorrencia: 'recorrente', estimado: false, dia_vencimento: 18, cartao_id: null, mes_origem: '2026-01', ativo: true },
  { id: 'exp-zapi', nome: 'Z-API', valor_base: 100, categoria: 'assinatura', recorrencia: 'recorrente', estimado: false, cartao_id: 'card-nubank', mes_origem: '2026-01', ativo: true },
]

export const seedRevenues: Revenue[] = [
  { id: 'rev-comissao', nome: 'Comissão', valor_base: 18750, categoria: 'comissao', recorrencia: 'avulsa', mes_origem: '2026-11', ativo: true },
  { id: 'rev-fixo', nome: 'Fixo Mensal', valor_base: 6000, categoria: 'fixo', recorrencia: 'recorrente', mes_origem: '2026-07', ativo: true },
  { id: 'rev-salario', nome: 'Salário', valor_base: 2000, categoria: 'fixo', recorrencia: 'recorrente', mes_origem: '2026-07', ativo: true },
]

const paidOn6 = '2026-07-06T09:00:00Z'
const paidOn12 = '2026-07-12T09:00:00Z'

export const seedMonthState: MonthState[] = seedExpenses.map((e) => ({
  expense_id: e.id,
  mes_ref: CURRENT_MONTH,
  valor_real: null,
  pago: true,
  pago_em: e.id === 'exp-pneu' || e.id === 'exp-susp' ? paidOn12 : paidOn6,
}))

export const seedRevenueState: RevenueMonthState[] = []

export const seedExpenseLog: ExpenseLogEntry[] = []
