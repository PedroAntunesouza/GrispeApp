const BASE_URL = 'http://192.168.1.138:8081';

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const errorMessage = body?.message || body || text || response.statusText;
    throw new Error(errorMessage);
  }

  return body;
}

export async function createUser(user) {
  return request('/user/create', {
    method: 'POST',
    body: JSON.stringify(user),
  });
}

export async function loginUser(user) {
  return request('/user/login', {
    method: 'POST',
    body: JSON.stringify(user),
  });
}

export async function fetchDashboard() {
  return request('/api/dashboard', { method: 'GET' });
}

export async function fetchIngredientes() {
  return request('/api/ingredientes', { method: 'GET' });
}

export async function createIngrediente(payload) {
  return request('/api/ingredientes', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function registrarMovimentacao(id, payload) {
  return request(`/api/ingredientes/${id}/movimentacao`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchReceitas() {
  return request('/api/receitas', { method: 'GET' });
}

export async function createReceita(payload) {
  return request('/api/receitas', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchPedidos() {
  return request('/api/pedidos', { method: 'GET' });
}

export async function createPedido(payload) {
  return request('/api/pedidos', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function atualizarStatusPedido(id, status) {
  return request(`/api/pedidos/${id}/status?status=${encodeURIComponent(status)}`, {
    method: 'PATCH',
  });
}

export async function fetchFinanceiro() {
  return request('/api/financeiro', { method: 'GET' });
}

export async function createLancamento(payload) {
  return request('/api/financeiro', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export default {
  createUser,
  loginUser,
  fetchDashboard,
  fetchIngredientes,
  createIngrediente,
  registrarMovimentacao,
  fetchReceitas,
  createReceita,
  fetchPedidos,
  createPedido,
  atualizarStatusPedido,
  fetchFinanceiro,
  createLancamento,
};
