import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useFinance, type CardDraft } from '@/lib/finance-store'
import type { Card } from '@/lib/finance-types'
import { cn } from '@/lib/utils'

interface Props {
  card: Card | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const SWATCHES = ['#8B5CF6', '#22D3EE', '#4ADE80', '#F472B6', '#FB923C', '#FACC15', '#38BDF8', '#F87171']

function toNumber(v: string): number {
  const n = Number.parseInt(v, 10)
  return Number.isFinite(n) ? n : 1
}

export function CardFormDialog({ card, open, onOpenChange }: Props) {
  const { addCard, updateCard, deleteCard } = useFinance()
  const isEdit = Boolean(card)

  const [nome, setNome] = useState('')
  const [dia, setDia] = useState('5')
  const [cor, setCor] = useState(SWATCHES[0])

  useEffect(() => {
    if (!open) return
    if (card) {
      setNome(card.nome)
      setDia(String(card.dia_vencimento))
      setCor(card.cor)
    } else {
      setNome('')
      setDia('5')
      setCor(SWATCHES[0])
    }
  }, [open, card])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return
    const draft: CardDraft = {
      nome: nome.trim(),
      dia_vencimento: Math.min(31, Math.max(1, toNumber(dia))),
      cor,
    }
    if (card) updateCard(card.id, draft)
    else addCard(draft)
    onOpenChange(false)
  }

  function handleDelete() {
    if (card) deleteCard(card.id)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar cartão' : 'Novo cartão'}</DialogTitle>
          <DialogDescription>Cadastre um cartão para agrupar as faturas do mês.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="card-nome">Nome</Label>
              <Input id="card-nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Nubank" autoFocus />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="card-dia">Dia de fechamento</Label>
              <Input id="card-dia" inputMode="numeric" value={dia} onChange={(e) => setDia(e.target.value)} className="font-mono tabular-nums" />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-2">
              {SWATCHES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setCor(s)}
                  aria-label={`Selecionar cor ${s}`}
                  className={cn(
                    'size-8 rounded-full ring-offset-2 ring-offset-background transition-transform',
                    cor === s ? 'ring-2 ring-primary scale-110' : 'hover:scale-105',
                  )}
                  style={{ backgroundColor: s }}
                />
              ))}
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
