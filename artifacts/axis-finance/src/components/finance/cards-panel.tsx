import { useMemo, useState } from 'react'
import { CreditCard, Landmark, Pencil, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useFinance } from '@/lib/finance-store'
import { formatCurrency } from '@/lib/format'
import type { Card as CardType } from '@/lib/finance-types'
import { CardFormDialog } from './card-form-dialog'

interface Group {
  id: string
  nome: string
  cor: string
  dia: number | null
  total: number
  count: number
  isDebit: boolean
}

export function CardsPanel() {
  const { expenses, cards } = useFinance()
  const [editing, setEditing] = useState<CardType | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  const groups = useMemo<Group[]>(() => {
    const result: Group[] = cards.map((c) => ({
      id: c.id, nome: c.nome, cor: c.cor, dia: c.dia_vencimento, total: 0, count: 0, isDebit: false,
    }))
    const debit: Group = {
      id: 'debit', nome: 'Débito / Conta', cor: 'var(--color-muted-foreground)', dia: null, total: 0, count: 0, isDebit: true,
    }
    for (const e of expenses) {
      if (e.cartao_id) {
        const g = result.find((r) => r.id === e.cartao_id)
        if (g) { g.total += e.valor; g.count += 1 }
      } else {
        debit.total += e.valor; debit.count += 1
      }
    }
    return [...result, debit].filter((g) => g.count > 0 || !g.isDebit).sort((a, b) => b.total - a.total)
  }, [expenses, cards])

  const maxTotal = Math.max(...groups.map((g) => g.total), 1)

  function handleEdit(cardId: string) {
    const raw = cards.find((c) => c.id === cardId) ?? null
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
          <span className="flex size-8 items-center justify-center rounded-lg bg-chart-5/15 text-chart-5">
            <CreditCard className="size-4" />
          </span>
          <div>
            <h2 className="text-sm font-medium">Formas de pagamento</h2>
            <p className="text-xs text-muted-foreground">Distribuição das despesas do mês</p>
          </div>
        </div>
        <Button size="sm" className="h-8" onClick={handleNew}>
          <Plus className="size-4" />
          <span className="hidden sm:inline">Cartão</span>
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        {groups.map((g) => (
          <div key={g.id} className="group flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 font-medium">
                {g.isDebit ? (
                  <Landmark className="size-3.5 text-muted-foreground" />
                ) : (
                  <span className="size-3 rounded-full" style={{ backgroundColor: g.cor }} />
                )}
                {g.nome}
                {g.dia ? (
                  <span className="text-xs font-normal text-muted-foreground">fecha dia {g.dia}</span>
                ) : null}
                {!g.isDebit ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100"
                    onClick={() => handleEdit(g.id)}
                    aria-label={`Editar ${g.nome}`}
                  >
                    <Pencil className="size-3" />
                  </Button>
                ) : null}
              </span>
              <span className="font-mono tabular-nums">{formatCurrency(g.total)}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(g.total / maxTotal) * 100}%`,
                  backgroundColor: g.isDebit ? 'var(--color-muted-foreground)' : g.cor,
                }}
              />
            </div>
            <span className="text-xs text-muted-foreground">{g.count} despesa{g.count === 1 ? '' : 's'}</span>
          </div>
        ))}
      </div>

      <CardFormDialog card={editing} open={formOpen} onOpenChange={setFormOpen} />
    </Card>
  )
}
