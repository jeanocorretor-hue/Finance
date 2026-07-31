import { useState } from 'react'
import { Gauge, Plus, Trash2 } from 'lucide-react'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useFinance } from '@/lib/finance-store'
import { formatCurrency, formatDate } from '@/lib/format'
import type { MonthExpenseRow } from '@/lib/finance-types'
import { cn } from '@/lib/utils'

interface Props {
  expense: MonthExpenseRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function VariableExpenseDialog({ expense, open, onOpenChange }: Props) {
  const { logsFor, addLogEntry, removeLogEntry } = useFinance()
  const [valor, setValor] = useState('')
  const [descricao, setDescricao] = useState('')

  if (!expense) return null

  const logs = logsFor(expense.expense_id)
  const tracked = logs.reduce((s, l) => s + l.valor, 0)
  const budget = expense.estimado_budget
  const pct = budget > 0 ? Math.min(100, (tracked / budget) * 100) : 0
  const over = tracked > budget

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const parsed = Number.parseFloat(valor.replace(',', '.'))
    if (!Number.isFinite(parsed) || parsed <= 0 || !expense) return
    addLogEntry(expense.expense_id, parsed, descricao.trim() || undefined)
    setValor('')
    setDescricao('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gauge className="size-4 text-primary" />
            {expense.nome}
          </DialogTitle>
          <DialogDescription>
            Gasto variável rastreado. Registre os lançamentos ao longo do mês — a soma substitui o valor estimado.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-border bg-secondary/40 p-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Acumulado</p>
              <p className={cn('font-mono text-xl font-semibold tabular-nums', over && 'text-destructive')}>
                {formatCurrency(tracked)}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">Orçado {formatCurrency(budget)}</p>
          </div>
          <Progress value={pct} className={cn('mt-3 h-2', over ? '[&>div]:bg-destructive' : '[&>div]:bg-primary')} />
          {over ? (
            <p className="mt-2 text-xs text-destructive">{formatCurrency(tracked - budget)} acima do orçamento</p>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">{formatCurrency(budget - tracked)} restantes no orçamento</p>
          )}
        </div>

        <form onSubmit={handleAdd} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="valor">Valor</Label>
              <Input id="valor" inputMode="decimal" placeholder="0,00" value={valor} onChange={(e) => setValor(e.target.value)} className="font-mono tabular-nums" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="descricao">Descrição</Label>
              <Input id="descricao" placeholder="Opcional" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
            </div>
          </div>
          <Button type="submit" className="w-full">
            <Plus className="size-4" />
            Registrar lançamento
          </Button>
        </form>

        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            {logs.length} lançamento{logs.length === 1 ? '' : 's'}
          </p>
          <ScrollArea className="max-h-52">
            {logs.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhum lançamento neste mês.</p>
            ) : (
              <ul className="flex flex-col gap-1.5 pr-3">
                {logs.map((log) => (
                  <li key={log.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm">{log.descricao || 'Sem descrição'}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(log.data_registro)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm tabular-nums">{formatCurrency(log.valor)}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-destructive"
                        onClick={() => removeLogEntry(log.id)}
                        aria-label="Remover lançamento"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}
