const PLUGGY_API_URL = 'https://api.pluggy.ai';

let _cachedApiKey: { key: string; expiresAt: number } | null = null;

export async function getPluggyApiKey(): Promise<string> {
  const clientId = process.env.PLUGGY_CLIENT_ID;
  const clientSecret = process.env.PLUGGY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Credenciais da Pluggy (PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET) não configuradas.');
  }

  // Se já temos um token válido em memória por pelo menos mais 1 minuto, reutiliza
  if (_cachedApiKey && _cachedApiKey.expiresAt > Date.now() + 60000) {
    return _cachedApiKey.key;
  }

  const response = await fetch(`${PLUGGY_API_URL}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, clientSecret }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Falha na autenticação Pluggy (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const apiKey = data.apiKey;

  _cachedApiKey = {
    key: apiKey,
    expiresAt: Date.now() + 50 * 60 * 1000,
  };

  return apiKey;
}

export async function createPluggyConnectToken(options?: { itemId?: string }): Promise<string> {
  const apiKey = await getPluggyApiKey();

  const response = await fetch(`${PLUGGY_API_URL}/connect_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
    },
    body: JSON.stringify(options || {}),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro ao gerar Connect Token da Pluggy (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.accessToken;
}

export async function fetchPluggyItem(itemId: string) {
  const apiKey = await getPluggyApiKey();
  const response = await fetch(`${PLUGGY_API_URL}/items/${itemId}`, {
    headers: { 'X-API-KEY': apiKey },
  });

  if (!response.ok) {
    throw new Error(`Erro ao buscar item ${itemId} na Pluggy`);
  }

  return response.json();
}

export async function fetchPluggyAccounts(itemId: string) {
  const apiKey = await getPluggyApiKey();
  const response = await fetch(`${PLUGGY_API_URL}/accounts?itemId=${itemId}`, {
    headers: { 'X-API-KEY': apiKey },
  });

  if (!response.ok) {
    throw new Error(`Erro ao buscar contas do item ${itemId} na Pluggy`);
  }

  const data = await response.json();
  return data.results || [];
}

export async function fetchPluggyTransactions(accountId: string, fromDate?: string) {
  const apiKey = await getPluggyApiKey();
  const url = new URL(`${PLUGGY_API_URL}/transactions`);
  url.searchParams.set('accountId', accountId);
  url.searchParams.set('pageSize', '100');
  if (fromDate) {
    url.searchParams.set('from', fromDate);
  }

  const response = await fetch(url.toString(), {
    headers: { 'X-API-KEY': apiKey },
  });

  if (!response.ok) {
    throw new Error(`Erro ao buscar transações da conta ${accountId} na Pluggy`);
  }

  const data = await response.json();
  return data.results || [];
}
