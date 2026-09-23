import { TypeSafeClient, choice, noul, score } from '@typesafe-ai/sdk'
import type { ExpenseCategory } from './finance-types'

function getClient(): TypeSafeClient {
  const apiKey = process.env.TYPESAFE_API_KEY
  if (!apiKey) {
    throw new Error('TYPESAFE_API_KEY não configurada no ambiente')
  }
  return new TypeSafeClient({ apiKey })
}

export interface JevClassificationResult {
  categoria: ExpenseCategory
  confidence: number
  probabilidades: Record<string, number>
  ehTransferencia: boolean
  transferenciaProb: number
  ehRecorrente: boolean
  recorrenteProb: number
  natureza: 'essencial' | 'estilo_de_vida' | 'financeiro' | 'trabalho' | 'outros'
  relevanciaScore?: number
  sugestaoAcao: 'aprovar_automatico' | 'aprovar_sugerida' | 'ignorar_transferencia' | 'revisar'
}

/**
 * Classifica uma transação bancária usando o modelo System One Jev (TypeSafe AI)
 */
export async function classificarTransacaoComJev(params: {
  descricao: string
  valor: number | string
  tipo: string
  contaNome?: string
  categoriaAtual?: string | null
}): Promise<JevClassificationResult> {
  const client = getClient()

  const state = {
    descricao: params.descricao,
    valor: String(params.valor),
    tipoOperacao: params.tipo,
    contaBancaria: params.contaNome || 'Conta Corrente',
    categoriaPrevia: params.categoriaAtual || null,
  }

  const response = await client.systemOne({
    state,
    questions: {
      categoria: choice('Qual categoria orçamentária melhor classifica este gasto/movimentação?', {
        casa: 'Moradia, aluguel, condomínio, luz, água, internet, IPTU, reformas e supermercado básico de casa',
        veiculo: 'Combustível, postos, mecânica, revisão, estacionamento, pedágio, Uber, transporte',
        saude: 'Farmácia, remédios, médicos, clínicas, planos de saúde, exames, hospitais',
        servicos: 'Serviços diversos, educação, cursos, taxas operacionais, profissionais autônomos',
        assinatura: 'Assinaturas mensais, streaming (Netflix, Spotify, Apple, iCloud, ChatGPT, Claude), softwares',
        outros: 'Lazer, presentes, compras gerais não enquadradas nas categorias acima',
      }),
      eh_transferencia_propria: noul(
        'Esta movimentação é uma transferência interna entre contas da mesma titularidade, Pix próprio ou pagamento da fatura do próprio cartão?'
      ),
      eh_recorrente: noul(
        'Esta transação tem características de assinatura mensal contínua ou despesa fixa repetitiva?'
      ),
      natureza: choice('Qual a natureza deste gasto no orçamento pessoal?', {
        essencial: 'Gastos de sobrevivência básica: moradia, contas básicas, saúde, transporte diário',
        estilo_de_vida: 'Conforto, restaurantes, pedidos delivery, compras, lazer, entretenimento',
        financeiro: 'Transferências, rendimentos, juros, quitação de fatura ou empréstimo',
        trabalho: 'Despesas de ferramentas profissionais, equipamentos ou negócio',
        outros: 'Outros tipos de despesas',
      }),
    },
  })

  const { categoria, eh_transferencia_propria, eh_recorrente, natureza } = response.answers

  const cat = categoria.choice as ExpenseCategory
  const confidence = categoria.confidence
  const probTransfer = eh_transferencia_propria.noul
  const probRecorrente = eh_recorrente.noul

  const ehTransferencia = probTransfer >= 0.78
  const ehRecorrente = probRecorrente >= 0.65

  // Regra de ação inteligente orientada a confiança
  let sugestaoAcao: JevClassificationResult['sugestaoAcao'] = 'revisar'
  if (ehTransferencia) {
    sugestaoAcao = 'ignorar_transferencia'
  } else if (confidence >= 0.9) {
    sugestaoAcao = 'aprovar_automatico'
  } else if (confidence >= 0.7) {
    sugestaoAcao = 'aprovar_sugerida'
  }

  return {
    categoria: cat,
    confidence,
    probabilidades: categoria.probabilities as Record<string, number>,
    ehTransferencia,
    transferenciaProb: probTransfer,
    ehRecorrente,
    recorrenteProb: probRecorrente,
    natureza: (natureza.choice as any) || 'outros',
    sugestaoAcao,
  }
}

/**
 * Classifica um lote de transações bancárias em paralelo com Jev
 */
export async function classificarLoteTransacoesComJev(
  transacoes: Array<{
    id: string
    description: string
    amount: string | number
    type: string
    account_name?: string | null
    category?: string | null
  }>
) {
  const resultados: Array<{
    id: string
    resultado: JevClassificationResult | null
    erro?: string
  }> = []

  // Executa em chunks para respeitar rate limits e paralelismo saudável
  const CHUNK_SIZE = 5
  for (let i = 0; i < transacoes.length; i += CHUNK_SIZE) {
    const chunk = transacoes.slice(i, i + CHUNK_SIZE)
    const promises = chunk.map(async (tx) => {
      try {
        const resultado = await classificarTransacaoComJev({
          descricao: tx.description,
          valor: tx.amount,
          tipo: tx.type,
          contaNome: tx.account_name || undefined,
          categoriaAtual: tx.category,
        })
        return { id: tx.id, resultado }
      } catch (err: any) {
        console.error(`Erro ao classificar tx ${tx.id} com Jev:`, err.message)
        return { id: tx.id, resultado: null, erro: err.message }
      }
    })

    const chunkResults = await Promise.all(promises)
    resultados.push(...chunkResults)
  }

  return resultados
}

export interface ExpenseMatchResult {
  expenseId: string | null
  confidence: number
  matchedName: string | null
  confirmaMatchProb: number
}

/**
 * Avalia se uma movimentação do extrato corresponde a alguma despesa cadastrada no Finance
 */
export async function encontrarMatchDespesaComJev(params: {
  descricao: string
  valor: number | string
  despesas: Array<{ id: string; nome: string; valor_base: number | string; categoria: string }>
}): Promise<ExpenseMatchResult> {
  if (!params.despesas || params.despesas.length === 0) {
    return { expenseId: null, confidence: 0, matchedName: null, confirmaMatchProb: 0 }
  }

  const client = getClient()

  const state = {
    transacaoExtrato: params.descricao,
    valorTransacao: String(params.valor),
  }

  // Prepara as opções de despesas cadastradas
  const optionsMap: Record<string, string> = {
    nenhuma: 'Esta transação não corresponde a nenhuma das despesas cadastradas',
  }

  for (const d of params.despesas.slice(0, 20)) {
    optionsMap[d.id] = `${d.nome} (Previsto: R$ ${d.valor_base}, Categoria: ${d.categoria})`
  }

  const response = await client.systemOne({
    state,
    questions: {
      despesa_correspondente: choice(
        'Qual despesa cadastrada do usuário corresponde a este pagamento no extrato?',
        optionsMap
      ),
      confirma_pagamento: noul(
        'Esta transação bancária comprova a liquidação ou pagamento da despesa indicada?'
      ),
    },
  })

  const { despesa_correspondente, confirma_pagamento } = response.answers
  const selectedId = despesa_correspondente.choice
  const confidence = despesa_correspondente.confidence
  const probConfirma = confirma_pagamento.noul

  if (selectedId === 'nenhuma' || confidence < 0.7) {
    return { expenseId: null, confidence, matchedName: null, confirmaMatchProb: probConfirma }
  }

  const matchedExpense = params.despesas.find((d) => d.id === selectedId)

  return {
    expenseId: selectedId,
    confidence,
    matchedName: matchedExpense?.nome || null,
    confirmaMatchProb: probConfirma,
  }
}

