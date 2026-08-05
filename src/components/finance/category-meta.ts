import {
  Car,
  CreditCard,
  Ellipsis,
  HeartPulse,
  House,
  Repeat,
  Sparkles,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import type { ExpenseCategory, RevenueCategory } from '@/lib/finance-types'

interface CategoryMeta {
  label: string
  icon: LucideIcon
  tint: string
}

export const expenseCategoryMeta: Record<ExpenseCategory, CategoryMeta> = {
  casa: { label: 'Casa', icon: House, tint: 'text-chart-3' },
  veiculo: { label: 'Veículo', icon: Car, tint: 'text-chart-4' },
  saude: { label: 'Saúde', icon: HeartPulse, tint: 'text-destructive' },
  servicos: { label: 'Serviços', icon: Wrench, tint: 'text-chart-3' },
  assinatura: { label: 'Assinatura', icon: Sparkles, tint: 'text-chart-5' },
  outros: { label: 'Outros', icon: Ellipsis, tint: 'text-muted-foreground' },
}

export const revenueCategoryMeta: Record<RevenueCategory, CategoryMeta> = {
  fixo: { label: 'Fixo', icon: Repeat, tint: 'text-primary' },
  comissao: { label: 'Comissão', icon: CreditCard, tint: 'text-chart-4' },
  outros: { label: 'Outros', icon: Ellipsis, tint: 'text-muted-foreground' },
}
