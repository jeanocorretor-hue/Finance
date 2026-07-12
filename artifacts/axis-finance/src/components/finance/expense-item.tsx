import { Check, Gauge, Pencil } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useFinance } from '@/lib/finance-store'
import { formatCurrency } from '@/lib/format'
import type { Card, MonthExpenseRow } from '@/lib/finance-types'
import { cn } from '@/lib/utils'
import { expenseCategoryMeta } from './category-meta'

interface Props {
  expense: MonthExpenseRow
  cards: Card[]
  onOpenVariable: (expense: MonthExpenseRow) => void
  onEdit: (expenseId: string) => void
}

export function ExpenseItem({ expense, cards, onOpenVariable, onEdit }: Props) {
  const { toggleExpensePaid } = useFinance()
  const meta = expenseCategoryMeta[expense.categoria]
  const Icon = meta.icon
  const card = cards.find((c) => c.id === expense.cartao_id)
  const isVariable = expense.estimado || expense.log_count > 0

  return (
    <div
      className={cn(
        'group flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 transition-colors',
        'hover:border-border/80 hover:bg-accent/40',
        expense.pago && 'opacity-70',
      )}
    >
      <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary', meta.tint)}>
        <Icon className="size-4" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{expense.nome}</p>
          {expense.recorrencia === 'parcelada' && expense.parcela_atual && expense.parcelas_total ? (
            <Badge variant="secondary" className="h-5 shrink-0 px-1.5 font-mono text-[10px] tabular-nums">
              {expense.parcela_atual}/{expense.parcelas_total}
            </Badge>
          ) : null}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          <span>{meta.label}</span>
          {expense.dia_vencimento ? (
            <>
              <span aria-hidden>·</span>
              <span>vence dia {expense.dia_vencimento}</span>
            </>
          ) : null}
          {card ? (
            <>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1">
                <span className="size-2 rounded-full" style={{ backgroundColor: card.cor }} />
                {card.nome}
              </span>
            </>
          ) : (
            <>
              <span aria-hidden>·</span>
              <span>Débito</span>
            </>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100"
          onClick={() => onEdit(expense.expense_id)}
          aria-label={`Editar ${expense.nome}`}
        >
          <Pencil className="size-3.5" />
        </Button>
        {isVariable ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-auto flex-col items-end gap-0 px-2 py-1 hover:bg-transparent"
            onClick={() => onOpenVariable(expense)}
          >
            <span className="flex items-center gap-1 font-mono text-sm font-semibold tabular-nums">
              <Gauge className="size-3 text-primary" />
              {formatCurrency(expense.valor)}
            </span>
            <span className="text-[10px] font-normal text-primary">
              {expense.log_count > 0
                ? `${expense.log_count} lançamento${expense.log_count === 1 ? '' : 's'}`
                : 'estimado · registrar'}
            </span>
          </Button>
        ) : (
          <span className="font-mono text-sm font-semibold tabular-nums">
            {formatCurrency(expense.valor)}
          </span>
        )}

        <button
          type="button"
          onClick={() => toggleExpensePaid(expense.expense_id)}
          aria-label={expense.pago ? 'Marcar como não pago' : 'Marcar como pago'}
          aria-pressed={expense.pago}
          className={cn(
            'flex size-6 items-center justify-center rounded-full border transition-colors',
            expense.pago
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border text-transparent hover:border-primary/60',
          )}
        >
          <Check className="size-3.5" strokeWidth={3} />
        </button>
      </div>
    </div>
  )
}
