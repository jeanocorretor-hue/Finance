import { useState } from 'react'
import { Loader2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useFinance } from '@/lib/finance-store'
import { CardsPanel } from './cards-panel'
import { ExpensesPanel } from './expenses-panel'
import { MonthSwitcher } from './month-switcher'
import { RevenuesPanel } from './revenues-panel'
import { SummaryCards } from './summary-cards'
import { TrendChart } from './trend-chart'
import { PluggyPanel } from './pluggy-panel'
import { ThemeToggle } from '@/components/theme-toggle'

export function Dashboard() {
  const { loading, resetToSeed } = useFinance()
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
              className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 font-mono text-lg font-bold text-white shadow-xs shadow-emerald-500/20"
            >
              F
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold">Finance</p>
              <p className="text-xs text-muted-foreground">Controle financeiro pessoal</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              disabled={loading}
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
            <ThemeToggle />
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex h-[calc(100vh-57px)] items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          <span className="text-sm">Carregando dados…</span>
        </div>
      ) : (
        <main className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6">
          <SummaryCards />
          <PluggyPanel />

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
            Dados salvos no banco de dados · valores em BRL
          </footer>
        </main>
      )}
    </div>
  )
}
