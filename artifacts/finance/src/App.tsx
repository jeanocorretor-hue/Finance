import { FinanceProvider } from '@/lib/finance-store'
import { Dashboard } from '@/components/finance/dashboard'

function App() {
  return (
    <FinanceProvider>
      <Dashboard />
    </FinanceProvider>
  )
}

export default App
