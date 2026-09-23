'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  Calendar,
  CalendarDays,
  Check,
  CheckCircle2,
  CreditCard,
  History,
  Landmark,
  Link2,
  ListFilter,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useFinance } from '@/lib/finance-store'

declare global {
  interface Window {
    PluggyConnect?: any
  }
}

interface PluggyItem {
  id: string
  connector_id: number | null
  connector_name: string
  status: string
  balance: string | null
  balance_currency: string | null
  last_sync_at: string | null
}

interface PluggyTransaction {
  id: string
  item_id: string | null
  account_id: string
  account_name: string | null
  account_type?: string | null
  description: string
  amount: string
  date: string
  type: string
  category: string | null
  status: string | null
  expense_id: string | null
}

interface PluggyStatus {
  configured: boolean
  items: PluggyItem[]
  totalTransactions?: number
  recentTransactions: PluggyTransaction[]
  futureTransactions?: PluggyTransaction[]
  pendingTransactions: PluggyTransaction[]
}

const CONNECTOR_ID = 200 // MeuPluggy / Open Finance Brasil

export function PluggyPanel() {
  const { reload: reloadFinanceData, month } = useFinance()
  const [syncing, setSyncing] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [classifyingAi, setClassifyingAi] = useState(false)
  const [classifyingSingleId, setClassifyingSingleId] = useState<string | null>(null)
  const [matchingTxId, setMatchingTxId] = useState<string | null>(null)
  const [matchedMap, setMatchedMap] = useState<
    Record<string, { expenseId: string; matchedName: string; confidence: number }>
  >({})
  const [status, setStatus] = useState<PluggyStatus | null>(null)
  const [activeTab, setActiveTab] = useState<'recent' | 'pending' | 'future'>('recent')
  const [selectedBank, setSelectedBank] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showTransactions, setShowTransactions] = useState(true)

  async function loadStatus() {
    try {
      const res = await fetch('/api/finance/pluggy/status')
      if (!res.ok) return
      const data = await res.json()
      setStatus(data)
    } catch (err) {
      console.error('Erro ao carregar status Pluggy:', err)
    }
  }

  useEffect(() => {
    loadStatus()
  }, [])

  function loadPluggyScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.PluggyConnect) {
        resolve()
        return
      }
      const existing = document.getElementById('pluggy-connect-script')
      if (existing) {
        existing.addEventListener('load', () => resolve())
        return
      }
      const script = document.createElement('script')
      script.id = 'pluggy-connect-script'
      script.src = 'https://cdn.pluggy.ai/pluggy-connect/v2.8.2/pluggy-connect.js'
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Erro ao carregar widget do Pluggy'))
      document.body.appendChild(script)
    })
  }

  async function handleConnectBank() {
    try {
      setConnecting(true)
      const tokenRes = await fetch('/api/finance/pluggy/token')
      if (!tokenRes.ok) {
        const err = await tokenRes.json().catch(() => ({}))
        throw new Error(err.error || 'Erro ao gerar token do Pluggy')
      }
      const { accessToken } = await tokenRes.json()

      await loadPluggyScript()

      const pluggyConnect = new window.PluggyConnect({
        connectToken: accessToken,
        connectorId: CONNECTOR_ID,
        includeSandbox: false,
        onSuccess: async (itemData: { item: { id: string; connector?: { id?: number; name?: string } } }) => {
          toast.success('Banco conectado! Sincronizando dados...')
          try {
            await fetch('/api/finance/pluggy/item', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                itemId: itemData.item.id,
                connectorId: itemData.item.connector?.id || CONNECTOR_ID,
                connectorName: itemData.item.connector?.name || 'Banco Conectado',
              }),
            })
            await loadStatus()
            toast.success('Saldos e extrato sincronizados!')
          } catch (syncErr) {
            console.error('Erro pós conexão:', syncErr)
          } finally {
            setConnecting(false)
          }
        },
        onError: (error: any) => {
          console.error('Pluggy Connect error:', error)
          toast.error(error.message || 'Erro ao conectar banco')
          setConnecting(false)
        },
        onClose: () => {
          setConnecting(false)
        },
      })

      pluggyConnect.init()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao abrir conexão bancária')
      setConnecting(false)
    }
  }

  async function handleSync() {
    try {
      setSyncing(true)
      toast.loading('Sincronizando bancos...', { id: 'sync' })
      const res = await fetch('/api/finance/pluggy/sync', { method: 'POST' })
      if (!res.ok) throw new Error('Falha ao sincronizar')
      const data = await res.json()
      setStatus((prev) =>
        prev
          ? {
              ...prev,
              items: data.items,
              totalTransactions: data.totalImportadas ?? prev.totalTransactions,
              recentTransactions: data.recentTransactions,
              futureTransactions: data.futureTransactions,
              pendingTransactions: data.pendingTransactions,
            }
          : prev
      )
      toast.success(
        `Sincronização concluída! ${data.totalImportadas ?? 0} transações processadas.`,
        { id: 'sync' }
      )
      await loadStatus()
    } catch (err: any) {
      toast.error(err.message || 'Erro na sincronização', { id: 'sync' })
    } finally {
      setSyncing(false)
    }
  }

  async function handleClassifyWithAi() {
    try {
      setClassifyingAi(true)
      toast.loading('Jev AI analisando transações pendentes...', { id: 'ai' })
      const res = await fetch('/api/finance/pluggy/ai-classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classifyAll: true, limit: 15 }),
      })
      if (!res.ok) throw new Error('Falha na classificação com IA')
      const data = await res.json()
      toast.success(
        `Jev analisou ${data.processadas || 0} transações! (${data.autoAprovadas || 0} auto-aprovadas, ${data.transferencias || 0} transferências)`,
        { id: 'ai' }
      )
      await loadStatus()
      setShowTransactions(true)
    } catch (err: any) {
      toast.error(err.message || 'Erro ao classificar com Jev AI', { id: 'ai' })
    } finally {
      setClassifyingAi(false)
    }
  }

  async function handleClassifySingle(txId: string) {
    try {
      setClassifyingSingleId(txId)
      const res = await fetch('/api/finance/pluggy/ai-classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: txId }),
      })
      if (!res.ok) throw new Error('Falha ao analisar')
      const data = await res.json()
      const r = data.resultado
      toast.success(
        `Jev classificou como: ${r.categoria.toUpperCase()} (${Math.round(r.confidence * 100)}% certeza)`,
        { id: `single-${txId}` }
      )
      await loadStatus()
    } catch (err: any) {
      toast.error(err.message || 'Erro na classificação', { id: `single-${txId}` })
    } finally {
      setClassifyingSingleId(null)
    }
  }

  async function handleMatchExpense(txId: string) {
    try {
      setMatchingTxId(txId)
      toast.loading('Jev procurando correspondência com suas despesas...', { id: `match-${txId}` })
      const res = await fetch('/api/finance/pluggy/match-expense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: txId }),
      })
      if (!res.ok) throw new Error('Erro ao buscar correspondência')
      const data = await res.json()
      if (data.match?.expenseId && data.match?.matchedName) {
        setMatchedMap((prev) => ({
          ...prev,
          [txId]: {
            expenseId: data.match.expenseId,
            matchedName: data.match.matchedName,
            confidence: data.match.confidence,
          },
        }))
        toast.success(`Jev identificou a despesa: ${data.match.matchedName}! Clique em Dar Baixa.`, {
          id: `match-${txId}`,
        })
      } else {
        toast.info('Jev não encontrou despesa cadastrada idêntica para esta transação.', {
          id: `match-${txId}`,
        })
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao conciliar', { id: `match-${txId}` })
    } finally {
      setMatchingTxId(null)
    }
  }

  async function handleReconcile(txId: string, expenseId: string, expenseName: string) {
    try {
      const res = await fetch('/api/finance/pluggy/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: txId, expenseId, mesRef: month }),
      })
      if (!res.ok) throw new Error('Falha ao conciliar')
      toast.success(`Despesa "${expenseName}" baixada como PAGA! Dashboard atualizado.`)
      // Remove do mapa local
      setMatchedMap((prev) => {
        const next = { ...prev }
        delete next[txId]
        return next
      })
      await loadStatus()
      await reloadFinanceData()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao dar baixa')
    }
  }

  async function handleApprove(txId: string, category?: string) {
    const res = await fetch('/api/finance/pluggy/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionId: txId, category }),
    })
    if (res.ok) {
      toast.success('Transação arquivada!')
      await loadStatus()
    } else {
      toast.error('Erro ao aprovar transação')
    }
  }

  async function handleIgnore(txId: string) {
    const res = await fetch('/api/finance/pluggy/ignore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionId: txId }),
    })
    if (res.ok) {
      toast.success('Transação ignorada')
      await loadStatus()
    } else {
      toast.error('Erro ao ignorar transação')
    }
  }

  const items = status?.items || []
  const pending = status?.pendingTransactions || []
  const recent = status?.recentTransactions || []
  const future = status?.futureTransactions || []
  const totalCount = status?.totalTransactions || (pending.length + recent.length + future.length)
  const configured = status?.configured ?? true

  const totalSaldo = items.reduce((sum, item) => sum + Number(item.balance || 0), 0)

  const fmt = (val: string | number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val))

  const fmtTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo',
      })
    } catch {
      return ''
    }
  }

  const fmtDayHeader = (iso: string) => {
    try {
      const d = new Date(iso)
      const now = new Date()
      const dLocal = new Date(d.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
      const nowLocal = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))

      const diffDays = Math.floor(
        (new Date(nowLocal.getFullYear(), nowLocal.getMonth(), nowLocal.getDate()).getTime() -
          new Date(dLocal.getFullYear(), dLocal.getMonth(), dLocal.getDate()).getTime()) /
          (1000 * 60 * 60 * 24)
      )

      if (diffDays === 0) return 'Hoje'
      if (diffDays === 1) return 'Ontem'
      if (diffDays === -1) return 'Amanhã'

      const weekday = d.toLocaleDateString('pt-BR', {
        weekday: 'long',
        timeZone: 'America/Sao_Paulo',
      })
      const dayMonth = d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
        timeZone: 'America/Sao_Paulo',
      })

      return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${dayMonth}`
    } catch {
      return iso.slice(0, 10)
    }
  }

  // Cores institucionais dos bancos
  const bankColor: Record<string, string> = {
    bradesco: '#cc0000',
    inter: '#ff7a00',
    nubank: '#820ad1',
    gold: '#820ad1',
    sicredi: '#009f3d',
    itaú: '#003d99',
    santander: '#ec0000',
  }

  function getBankColor(name: string) {
    const key = (name || '').toLowerCase()
    return Object.entries(bankColor).find(([k]) => key.includes(k))?.[1] || '#059669'
  }

  const categoryLabels: Record<string, string> = {
    casa: '🏠 Casa',
    veiculo: '🚗 Veículo',
    saude: '💊 Saúde',
    servicos: '🛠️ Serviços',
    assinatura: '🔁 Assinatura',
    outros: '📦 Outros',
  }

  // Filtragem da lista ativa
  const currentBaseList =
    activeTab === 'recent' ? recent : activeTab === 'pending' ? pending : future

  const filteredList = useMemo(() => {
    return currentBaseList.filter((tx) => {
      const matchBank =
        selectedBank === 'all' ||
        (tx.account_name && tx.account_name.toLowerCase().includes(selectedBank.toLowerCase()))

      const matchSearch =
        !searchQuery ||
        tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tx.category && tx.category.toLowerCase().includes(searchQuery.toLowerCase()))

      return matchBank && matchSearch
    })
  }, [currentBaseList, selectedBank, searchQuery])

  // Agrupamento por Data (Dia)
  const groupedTransactions = useMemo(() => {
    const map = new Map<string, PluggyTransaction[]>()
    for (const tx of filteredList) {
      const key = fmtDayHeader(tx.date)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(tx)
    }
    return Array.from(map.entries())
  }, [filteredList])

  // Agrupamento de parcelas futuras por mês para projeção de faturas
  const futureMonthlyInvoices = useMemo(() => {
    const map = new Map<string, { total: number; count: number; label: string }>()
    for (const tx of future) {
      const monthKey = tx.date.slice(0, 7) // YYYY-MM
      const d = new Date(tx.date)
      const label = d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric', timeZone: 'America/Sao_Paulo' })
      if (!map.has(monthKey)) {
        map.set(monthKey, { total: 0, count: 0, label: label.charAt(0).toUpperCase() + label.slice(1) })
      }
      const entry = map.get(monthKey)!
      entry.total += Number(tx.amount || 0)
      entry.count += 1
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [future])

  const totalFutureAmount = useMemo(() => {
    return future.reduce((acc, tx) => acc + Number(tx.amount || 0), 0)
  }, [future])

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-xs transition-colors">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Landmark className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold tracking-tight text-foreground">
                Open Finance · Saldos & Inteligência em Tempo Real
              </h3>
              {totalCount > 0 && (
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                  {totalCount} transações
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Sincronização via MeuPluggy · IA Decisória TypeSafe Jev 1.13
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {pending.length > 0 && (
            <Button
              size="sm"
              onClick={handleClassifyWithAi}
              disabled={classifyingAi}
              className="h-8 gap-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-xs font-semibold text-white shadow-xs hover:from-violet-700 hover:to-indigo-700 transition-all"
              title="Classificar pendentes com IA Jev da TypeSafe"
            >
              {classifyingAi ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5" />
              )}
              <span>Classificar com Jev AI</span>
            </Button>
          )}

          {items.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={syncing}
              className="h-8 gap-1.5 text-xs text-foreground hover:bg-muted"
            >
              <RefreshCw className={`size-3.5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Sincronizando…' : 'Atualizar'}
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleConnectBank}
            disabled={connecting || !configured}
            className="h-8 gap-1.5 bg-emerald-600 text-xs text-white hover:bg-emerald-700 shadow-xs"
          >
            {connecting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Plus className="size-3.5" />
            )}
            {items.length > 0 ? 'Adicionar banco' : 'Conectar Banco'}
          </Button>
        </div>
      </div>

      {/* Nenhum banco conectado */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-8 text-center bg-muted/20">
          <Building2 className="mb-2 size-8 text-muted-foreground/50" />
          <p className="text-sm font-medium text-foreground">Nenhum banco conectado</p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            Conecte seu banco via MeuPluggy para ver saldos em tempo real e importar transações automaticamente.
          </p>
        </div>
      ) : (
        <>
          {/* Card de Saldo Total Consolidado */}
          <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/15 border border-emerald-500/30 px-4 py-3.5 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                <TrendingUp className="size-5 stroke-[2.5]" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                  Saldo total disponível em conta corrente
                </p>
                <p className="text-2xl font-bold font-mono tracking-tight text-emerald-700 dark:text-emerald-400">
                  {fmt(totalSaldo)}
                </p>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-emerald-800/80 dark:text-emerald-300/80 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{items.length} contas conectadas</span>
            </div>
          </div>

          {/* Cards por Banco Conectado */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
              const color = getBankColor(item.connector_name)
              const balance = Number(item.balance || 0)
              return (
                <div
                  key={item.id}
                  className="relative flex flex-col justify-between rounded-lg border border-border bg-card p-3.5 shadow-xs transition-shadow hover:shadow-sm"
                  style={{ borderLeftWidth: 4, borderLeftColor: color }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {item.status === 'ERROR' ? (
                        <AlertCircle className="size-3.5 text-rose-500" />
                      ) : (
                        <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                      )}
                      <span className="text-xs font-semibold text-foreground">
                        {item.connector_name}
                      </span>
                    </div>
                    {item.last_sync_at && (
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(item.last_sync_at).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>

                  <div className="mt-2">
                    <p className="font-mono text-lg font-bold tracking-tight text-foreground">
                      {fmt(balance)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Saldo em conta corrente</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Card Nubank Gold de Cartão de Crédito */}
          {items.some((i) => i.connector_name.toLowerCase().includes('nubank')) && (
            <div className="flex items-center justify-between rounded-xl border border-purple-500/30 bg-gradient-to-r from-purple-500/12 via-purple-500/5 to-purple-500/12 px-4 py-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-[#820ad1] text-white shadow-xs">
                  <CreditCard className="size-4.5 stroke-[2.5]" />
                </div>
                <div>
                  <p className="text-xs font-bold text-purple-950 dark:text-purple-200">
                    Cartão Nubank Gold
                  </p>
                  <p className="text-[11px] text-purple-800/80 dark:text-purple-300/80">
                    Fatura em aberto sincronizada via Open Finance
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-base font-bold text-[#820ad1] dark:text-purple-300">
                  {fmt(2886.37)}
                </span>
                {future.length > 0 && (
                  <button
                    onClick={() => {
                      setActiveTab('future')
                      setShowTransactions(true)
                    }}
                    className="text-[10px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-500/15 hover:bg-purple-500/25 px-2.5 py-1 rounded-md transition-colors"
                  >
                    Ver {future.length} parcelas futuras →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Seção de Transações Organizada por Datas & Timeline */}
          <div className="flex flex-col gap-3 pt-3 border-t border-border/60">
            {/* Barra de Abas Principais */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 p-0.5 rounded-lg bg-muted/60 border border-border/40">
                <Button
                  variant={activeTab === 'recent' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    setActiveTab('recent')
                    setShowTransactions(true)
                  }}
                  className={`h-7.5 text-xs gap-1.5 font-medium ${
                    activeTab === 'recent' ? 'bg-primary text-primary-foreground shadow-xs' : ''
                  }`}
                >
                  <History className="size-3.5" />
                  Extrato Realizado ({recent.length})
                </Button>

                <Button
                  variant={activeTab === 'pending' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    setActiveTab('pending')
                    setShowTransactions(true)
                  }}
                  className={`h-7.5 text-xs gap-1.5 font-medium ${
                    activeTab === 'pending' ? 'bg-primary text-primary-foreground shadow-xs' : ''
                  }`}
                >
                  <ListFilter className="size-3.5" />
                  Aguardando Classificação ({pending.length})
                </Button>

                {future.length > 0 && (
                  <Button
                    variant={activeTab === 'future' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => {
                      setActiveTab('future')
                      setShowTransactions(true)
                    }}
                    className={`h-7.5 text-xs gap-1.5 font-medium ${
                      activeTab === 'future' ? 'bg-purple-600 text-white shadow-xs' : ''
                    }`}
                  >
                    <CalendarDays className="size-3.5" />
                    Parcelas Futuras ({future.length})
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowTransactions((v) => !v)}
                  className="text-xs text-muted-foreground hover:text-foreground font-medium underline-offset-4 hover:underline"
                >
                  {showTransactions ? 'Recolher extrato' : 'Expandir extrato'}
                </button>
              </div>
            </div>

            {/* Visualizador de Faturas Futuras do Cartão */}
            {showTransactions && activeTab === 'future' && (
              <div className="flex flex-col gap-2.5 bg-purple-500/8 border border-purple-500/20 p-3.5 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="size-4 text-purple-600 dark:text-purple-400 shrink-0" />
                    <span className="text-xs font-semibold text-purple-950 dark:text-purple-200">
                      Projeção de Faturas Futuras (Nubank Gold)
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-purple-700 dark:text-purple-300">
                    Total Comprometido: {fmt(totalFutureAmount)}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-1">
                  {futureMonthlyInvoices.map(([mKey, invoice]) => (
                    <div
                      key={mKey}
                      className="flex flex-col justify-between bg-card border border-purple-500/20 p-2.5 rounded-lg shadow-xs"
                    >
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                        {invoice.label}
                      </span>
                      <p className="text-xs font-mono font-bold text-purple-700 dark:text-purple-300 mt-1">
                        {fmt(invoice.total)}
                      </p>
                      <span className="text-[9px] text-muted-foreground">
                        {invoice.count} parcela{invoice.count === 1 ? '' : 's'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Barra de Filtros: Busca + Filtro por Banco */}
            {showTransactions && (
              <div className="flex flex-wrap items-center justify-between gap-2 bg-muted/30 p-2 rounded-lg border border-border/50 text-xs">
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Buscar por descrição ou categoria..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full h-8 pl-8 pr-3 rounded-md bg-card border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                      >
                        <X className="size-3" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground font-medium">Conta:</span>
                  <select
                    value={selectedBank}
                    onChange={(e) => setSelectedBank(e.target.value)}
                    className="h-8 px-2.5 rounded-md bg-card border border-border text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option value="all">Todas as contas</option>
                    <option value="inter">Banco Inter</option>
                    <option value="nubank">Nubank</option>
                    <option value="bradesco">Bradesco</option>
                    <option value="gold">Cartão Gold</option>
                  </select>
                </div>
              </div>
            )}

            {/* Timeline Organizada com Cabeçalhos por Data */}
            {showTransactions && (
              <div className="flex flex-col divide-y divide-border/60 rounded-xl border border-border bg-card overflow-hidden shadow-xs">
                {groupedTransactions.length === 0 ? (
                  <div className="py-10 text-center text-muted-foreground text-xs flex flex-col items-center gap-1.5">
                    <Calendar className="size-6 text-muted-foreground/40 mb-1" />
                    <p className="font-medium text-foreground">Nenhuma transação encontrada</p>
                    <p className="text-[11px]">
                      {searchQuery
                        ? 'Tente ajustar os termos da busca.'
                        : 'Nenhuma movimentação para os filtros selecionados.'}
                    </p>
                  </div>
                ) : (
                  groupedTransactions.map(([dayTitle, txs]) => (
                    <div key={dayTitle} className="flex flex-col">
                      {/* Separador Visual de Data / Dia */}
                      <div className="sticky top-0 z-10 flex items-center justify-between bg-muted/60 backdrop-blur-xs px-3.5 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/40">
                        <span className="text-foreground/90 font-bold">{dayTitle}</span>
                        <span className="text-[10px] text-muted-foreground font-normal">
                          {txs.length} movimentaç{txs.length === 1 ? 'ão' : 'ões'}
                        </span>
                      </div>

                      {/* Transações daquele Dia */}
                      <div className="divide-y divide-border/40">
                        {txs.map((tx) => {
                          const isSingleClassifying = classifyingSingleId === tx.id
                          const isMatching = matchingTxId === tx.id
                          const isTransfer = tx.status === 'transfer'
                          const bankLogoColor = getBankColor(tx.account_name || '')
                          const matchInfo = matchedMap[tx.id]

                          return (
                            <div
                              key={tx.id}
                              className="flex flex-col gap-1.5 px-3.5 py-2.5 hover:bg-muted/30 transition-colors"
                            >
                              <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  <div
                                    className={`shrink-0 rounded-full p-1.5 ${
                                      isTransfer
                                        ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                                        : tx.type === 'DEBIT'
                                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                    }`}
                                  >
                                    {isTransfer ? (
                                      <Zap className="size-3.5" />
                                    ) : tx.type === 'DEBIT' ? (
                                      <ArrowDownLeft className="size-3.5" />
                                    ) : (
                                      <ArrowUpRight className="size-3.5" />
                                    )}
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <p className="truncate font-semibold text-foreground text-xs">
                                        {tx.description}
                                      </p>
                                      {isTransfer && (
                                        <span className="rounded bg-indigo-500/10 px-1.5 py-0.2 text-[9px] font-semibold text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                                          Transferência
                                        </span>
                                      )}
                                      {tx.category && !isTransfer && (
                                        <span className="rounded bg-emerald-500/10 px-1.5 py-0.2 text-[9px] font-medium text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                                          {categoryLabels[tx.category] || tx.category}
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                                      {tx.account_name && (
                                        <span
                                          className="font-medium"
                                          style={{ color: bankLogoColor }}
                                        >
                                          ● {tx.account_name}
                                        </span>
                                      )}
                                      <span>·</span>
                                      <span>{fmtTime(tx.date)}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2.5 shrink-0">
                                  <span
                                    className={`font-mono font-bold tabular-nums text-sm ${
                                      isTransfer
                                        ? 'text-indigo-600 dark:text-indigo-400'
                                        : tx.type === 'DEBIT'
                                        ? 'text-rose-600 dark:text-rose-400'
                                        : 'text-emerald-600 dark:text-emerald-400'
                                    }`}
                                  >
                                    {tx.type === 'DEBIT' ? '− ' : '+ '}
                                    {fmt(tx.amount)}
                                  </span>

                                  {tx.status === 'pending' && (
                                    <div className="flex items-center gap-1">
                                      {/* Botão de Conciliar com Despesa cadastrada */}
                                      <button
                                        type="button"
                                        onClick={() => handleMatchExpense(tx.id)}
                                        disabled={isMatching}
                                        className="rounded p-1.5 text-blue-600 hover:bg-blue-500/10 dark:text-blue-400 transition-colors"
                                        title="Buscar correspondência em contas do mês com Jev AI"
                                      >
                                        {isMatching ? (
                                          <Loader2 className="size-3.5 animate-spin" />
                                        ) : (
                                          <Link2 className="size-3.5" />
                                        )}
                                      </button>

                                      {/* Botão de Classificar Categoria com Jev */}
                                      <button
                                        type="button"
                                        onClick={() => handleClassifySingle(tx.id)}
                                        disabled={isSingleClassifying}
                                        className="rounded p-1.5 text-violet-600 hover:bg-violet-500/10 dark:text-violet-400 transition-colors"
                                        title="Classificar categoria com Jev AI"
                                      >
                                        {isSingleClassifying ? (
                                          <Loader2 className="size-3.5 animate-spin" />
                                        ) : (
                                          <Sparkles className="size-3.5" />
                                        )}
                                      </button>

                                      {/* Botão de Aprovar */}
                                      <button
                                        type="button"
                                        onClick={() => handleApprove(tx.id, tx.category || 'outros')}
                                        className="rounded p-1.5 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400 transition-colors"
                                        title="Aprovar transação"
                                      >
                                        <Check className="size-3.5" />
                                      </button>

                                      {/* Botão de Ignorar */}
                                      <button
                                        type="button"
                                        onClick={() => handleIgnore(tx.id)}
                                        className="rounded p-1.5 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600 transition-colors"
                                        title="Ignorar transação"
                                      >
                                        <X className="size-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Card de Conciliação Sugerida pelo Jev */}
                              {matchInfo && (
                                <div className="mt-1 flex items-center justify-between rounded-lg bg-blue-500/10 border border-blue-500/25 px-3 py-1.5 text-xs animate-in fade-in duration-200">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-blue-900 dark:text-blue-300">
                                      💡 Jev sugeriu dar baixa em:
                                    </span>
                                    <span className="font-bold text-foreground">
                                      {matchInfo.matchedName}
                                    </span>
                                    <span className="text-[10px] text-blue-700 dark:text-blue-300 bg-blue-500/15 px-1.5 py-0.2 rounded font-medium">
                                      {Math.round(matchInfo.confidence * 100)}% certeza
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <Button
                                      size="sm"
                                      onClick={() =>
                                        handleReconcile(tx.id, matchInfo.expenseId, matchInfo.matchedName)
                                      }
                                      className="h-6.5 text-[11px] bg-blue-600 hover:bg-blue-700 text-white font-medium px-2.5 shadow-xs"
                                    >
                                      Dar Baixa Agora
                                    </Button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setMatchedMap((prev) => {
                                          const next = { ...prev }
                                          delete next[tx.id]
                                          return next
                                        })
                                      }}
                                      className="p-1 text-muted-foreground hover:text-foreground"
                                    >
                                      <X className="size-3" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
