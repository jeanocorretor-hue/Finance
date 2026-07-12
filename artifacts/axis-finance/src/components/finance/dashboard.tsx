import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useFinance } from '@/lib/finance-store'
import { CardsPanel } from './cards-panel'
import { ExpensesPanel } from './expenses-panel'
import { MonthSwitcher } from './month-switcher'
import { RevenuesPanel } from './revenues-panel'
import { SummaryCards } from './summary-cards'
import { TrendChart } from './trend-chart'

export function Dashboard() {
  const { resetToSeed } = useFinance()
  const [confirming, setConfirming] = useState(false)

  function handleReset() {
    if (!confirming) {
      setConfirming(true)
      setTimeout(() => setConfirming(false), 3000)
      return
    }
    resetToSeed()
    setConfirming(false)
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="flex size-9 items-center justify-center rounded-xl bg-primary font-mono text-lg font-bold text-primary-foreground"
            >
              A
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold">Axis Finance</p>
              <p className="text-xs text-muted-foreground">
                Controle financeiro pessoal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className={
                confirming
                  ? 'h-8 text-destructive hover:bg-destructive/10 hover:text-destructive'
                  : 'h-8 text-muted-foreground hover:text-foreground'
              }
              title="Restaurar dados de demonstração"
            >
              <RotateCcw className="size-3.5" />
              <span className="hidden sm:inline">
                {confirming ? 'Confirmar reset?' : 'Resetar dados'}
              </span>
            </Button>
            <MonthSwitcher />
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6">
        <SummaryCards />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="flex flex-col gap-4 lg:col-span-2">
            <TrendChart />
            <ExpensesPanel />
          </div>
          <div className="flex flex-col gap-4">
            <RevenuesPanel />
            <CardsPanel />
          </div>
        </div>

        <footer className="pt-2 text-center text-xs text-muted-foreground">
          Dados salvos automaticamente no navegador · valores em BRL
        </footer>
      </main>
    </div>
  )
}
