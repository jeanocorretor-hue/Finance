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
  iconBg: string
  iconColor: string
  cardBorderClass?: string
  bgGradient?: string
  valueClass?: string
  sub?: React.ReactNode
}

function Stat({
  label,
  value,
  icon: Icon,
  iconBg,
  iconColor,
  cardBorderClass,
  bgGradient,
  valueClass,
  sub,
}: StatProps) {
  return (
    <Card
      className={cn(
        'relative flex flex-col justify-between gap-3 overflow-hidden p-5 shadow-xs transition-all hover:shadow-md',
        cardBorderClass,
        bgGradient
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span
          className={cn(
            'flex size-9 items-center justify-center rounded-xl shadow-xs transition-transform hover:scale-105',
            iconBg,
            iconColor
          )}
        >
          <Icon className="size-4.5 stroke-[2.5]" />
        </span>
      </div>
      <div>
        <p
          className={cn(
            'font-mono text-2xl font-bold tracking-tight tabular-nums',
            valueClass || 'text-foreground'
          )}
        >
          {formatCurrency(value)}
        </p>
      </div>
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
    <div className="mt-1 flex flex-col gap-2">
      <Progress value={pct} className={cn('h-2 rounded-full bg-slate-100 dark:bg-slate-800', progressClass)} />
      <div className="flex flex-col gap-1 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="capitalize">{doneLabel}</span>
          </div>
          <span className="font-mono font-medium text-foreground tabular-nums">
            {formatCurrency(doneValue)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Clock
              className={cn(
                'size-3.5',
                hasPending ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'
              )}
            />
            <span
              className={cn(
                'capitalize',
                hasPending ? 'font-medium text-amber-700 dark:text-amber-300' : 'text-muted-foreground'
              )}
            >
              {pendingLabel}
            </span>
          </div>
          <span
            className={cn(
              'font-mono font-semibold tabular-nums',
              hasPending ? 'text-amber-700 dark:text-amber-400' : 'text-foreground'
            )}
          >
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
      {/* Receita do mês */}
      <Stat
        label="Receita do mês"
        value={totalReceita}
        icon={ArrowUpRight}
        iconBg="bg-emerald-500"
        iconColor="text-white"
        cardBorderClass="border-emerald-500/30 hover:border-emerald-500/60"
        bgGradient="bg-gradient-to-br from-emerald-500/8 via-card to-card"
        valueClass="text-emerald-700 dark:text-emerald-400"
        sub={
          <SplitRow
            doneLabel="recebido"
            doneValue={receivedRevenue}
            pendingLabel="a receber"
            pendingValue={pendingRevenue}
            pct={receivedPct}
            progressClass="[&>div]:bg-emerald-500"
          />
        }
      />

      {/* Despesa do mês */}
      <Stat
        label="Despesa do mês"
        value={totalDespesa}
        icon={ArrowDownRight}
        iconBg="bg-rose-500"
        iconColor="text-white"
        cardBorderClass="border-rose-500/30 hover:border-rose-500/60"
        bgGradient="bg-gradient-to-br from-rose-500/8 via-card to-card"
        valueClass="text-rose-700 dark:text-rose-400"
        sub={
          <SplitRow
            doneLabel="pago"
            doneValue={paidExpense}
            pendingLabel="a pagar"
            pendingValue={pendingExpense}
            pct={paidPct}
            progressClass="[&>div]:bg-rose-500"
            pendingHighlight
          />
        }
      />

      {/* Saldo projetado */}
      <Stat
        label="Saldo projetado"
        value={projectedNet}
        icon={Scale}
        iconBg={projectedNet >= 0 ? 'bg-blue-600' : 'bg-rose-500'}
        iconColor="text-white"
        cardBorderClass={
          projectedNet >= 0
            ? 'border-blue-500/30 hover:border-blue-500/60'
            : 'border-rose-500/30 hover:border-rose-500/60'
        }
        bgGradient={
          projectedNet >= 0
            ? 'bg-gradient-to-br from-blue-500/8 via-card to-card'
            : 'bg-gradient-to-br from-rose-500/8 via-card to-card'
        }
        valueClass={
          projectedNet >= 0
            ? 'text-blue-700 dark:text-blue-400'
            : 'text-rose-700 dark:text-rose-400'
        }
        sub={
          <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/60">
            <span>Previsão de fechamento</span>
            <span
              className={cn(
                'font-semibold',
                projectedNet >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600'
              )}
            >
              {projectedNet >= 0 ? 'Positivo' : 'Negativo'}
            </span>
          </div>
        }
      />

      {/* Saldo de caixa */}
      <Stat
        label="Saldo de caixa"
        value={actualNet}
        icon={Wallet}
        iconBg={actualNet >= 0 ? 'bg-violet-600' : 'bg-rose-500'}
        iconColor="text-white"
        cardBorderClass={
          actualNet >= 0
            ? 'border-violet-500/30 hover:border-violet-500/60'
            : 'border-rose-500/30 hover:border-rose-500/60'
        }
        bgGradient={
          actualNet >= 0
            ? 'bg-gradient-to-br from-violet-500/8 via-card to-card'
            : 'bg-gradient-to-br from-rose-500/8 via-card to-card'
        }
        valueClass={
          actualNet >= 0
            ? 'text-violet-700 dark:text-violet-400'
            : 'text-rose-700 dark:text-rose-400'
        }
        sub={
          <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/60">
            <span>Recebido − Pago no mês</span>
            <span
              className={cn(
                'font-semibold',
                actualNet >= 0 ? 'text-violet-600 dark:text-violet-400' : 'text-rose-600'
              )}
            >
              {actualNet >= 0 ? 'Em dia' : 'Déficit'}
            </span>
          </div>
        }
      />
    </div>
  )
}
