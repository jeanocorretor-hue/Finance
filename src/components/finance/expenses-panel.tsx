import { useMemo, useState } from 'react'
import { Plus, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useFinance } from '@/lib/finance-store'
import { formatCurrency } from '@/lib/format'
import type { Expense, MonthExpenseRow } from '@/lib/finance-types'
import { ExpenseItem } from './expense-item'
import { ExpenseFormDialog } from './expense-form-dialog'
import { VariableExpenseDialog } from './variable-expense-dialog'

type Filter = 'todas' | 'pendentes' | 'pagas'

export function ExpensesPanel() {
  const { expenses, expensesRaw, cards, summary } = useFinance()
  const [filter, setFilter] = useState<Filter>('todas')
  const [selected, setSelected] = useState<MonthExpenseRow | null>(null)
  const [variableOpen, setVariableOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  const filtered = useMemo(() => {
    if (filter === 'pendentes') return expenses.filter((e) => !e.pago)
    if (filter === 'pagas') return expenses.filter((e) => e.pago)
    return expenses
  }, [expenses, filter])

  function handleOpenVariable(expense: MonthExpenseRow) {
    setSelected(expense)
    setVariableOpen(true)
  }

  function handleEdit(expenseId: string) {
    const raw = expensesRaw.find((e) => e.id === expenseId) ?? null
    setEditing(raw)
    setFormOpen(true)
  }

  function handleNew() {
    setEditing(null)
    setFormOpen(true)
  }

  return (
    <Card className="gap-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-destructive/15 text-destructive">
            <Receipt className="size-4" />
          </span>
          <div>
            <h2 className="text-sm font-medium">Despesas</h2>
            <p className="text-xs text-muted-foreground">
              {summary.paidCount} de {summary.expenseCount} pagas ·{' '}
              {formatCurrency(summary.pendingExpense)} a pagar
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <TabsList className="h-8">
              <TabsTrigger value="todas" className="text-xs">Todas</TabsTrigger>
              <TabsTrigger value="pendentes" className="text-xs">A pagar</TabsTrigger>
              <TabsTrigger value="pagas" className="text-xs">Pagas</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button size="sm" className="h-8" onClick={handleNew}>
            <Plus className="size-4" />
            <span className="hidden sm:inline">Nova</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-muted-foreground">Nenhuma despesa nesta visão.</p>
            <Button variant="outline" size="sm" onClick={handleNew}>
              <Plus className="size-4" />
              Adicionar despesa
            </Button>
          </div>
        ) : (
          filtered.map((expense) => (
            <ExpenseItem
              key={expense.expense_id}
              expense={expense}
              cards={cards}
              onOpenVariable={handleOpenVariable}
              onEdit={handleEdit}
            />
          ))
        )}
      </div>

      <VariableExpenseDialog expense={selected} open={variableOpen} onOpenChange={setVariableOpen} />
      <ExpenseFormDialog expense={editing} open={formOpen} onOpenChange={setFormOpen} />
    </Card>
  )
}
