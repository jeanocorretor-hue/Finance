import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card } from '@/components/ui/card'
import { useFinance } from '@/lib/finance-store'
import { formatCurrency, formatCurrencyCompact, formatMonthLong, formatMonthShort } from '@/lib/format'

interface TooltipEntry {
  name: string
  value: number
  color: string
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { payload: { mes_ref: string }; dataKey: string; value: number }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  const mesRef = payload[0]?.payload.mes_ref ?? label ?? ''
  const receita = payload.find((p) => p.dataKey === 'total_receita')?.value ?? 0
  const despesa = payload.find((p) => p.dataKey === 'total_despesa')?.value ?? 0
  const rows: TooltipEntry[] = [
    { name: 'Receita', value: receita, color: 'var(--color-primary)' },
    { name: 'Despesa', value: despesa, color: 'var(--color-destructive)' },
    { name: 'Saldo', value: receita - despesa, color: 'var(--color-foreground)' },
  ]
  return (
    <div className="rounded-xl border border-border bg-popover/95 p-3 text-xs shadow-xl backdrop-blur">
      <p className="mb-2 font-medium">{formatMonthLong(mesRef)}</p>
      <div className="flex flex-col gap-1.5">
        {rows.map((r) => (
          <div key={r.name} className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="size-2 rounded-full" style={{ backgroundColor: r.color }} />
              {r.name}
            </span>
            <span className="font-mono tabular-nums">{formatCurrency(r.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function TrendChart() {
  const { trend, month } = useFinance()
  const currentLabel = useMemo(() => formatMonthShort(month), [month])

  return (
    <Card className="gap-4 p-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-medium">Receita x Despesa</h2>
          <p className="text-xs text-muted-foreground">Série mensal projetada (12 meses)</p>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <span className="size-2.5 rounded-full bg-emerald-500 shadow-xs" />
            Receita
          </span>
          <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
            <span className="size-2.5 rounded-full bg-rose-500 shadow-xs" />
            Despesa
          </span>
        </div>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="fillReceita" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="fillDespesa" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 3" />
            <XAxis
              dataKey="mes_ref"
              tickFormatter={formatMonthShort}
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              tick={{ fill: 'var(--color-muted-foreground)', fontSize: 11 }}
            />
            <YAxis
              tickFormatter={(v) => formatCurrencyCompact(v as number)}
              tickLine={false}
              axisLine={false}
              width={64}
              tick={{ fill: 'var(--color-muted-foreground)', fontSize: 11 }}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--color-border)', strokeWidth: 1 }} />
            <ReferenceLine
              x={month}
              stroke="#64748b"
              strokeOpacity={0.5}
              strokeDasharray="4 4"
              label={{ value: currentLabel, position: 'top', fill: '#64748b', fontSize: 10 }}
            />
            <Area type="monotone" dataKey="total_receita" stroke="#10b981" strokeWidth={2.5} fill="url(#fillReceita)" />
            <Area type="monotone" dataKey="total_despesa" stroke="#ef4444" strokeWidth={2.5} fill="url(#fillDespesa)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
