'use client'

import { useEffect, useState } from 'react'
import {
  Building2,
  CheckCircle2,
  Landmark,
  Loader2,
  Plus,
  RefreshCw,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

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
  last_sync_at: string | null
}

interface PluggyTransaction {
  id: string
  item_id: string
  account_id: string
  description: string
  amount: string
  date: string
  type: string
  category: string | null
}

export function PluggyPanel() {
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [items, setItems] = useState<PluggyItem[]>([])
  const [transactions, setTransactions] = useState<PluggyTransaction[]>([])
  const [configured, setConfigured] = useState(true)

  async function loadStatus() {
    try {
      const res = await fetch('/api/finance/pluggy/status')
      if (!res.ok) return
      const data = await res.json()
      setItems(data.items || [])
      setTransactions(data.recentTransactions || [])
      setConfigured(data.configured)
    } catch (err) {
      console.error('Erro ao carregar status do Pluggy:', err)
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
      script.src = 'https://cdn.pluggy.ai/pluggy-connect/v2/pluggy-connect.js'
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
        throw new Error(err.error || 'Falha ao gerar token de conexão')
      }
      const { connectToken } = await tokenRes.json()

      await loadPluggyScript()

      if (!window.PluggyConnect) {
        throw new Error('Widget do Pluggy não carregou no navegador.')
      }

      const pluggyConnect = new window.PluggyConnect({
        connectToken,
        includeSandbox: true,
        onSuccess: async (data: any) => {
          toast.success(`Banco ${data.item?.connector?.name || ''} conectado com sucesso!`)
          try {
            await fetch('/api/finance/pluggy/item', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                itemId: data.item.id,
                connectorName: data.item.connector.name,
                connectorId: data.item.connector.id,
              }),
            })
            await loadStatus()
          } catch (e) {
            console.error('Erro ao salvar item conectado:', e)
          }
        },
        onError: (error: any) => {
          console.error('Pluggy Connect Error:', error)
          toast.error('Não foi possível concluir a conexão bancária.')
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
      const res = await fetch('/api/finance/pluggy/sync', { method: 'POST' })
      if (!res.ok) {
        throw new Error('Falha ao sincronizar contas')
      }
      const data = await res.json()
      setItems(data.items || [])
      setTransactions(data.recentTransactions || [])
      toast.success(`${data.totalSynced || 0} transações sincronizadas!`)
    } catch (err: any) {
      toast.error(err.message || 'Erro na sincronização')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Landmark className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Open Finance · Conexão Bancária</h3>
            <p className="text-xs text-muted-foreground">
              Sincronize Nubank, Sicredi e outros bancos automaticamente
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={syncing}
              className="h-8 gap-1.5 text-xs font-medium"
            >
              <RefreshCw className={`size-3.5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Sincronizando…' : 'Sincronizar Bancos'}
            </Button>
          )}

          <Button
            size="sm"
            onClick={handleConnectBank}
            disabled={connecting || !configured}
            className="h-8 gap-1.5 bg-emerald-600 text-xs font-medium text-white hover:bg-emerald-700"
          >
            {connecting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Plus className="size-3.5" />
            )}
            Conectar Banco
          </Button>
        </div>
      </div>

      {/* Lista de Bancos Conectados */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/80 py-6 text-center">
          <Building2 className="mb-2 size-8 text-muted-foreground/60" />
          <p className="text-xs font-medium text-foreground">Nenhum banco conectado ainda</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            Clique em "Conectar Banco" para vincular sua conta bancária de forma segura via Open Finance Brasil.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-1.5 text-xs"
              >
                <CheckCircle2 className="size-3.5 text-emerald-500" />
                <span className="font-semibold text-foreground">{item.connector_name}</span>
                {item.last_sync_at && (
                  <span className="text-[10px] text-muted-foreground">
                    · Atualizado{' '}
                    {new Date(item.last_sync_at).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Últimos Lançamentos Importados */}
          {transactions.length > 0 && (
            <div className="mt-1 flex flex-col gap-1.5">
              <p className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                Últimos lançamentos sincronizados
              </p>
              <div className="max-h-48 overflow-y-auto rounded-lg border border-border/40 divide-y divide-border/40 text-xs">
                {transactions.slice(0, 8).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between px-3 py-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Wallet className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate font-medium text-foreground">{tx.description}</span>
                      {tx.category && (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {tx.category}
                        </span>
                      )}
                    </div>
                    <span
                      className={`font-semibold shrink-0 ${
                        tx.type === 'DEBIT' ? 'text-rose-500' : 'text-emerald-500'
                      }`}
                    >
                      {tx.type === 'DEBIT' ? '- ' : '+ '}
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(Number(tx.amount))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
