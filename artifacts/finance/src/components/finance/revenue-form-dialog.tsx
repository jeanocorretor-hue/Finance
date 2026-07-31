import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useFinance, type RevenueDraft } from '@/lib/finance-store'
import type { Revenue, RevenueCategory, RevenueRecurrence } from '@/lib/finance-types'

interface Props {
  revenue: Revenue | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const CATEGORIES: { value: RevenueCategory; label: string }[] = [
  { value: 'fixo', label: 'Fixo' },
  { value: 'comissao', label: 'Comissão' },
  { value: 'outros', label: 'Outros' },
]

const RECURRENCES: { value: RevenueRecurrence; label: string }[] = [
  { value: 'recorrente', label: 'Recorrente (mensal)' },
  { value: 'avulsa', label: 'Avulsa (único mês)' },
]

function toNumber(v: string): number {
  const n = Number.parseFloat(v.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

export function RevenueFormDialog({ revenue, open, onOpenChange }: Props) {
  const { month, addRevenue, updateRevenue, deleteRevenue } = useFinance()
  const isEdit = Boolean(revenue)

  const [nome, setNome] = useState('')
  const [valor, setValor] = useState('')
  const [categoria, setCategoria] = useState<RevenueCategory>('fixo')
  const [recorrencia, setRecorrencia] = useState<RevenueRecurrence>('recorrente')
  const [mesOrigem, setMesOrigem] = useState(month)

  useEffect(() => {
    if (!open) return
    if (revenue) {
      setNome(revenue.nome)
      setValor(String(revenue.valor_base).replace('.', ','))
      setCategoria(revenue.categoria)
      setRecorrencia(revenue.recorrencia)
      setMesOrigem(revenue.mes_origem)
    } else {
      setNome('')
      setValor('')
      setCategoria('fixo')
      setRecorrencia('recorrente')
      setMesOrigem(month)
    }
  }, [open, revenue, month])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return
    const draft: RevenueDraft = {
      nome: nome.trim(),
      valor_base: toNumber(valor),
      categoria,
      recorrencia,
      mes_origem: mesOrigem,
    }
    if (revenue) updateRevenue(revenue.id, draft)
    else addRevenue(draft)
    onOpenChange(false)
  }

  function handleDelete() {
    if (revenue) deleteRevenue(revenue.id)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar receita' : 'Nova receita'}</DialogTitle>
          <DialogDescription>Configure a fonte de renda. Tudo é editável a qualquer momento.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rev-nome">Nome</Label>
            <Input id="rev-nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Salário, Freelance, Comissão" autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rev-valor">Valor</Label>
              <Input id="rev-valor" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" className="font-mono tabular-nums" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rev-categoria">Categoria</Label>
              <Select value={categoria} onValueChange={(v) => setCategoria(v as RevenueCategory)}>
                <SelectTrigger id="rev-categoria"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rev-recorrencia">Recorrência</Label>
              <Select value={recorrencia} onValueChange={(v) => setRecorrencia(v as RevenueRecurrence)}>
                <SelectTrigger id="rev-recorrencia"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RECURRENCES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rev-mes">Mês de origem</Label>
              <Input id="rev-mes" type="month" value={mesOrigem} onChange={(e) => setMesOrigem(e.target.value)} className="font-mono tabular-nums" />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            {isEdit ? (
              <Button type="button" variant="ghost" onClick={handleDelete} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                <Trash2 className="size-4" />
                Excluir
              </Button>
            ) : <span />}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit">{isEdit ? 'Salvar' : 'Adicionar'}</Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
