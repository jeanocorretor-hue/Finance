import {
  ArrowDownRight,
  ArrowUpRight,
  Scale,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useFinance } from '@/lib/finance-store'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'

interface StatProps {
  label: string
  value: number
  icon: LucideIcon
  accent: string
  hint?: string
  sub?: React.ReactNode
}

function Stat({ label, value, icon: Icon, accent, hint, sub }: StatProps) {
  return (
    <Card className="gap-3 p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={cn('flex size-8 items-center justify-center rounded-lg', accent)}>
          <Icon className="size-4" />
        </span>
      </div>
      <div>
        <p className="font-mono text-2xl font-semibold tracking-tight tabular-nums">
          {formatCurrency(value)}
        </p>
        {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      {sub}
    </Card>
  )
}

export function SummaryCards() {
  const { summary } = useFinance()
  const { totalReceita, totalDespesa, projectedNet, actualNet, receivedRevenue, paidExpense, pendingExpense } = summary

  const paidPct = totalDespesa > 0 ? Math.min(100, (paidExpense / totalDespesa) * 100) : 0
  const receivedPct = totalReceita > 0 ? Math.min(100, (receivedRevenue / totalReceita) * 100) : 0

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Stat
        label="Receita do mês"
        value={totalReceita}
        icon={ArrowUpRight}
        accent="bg-primary/15 text-primary"
        hint={`${formatCurrency(receivedRevenue)} recebido`}
        sub={<Progress value={receivedPct} className="h-1.5 [&>div]:bg-primary" />}
      />
      <Stat
        label="Despesa do mês"
        value={totalDespesa}
        icon={ArrowDownRight}
        accent="bg-destructive/15 text-destructive"
        hint={`${formatCurrency(paidExpense)} pago`}
        sub={<Progress value={paidPct} className="h-1.5 [&>div]:bg-destructive" />}
      />
      <Stat
        label="Saldo projetado"
        value={projectedNet}
        icon={Scale}
        accent={projectedNet >= 0 ? 'bg-primary/15 text-primary' : 'bg-destructive/15 text-destructive'}
        hint="Receita menos despesa prevista"
      />
      <Stat
        label="Saldo realizado"
        value={actualNet}
        icon={Wallet}
        accent={actualNet >= 0 ? 'bg-primary/15 text-primary' : 'bg-destructive/15 text-destructive'}
        hint={`${formatCurrency(pendingExpense)} ainda a pagar`}
      />
    </div>
  )
}
