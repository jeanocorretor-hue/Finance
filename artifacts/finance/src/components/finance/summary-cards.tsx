import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
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
  iconAccent: string
  valueClass?: string
  sub?: React.ReactNode
}

function Stat({ label, value, icon: Icon, iconAccent, valueClass, sub }: StatProps) {
  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={cn('flex size-8 items-center justify-center rounded-lg', iconAccent)}>
          <Icon className="size-4" />
        </span>
      </div>
      <p className={cn('font-mono text-2xl font-semibold tracking-tight tabular-nums', valueClass)}>
        {formatCurrency(value)}
      </p>
      {sub}
    </Card>
  )
}

interface SplitRowProps {
  doneLabel: string
  doneValue: number
  pendingLabel: string
  pendingValue: number
  pct: number
  progressClass: string
  pendingHighlight?: boolean
}

function SplitRow({
  doneLabel,
  doneValue,
  pendingLabel,
  pendingValue,
  pct,
  progressClass,
  pendingHighlight,
}: SplitRowProps) {
  const hasPending = pendingHighlight && pendingValue > 0
  return (
    <div className="mt-auto flex flex-col gap-2">
      <Progress value={pct} className={cn('h-1.5', progressClass)} />
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="size-3 shrink-0 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{doneLabel}</span>
          </div>
          <span className="font-mono text-xs font-medium tabular-nums">
            {formatCurrency(doneValue)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Clock className={cn('size-3 shrink-0', hasPending ? 'text-amber-400' : 'text-muted-foreground')} />
            <span className={cn('text-xs', hasPending ? 'text-amber-400' : 'text-muted-foreground')}>
              {pendingLabel}
            </span>
          </div>
          <span className={cn('font-mono text-xs font-medium tabular-nums', hasPending ? 'text-amber-400' : '')}>
            {formatCurrency(pendingValue)}
          </span>
        </div>
      </div>
    </div>
  )
}

export function SummaryCards() {
  const { summary } = useFinance()
  const {
    totalReceita,
    totalDespesa,
    projectedNet,
    actualNet,
    receivedRevenue,
    paidExpense,
    pendingExpense,
    pendingRevenue,
  } = summary

  const paidPct = totalDespesa > 0 ? Math.min(100, (paidExpense / totalDespesa) * 100) : 0
  const receivedPct = totalReceita > 0 ? Math.min(100, (receivedRevenue / totalReceita) * 100) : 0

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Stat
        label="Receita do mês"
        value={totalReceita}
        icon={ArrowUpRight}
        iconAccent="bg-primary/15 text-primary"
        sub={
          <SplitRow
            doneLabel="recebido"
            doneValue={receivedRevenue}
            pendingLabel="a receber"
            pendingValue={pendingRevenue}
            pct={receivedPct}
            progressClass="[&>div]:bg-primary"
          />
        }
      />

      <Stat
        label="Despesa do mês"
        value={totalDespesa}
        icon={ArrowDownRight}
        iconAccent="bg-destructive/15 text-destructive"
        sub={
          <SplitRow
            doneLabel="pago"
            doneValue={paidExpense}
            pendingLabel="a pagar"
            pendingValue={pendingExpense}
            pct={paidPct}
            progressClass="[&>div]:bg-destructive"
            pendingHighlight
          />
        }
      />

      <Stat
        label="Saldo projetado"
        value={projectedNet}
        icon={Scale}
        iconAccent={projectedNet >= 0 ? 'bg-primary/15 text-primary' : 'bg-destructive/15 text-destructive'}
        valueClass={projectedNet < 0 ? 'text-destructive' : undefined}
        sub={
          <p className="mt-auto text-xs text-muted-foreground">
            Receita total menos despesa total prevista
          </p>
        }
      />

      <Stat
        label="Saldo de caixa"
        value={actualNet}
        icon={Wallet}
        iconAccent={actualNet >= 0 ? 'bg-primary/15 text-primary' : 'bg-destructive/15 text-destructive'}
        valueClass={actualNet < 0 ? 'text-destructive' : undefined}
        sub={
          <p className="mt-auto text-xs text-muted-foreground">
            Receita recebida menos despesas pagas
          </p>
        }
      />
    </div>
  )
}
