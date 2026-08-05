import {
  boolean,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core'

// ─── Cards ────────────────────────────────────────────────────────────────────

export const cardsTable = pgTable('finance_cards', {
  id: text('id').primaryKey(),
  nome: text('nome').notNull(),
  dia_vencimento: integer('dia_vencimento').notNull(),
  cor: text('cor').notNull(),
})

export type Card = typeof cardsTable.$inferSelect
export type InsertCard = typeof cardsTable.$inferInsert

// ─── Expenses ─────────────────────────────────────────────────────────────────

export const expensesTable = pgTable('finance_expenses', {
  id: text('id').primaryKey(),
  nome: text('nome').notNull(),
  valor_base: numeric('valor_base', { precision: 12, scale: 2 }).notNull(),
  categoria: text('categoria').notNull(),
  recorrencia: text('recorrencia').notNull(),
  parcelas: integer('parcelas'),
  estimado: boolean('estimado').notNull().default(false),
  dia_vencimento: integer('dia_vencimento'),
  cartao_id: text('cartao_id'),
  mes_origem: text('mes_origem').notNull(),
  ativo: boolean('ativo').notNull().default(true),
})

export type Expense = typeof expensesTable.$inferSelect
export type InsertExpense = typeof expensesTable.$inferInsert

// ─── Revenues ─────────────────────────────────────────────────────────────────

export const revenuesTable = pgTable('finance_revenues', {
  id: text('id').primaryKey(),
  nome: text('nome').notNull(),
  valor_base: numeric('valor_base', { precision: 12, scale: 2 }).notNull(),
  categoria: text('categoria').notNull(),
  recorrencia: text('recorrencia').notNull(),
  mes_origem: text('mes_origem').notNull(),
  ativo: boolean('ativo').notNull().default(true),
})

export type Revenue = typeof revenuesTable.$inferSelect
export type InsertRevenue = typeof revenuesTable.$inferInsert

// ─── Expense month state ──────────────────────────────────────────────────────

export const monthStateTable = pgTable(
  'finance_month_state',
  {
    id: serial('id').primaryKey(),
    expense_id: text('expense_id').notNull(),
    mes_ref: text('mes_ref').notNull(),
    valor_real: numeric('valor_real', { precision: 12, scale: 2 }),
    pago: boolean('pago').notNull().default(false),
    pago_em: timestamp('pago_em', { withTimezone: true }),
  },
  (t) => [unique('finance_month_state_unique').on(t.expense_id, t.mes_ref)],
)

export type MonthState = typeof monthStateTable.$inferSelect
export type InsertMonthState = typeof monthStateTable.$inferInsert

// ─── Revenue month state ──────────────────────────────────────────────────────

export const revenueStateTable = pgTable(
  'finance_revenue_state',
  {
    id: serial('id').primaryKey(),
    revenue_id: text('revenue_id').notNull(),
    mes_ref: text('mes_ref').notNull(),
    valor_real: numeric('valor_real', { precision: 12, scale: 2 }),
    recebido: boolean('recebido').notNull().default(false),
    recebido_em: timestamp('recebido_em', { withTimezone: true }),
  },
  (t) => [unique('finance_revenue_state_unique').on(t.revenue_id, t.mes_ref)],
)

export type RevenueState = typeof revenueStateTable.$inferSelect
export type InsertRevenueState = typeof revenueStateTable.$inferInsert

// ─── Expense log (variable expenses) ─────────────────────────────────────────

export const expenseLogTable = pgTable('finance_expense_log', {
  id: text('id').primaryKey(),
  expense_id: text('expense_id').notNull(),
  mes_ref: text('mes_ref').notNull(),
  valor: numeric('valor', { precision: 12, scale: 2 }).notNull(),
  descricao: text('descricao'),
  data_registro: timestamp('data_registro', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export type ExpenseLog = typeof expenseLogTable.$inferSelect
export type InsertExpenseLog = typeof expenseLogTable.$inferInsert
