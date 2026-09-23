const PLUGGY_API_URL = 'https://api.pluggy.ai';

// ─── Auth Cache ───────────────────────────────────────────────────────────────

let _cachedApiKey: { key: string; expiresAt: number } | null = null;

export async function getPluggyApiKey(): Promise<string> {
  const clientId = process.env.PLUGGY_CLIENT_ID;
  const clientSecret = process.env.PLUGGY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET não configurados.');
  }

  // Reutiliza token por 2 horas
  if (_cachedApiKey && _cachedApiKey.expiresAt > Date.now() + 60000) {
    return _cachedApiKey.key;
  }

  const res = await fetch(`${PLUGGY_API_URL}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, clientSecret }),
  });

  if (!res.ok) {
    throw new Error(`Pluggy Auth falhou (${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  _cachedApiKey = { key: data.apiKey, expiresAt: Date.now() + 2 * 60 * 60 * 1000 };
  return data.apiKey;
}

// ─── Connect Token ────────────────────────────────────────────────────────────

export async function createPluggyConnectToken(opts?: {
  itemId?: string;
  clientUserId?: string;
  webhookUrl?: string;
}): Promise<string> {
  const apiKey = await getPluggyApiKey();
  const webhookUrl =
    opts?.webhookUrl ||
    (process.env.PLUGGY_WEBHOOK_URL ? process.env.PLUGGY_WEBHOOK_URL : undefined);

  const res = await fetch(`${PLUGGY_API_URL}/connect_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-KEY': apiKey },
    body: JSON.stringify({
      clientUserId: opts?.clientUserId || 'finance-user',
      avoidDuplicates: true,
      ...(webhookUrl ? { webhookUrl } : {}),
      ...(opts?.itemId ? { itemId: opts.itemId } : {}),
    }),
  });

  if (!res.ok) {
    throw new Error(`Pluggy Connect Token falhou (${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  return data.accessToken;
}

// ─── Item & Accounts ──────────────────────────────────────────────────────────

export async function fetchPluggyItem(itemId: string) {
  const apiKey = await getPluggyApiKey();
  const res = await fetch(`${PLUGGY_API_URL}/items/${itemId}`, {
    headers: { 'X-API-KEY': apiKey },
  });
  if (!res.ok) throw new Error(`Erro ao buscar item ${itemId}`);
  return res.json();
}

export async function fetchPluggyAccounts(itemId: string): Promise<any[]> {
  const apiKey = await getPluggyApiKey();
  const res = await fetch(`${PLUGGY_API_URL}/accounts?itemId=${itemId}`, {
    headers: { 'X-API-KEY': apiKey },
  });
  if (!res.ok) throw new Error(`Erro ao buscar contas do item ${itemId}`);
  const data = await res.json();
  return data.results || [];
}

// ─── Transactions com paginação cursor ────────────────────────────────────────

export async function fetchAllPluggyTransactions(
  accountId: string,
  dateFrom: string
): Promise<any[]> {
  const apiKey = await getPluggyApiKey();
  const all: any[] = [];
  let nextCursor: string | null = null;

  while (true) {
    // Usa o endpoint v2 (v1 foi depreciado — retorna 410)
    const url = new URL(`${PLUGGY_API_URL}/v2/transactions`);
    url.searchParams.set('accountId', accountId);
    url.searchParams.set('dateFrom', dateFrom);
    if (nextCursor) url.searchParams.set('cursor', nextCursor);
    // Nota: v2 NÃO aceita pageSize — usa 500 por padrão

    const res = await fetch(url.toString(), { headers: { 'X-API-KEY': apiKey } });
    if (!res.ok) break;

    const data = await res.json();
    const results: any[] = data.results || [];
    all.push(...results);

    // v2 usa campo 'next' como cursor (null quando é a última página)
    if (!data.next) break;
    nextCursor = data.next;
  }

  return all;
}

// ─── Sincronização completa de um item ───────────────────────────────────────

export interface SyncedAccount {
  account_id: string;
  account_name: string;
  account_type: string;
  balance: number;
  currency: string;
}

export interface SyncResult {
  itemId: string;
  connectorName: string;
  contasCount: number;
  totalBalance: number;
  accounts: SyncedAccount[];
  transacoesImportadas: number;
  transacoesAtualizadas: number;
  transactions: SyncedTransaction[];
}

export interface SyncedTransaction {
  pluggy_transaction_id: string;
  account_id: string;
  account_name: string;
  account_type: string;
  description: string;
  amount: number;
  date: string; // ISO
  data_extrato: string; // YYYY-MM-DD em São Paulo
  type: 'DEBIT' | 'CREDIT';
  tipo_pix: string | null;
  category: string | null;
}

function toBrazilDate(isoDate: string): string {
  // Converte data ISO para data no fuso América/São_Paulo (YYYY-MM-DD)
  return new Date(isoDate)
    .toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    .split('/')
    .reverse()
    .join('-');
}

function detectTipoPix(desc: string): string | null {
  const d = desc.toUpperCase();
  if (d.includes('PIX')) return 'PIX';
  if (d.includes('TED')) return 'TED';
  if (d.includes('DOC')) return 'DOC';
  return null;
}

function truncate(str: string, n: number) {
  return str.length > n ? str.slice(0, n - 1) + '…' : str;
}

export async function sincronizarPluggyItem(itemId: string): Promise<SyncResult> {
  const item = await fetchPluggyItem(itemId);
  const accounts = await fetchPluggyAccounts(itemId);

  const connectorName: string = item.connector?.name || 'Banco Conectado';

  // Período: env var PLUGGY_SYNC_FROM ou últimos 365 dias
  const syncFromEnv = process.env.PLUGGY_SYNC_FROM;
  const dateFrom = syncFromEnv
    ? syncFromEnv
    : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  // Coleta saldos de TODAS as contas (corrente, poupança e crédito)
  const syncedAccounts: SyncedAccount[] = accounts.map((acc: any) => ({
    account_id: acc.id,
    account_name: acc.name || acc.type || 'Conta',
    account_type: acc.type || 'BANK',
    balance: Number(acc.balance || 0),
    currency: acc.currencyCode || 'BRL',
  }));

  const totalBalance = syncedAccounts
    .filter((a) => a.account_type !== 'CREDIT')
    .reduce((sum, a) => sum + a.balance, 0);

  const synced: SyncedTransaction[] = [];

  for (const acc of accounts) {
    // Busca transações de TODAS as contas (corrente, poupança e cartão)
    const rawTxs = await fetchAllPluggyTransactions(acc.id, dateFrom);

    for (const tx of rawTxs) {
      const dataExtrato = toBrazilDate(tx.date);
      if (dataExtrato < dateFrom) continue;

      synced.push({
        pluggy_transaction_id: tx.id,
        account_id: acc.id,
        account_name: acc.name || acc.type || 'Conta',
        account_type: acc.type || 'BANK',
        description: truncate(tx.description || 'Transação', 50),
        amount: Math.abs(tx.amount || 0),
        date: tx.date,
        data_extrato: dataExtrato,
        type: (tx.type as 'DEBIT' | 'CREDIT') || (tx.amount < 0 ? 'DEBIT' : 'CREDIT'),
        tipo_pix: detectTipoPix(tx.description || ''),
        category: tx.category || null,
      });
    }
  }

  return {
    itemId,
    connectorName,
    contasCount: syncedAccounts.length,
    totalBalance,
    accounts: syncedAccounts,
    transacoesImportadas: synced.length,
    transacoesAtualizadas: 0,
    transactions: synced,
  };
}
