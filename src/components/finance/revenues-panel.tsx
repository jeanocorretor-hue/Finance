import { useState } from 'react'
import { Check, Pencil, Plus, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useFinance } from '@/lib/finance-store'
import { formatCurrency } from '@/lib/format'
import type { Revenue } from '@/lib/finance-types'
import { cn } from '@/lib/utils'
import { revenueCategoryMeta } from './category-meta'
import { RevenueFormDialog } from './revenue-form-dialog'

export function RevenuesPanel() {
  const { revenues, revenuesRaw, toggleRevenueReceived, summary } = useFinance()
  const [editing, setEditing] = useState<Revenue | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  function handleEdit(revenueId: string) {
    const raw = revenuesRaw.find((r) => r.id === revenueId) ?? null
    setEditing(raw)
    setFormOpen(true)
  }

  function handleNew() {
    setEditing(null)
    setFormOpen(true)
  }

  return (
    <Card className="gap-4 p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <TrendingUp className="size-4" />
          </span>
          <div>
            <h2 className="text-sm font-medium">Receitas</h2>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(summary.receivedRevenue)} recebido ·{' '}
              {formatCurrency(summary.pendingRevenue)} a receber
            </p>
          </div>
        </div>
        <Button size="sm" className="h-8" onClick={handleNew}>
          <Plus className="size-4" />
          <span className="hidden sm:inline">Nova</span>
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {revenues.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-muted-foreground">Nenhuma receita neste mês.</p>
            <Button variant="outline" size="sm" onClick={handleNew}>
              <Plus className="size-4" />
              Adicionar receita
            </Button>
          </div>
        ) : (
          revenues.map((rev) => {
            const meta = revenueCategoryMeta[rev.categoria]
            const Icon = meta.icon
            return (
              <div
                key={rev.revenue_id}
                className={cn(
                  'group flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 transition-colors hover:bg-accent/40',
                  rev.recebido && 'opacity-70',
                )}
              >
                <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary', meta.tint)}>
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{rev.nome}</p>
                    {rev.recorrencia === 'avulsa' ? (
                      <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">Avulsa</Badge>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {meta.label} · {rev.recorrencia === 'recorrente' ? 'Mensal' : 'Única'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100"
                  onClick={() => handleEdit(rev.revenue_id)}
                  aria-label={`Editar ${rev.nome}`}
                >
                  <Pencil className="size-3.5" />
                </Button>
                <span className="font-mono text-sm font-semibold tabular-nums text-primary">
                  {formatCurrency(rev.valor)}
                </span>
                <button
                  type="button"
                  onClick={() => toggleRevenueReceived(rev.revenue_id)}
                  aria-label={rev.recebido ? 'Marcar como não recebido' : 'Marcar como recebido'}
                  aria-pressed={rev.recebido}
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors',
                    rev.recebido
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border text-transparent hover:border-primary/60',
                  )}
                >
                  <Check className="size-3.5" strokeWidth={3} />
                </button>
              </div>
            )
          })
        )}
      </div>

      <RevenueFormDialog revenue={editing} open={formOpen} onOpenChange={setFormOpen} />
    </Card>
  )
}
