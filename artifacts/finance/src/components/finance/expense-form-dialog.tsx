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
import { Switch } from '@/components/ui/switch'
import { useFinance, type ExpenseDraft } from '@/lib/finance-store'
import type { Expense, ExpenseCategory, ExpenseRecurrence } from '@/lib/finance-types'

interface Props {
  expense: Expense | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'casa', label: 'Casa' },
  { value: 'veiculo', label: 'Veículo' },
  { value: 'saude', label: 'Saúde' },
  { value: 'servicos', label: 'Serviços' },
  { value: 'assinatura', label: 'Assinatura' },
  { value: 'outros', label: 'Outros' },
]

const RECURRENCES: { value: ExpenseRecurrence; label: string }[] = [
  { value: 'recorrente', label: 'Recorrente (mensal)' },
  { value: 'parcelada', label: 'Parcelada' },
  { value: 'avulsa', label: 'Avulsa (único mês)' },
]

const DEBIT = 'debito'

function toNumber(v: string): number {
  const n = Number.parseFloat(v.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

export function ExpenseFormDialog({ expense, open, onOpenChange }: Props) {
  const { cards, month, addExpense, updateExpense, deleteExpense } = useFinance()
  const isEdit = Boolean(expense)

  const [nome, setNome] = useState('')
  const [valor, setValor] = useState('')
  const [categoria, setCategoria] = useState<ExpenseCategory>('casa')
  const [recorrencia, setRecorrencia] = useState<ExpenseRecurrence>('recorrente')
  const [parcelas, setParcelas] = useState('12')
  const [estimado, setEstimado] = useState(false)
  const [diaVencimento, setDiaVencimento] = useState('')
  const [cartaoId, setCartaoId] = useState<string>(DEBIT)
  const [mesOrigem, setMesOrigem] = useState(month)

  useEffect(() => {
    if (!open) return
    if (expense) {
      setNome(expense.nome)
      setValor(String(expense.valor_base).replace('.', ','))
      setCategoria(expense.categoria)
      setRecorrencia(expense.recorrencia)
      setParcelas(String(expense.parcelas ?? 12))
      setEstimado(expense.estimado)
      setDiaVencimento(expense.dia_vencimento ? String(expense.dia_vencimento) : '')
      setCartaoId(expense.cartao_id ?? DEBIT)
      setMesOrigem(expense.mes_origem)
    } else {
      setNome('')
      setValor('')
      setCategoria('casa')
      setRecorrencia('recorrente')
      setParcelas('12')
      setEstimado(false)
      setDiaVencimento('')
      setCartaoId(DEBIT)
      setMesOrigem(month)
    }
  }, [open, expense, month])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return
    const draft: ExpenseDraft = {
      nome: nome.trim(),
      valor_base: toNumber(valor),
      categoria,
      recorrencia,
      parcelas: recorrencia === 'parcelada' ? Math.max(1, Math.round(toNumber(parcelas))) : undefined,
      estimado,
      dia_vencimento: diaVencimento ? Math.min(31, Math.max(1, Math.round(toNumber(diaVencimento)))) : null,
      cartao_id: cartaoId === DEBIT ? null : cartaoId,
      mes_origem: mesOrigem,
    }
    if (expense) updateExpense(expense.id, draft)
    else addExpense(draft)
    onOpenChange(false)
  }

  function handleDelete() {
    if (expense) deleteExpense(expense.id)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar despesa' : 'Nova despesa'}</DialogTitle>
          <DialogDescription>Configure todos os detalhes. Tudo é editável a qualquer momento.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="exp-nome">Nome</Label>
            <Input id="exp-nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Aluguel, Internet, Gasolina" autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="exp-valor">{estimado ? 'Orçamento estimado' : 'Valor'}</Label>
              <Input id="exp-valor" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" className="font-mono tabular-nums" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="exp-categoria">Categoria</Label>
              <Select value={categoria} onValueChange={(v) => setCategoria(v as ExpenseCategory)}>
                <SelectTrigger id="exp-categoria"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="exp-recorrencia">Recorrência</Label>
              <Select value={recorrencia} onValueChange={(v) => setRecorrencia(v as ExpenseRecurrence)}>
                <SelectTrigger id="exp-recorrencia"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RECURRENCES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {recorrencia === 'parcelada' ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="exp-parcelas">Nº de parcelas</Label>
                <Input id="exp-parcelas" inputMode="numeric" value={parcelas} onChange={(e) => setParcelas(e.target.value)} className="font-mono tabular-nums" />
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="exp-dia">Dia de vencimento</Label>
                <Input id="exp-dia" inputMode="numeric" value={diaVencimento} onChange={(e) => setDiaVencimento(e.target.value)} placeholder="Opcional" className="font-mono tabular-nums" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="exp-cartao">Forma de pagamento</Label>
              <Select value={cartaoId} onValueChange={setCartaoId}>
                <SelectTrigger id="exp-cartao"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={DEBIT}>Débito / Conta</SelectItem>
                  {cards.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="exp-mes">Mês de origem</Label>
              <Input id="exp-mes" type="month" value={mesOrigem} onChange={(e) => setMesOrigem(e.target.value)} className="font-mono tabular-nums" />
            </div>
          </div>

          {recorrencia === 'parcelada' ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="exp-dia-p">Dia de vencimento</Label>
              <Input id="exp-dia-p" inputMode="numeric" value={diaVencimento} onChange={(e) => setDiaVencimento(e.target.value)} placeholder="Opcional" className="font-mono tabular-nums" />
            </div>
          ) : null}

          <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/40 px-3 py-2.5">
            <div>
              <Label htmlFor="exp-estimado" className="cursor-pointer">Gasto variável rastreado</Label>
              <p className="text-xs text-muted-foreground">O valor vira orçamento e você registra lançamentos ao longo do mês.</p>
            </div>
            <Switch id="exp-estimado" checked={estimado} onCheckedChange={setEstimado} />
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
