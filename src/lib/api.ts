const BASE_URL = '';

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function login(username: string, password: string) {
  return apiFetch<{ token: string; user: { id: string; username: string; role: string } }>(
    '/api/auth/login',
    { method: 'POST', body: JSON.stringify({ username, password }) }
  );
}

export async function getMe(token: string) {
  return apiFetch<{ id: string; username: string; email?: string; role: string }>(
    '/api/auth/me',
    { headers: authHeaders(token) }
  );
}

export async function updateProfile(
  token: string,
  data: { username?: string; email?: string; currentPassword?: string; newPassword?: string }
) {
  return apiFetch<{
    token: string;
    user: { id: string; username: string; email?: string; role: string };
  }>('/api/auth/me', {
    method: 'PUT',
    body: JSON.stringify(data),
    headers: authHeaders(token),
  });
}

// Tables CRUD
export async function getTables(token: string) {
  return apiFetch<import('@/types').Table[]>('/api/tables', { headers: authHeaders(token) });
}

export async function createTable(
  token: string,
  data: { number: number; capacity: number; status?: import('@/types').TableStatus }
) {
  return apiFetch<import('@/types').Table>('/api/tables', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: authHeaders(token),
  });
}

export async function updateTableStatus(
  token: string,
  id: string,
  data: Partial<import('@/types').Table>
) {
  return apiFetch<import('@/types').Table>(`/api/tables/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
    headers: authHeaders(token),
  });
}

export async function deleteTable(token: string, id: string) {
  return apiFetch<{ message: string }>(`/api/tables/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
}

// Dishes CRUD
export async function getDishes(token: string, category?: string) {
  const qs = category ? `?category=${encodeURIComponent(category)}` : '';
  return apiFetch<import('@/types').Dish[]>(`/api/dishes${qs}`, { headers: authHeaders(token) });
}

export async function createDish(
  token: string,
  data: { name: string; category: string; price: number; description?: string; image?: string; available?: boolean }
) {
  return apiFetch<import('@/types').Dish>('/api/dishes', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: authHeaders(token),
  });
}

export async function updateDish(
  token: string,
  id: string,
  data: Partial<import('@/types').Dish>
) {
  return apiFetch<import('@/types').Dish>(`/api/dishes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
    headers: authHeaders(token),
  });
}

export async function deleteDish(token: string, id: string) {
  return apiFetch<{ message: string }>(`/api/dishes/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
}

// Orders CRUD
export async function getOrders(token: string, status?: string, date?: string) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (date) params.set('date', date);
  const qs = params.toString() ? `?${params.toString()}` : '';
  return apiFetch<import('@/types').Order[]>(`/api/orders${qs}`, { headers: authHeaders(token) });
}

export async function createOrder(
  token: string,
  data: { tableId?: string; items: import('@/types').OrderItem[]; paymentMethod?: string; status?: import('@/types').OrderStatus; orderType?: string; customerName?: string }
) {
  return apiFetch<import('@/types').Order>('/api/orders', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: authHeaders(token),
  });
}

export async function updateOrder(
  token: string,
  id: string,
  data: Partial<Pick<import('@/types').Order, 'status' | 'items' | 'paymentMethod'>>
) {
  return apiFetch<import('@/types').Order>(`/api/orders/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
    headers: authHeaders(token),
  });
}

export async function deleteOrder(token: string, id: string) {
  return apiFetch<{ message: string }>(`/api/orders/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
}

// Expenses CRUD
export async function getExpenses(token: string, period?: 'daily' | 'monthly' | 'yearly' | 'all', value?: string) {
  const params = new URLSearchParams();
  if (period && period !== 'all') params.set('period', period);
  if (value) params.set('value', value);
  const qs = params.toString() ? `?${params.toString()}` : '';
  return apiFetch<import('@/types').Expense[]>(`/api/expenses${qs}`, { headers: authHeaders(token) });
}

export async function createExpense(
  token: string,
  data: { amount: number; description: string; category?: string; date?: string }
) {
  return apiFetch<import('@/types').Expense>('/api/expenses', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: authHeaders(token),
  });
}

export async function updateExpense(
  token: string,
  id: string,
  data: Partial<{ amount: number; description: string; category: string; date: string }>
) {
  return apiFetch<import('@/types').Expense>(`/api/expenses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
    headers: authHeaders(token),
  });
}

export async function deleteExpense(token: string, id: string) {
  return apiFetch<{ message: string }>(`/api/expenses/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
}

// Reports & Dashboard
export async function getMonthlyReport(
  token: string,
  value?: string,
  period: 'daily' | 'monthly' | 'yearly' = 'monthly'
) {
  const params = new URLSearchParams();
  params.set('period', period);
  if (value) params.set('value', value);
  return apiFetch<import('@/types').MonthlyReport>(`/api/reports/monthly?${params.toString()}`, {
    headers: authHeaders(token),
  });
}

export async function getDashboardStats(token: string, date?: string) {
  const qs = date ? `?date=${encodeURIComponent(date)}` : '';
  return apiFetch<import('@/types').DashboardStats>(`/api/dashboard/stats${qs}`, {
    headers: authHeaders(token),
  });
}

// Categories CRUD
export async function getCategories(token: string) {
  return apiFetch<import('@/types').Category[]>('/api/categories', {
    headers: authHeaders(token),
  });
}

export async function createCategory(token: string, name: string) {
  return apiFetch<import('@/types').Category>('/api/categories', {
    method: 'POST',
    body: JSON.stringify({ name }),
    headers: authHeaders(token),
  });
}

export async function updateCategory(token: string, id: string, name: string) {
  return apiFetch<import('@/types').Category>(`/api/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
    headers: authHeaders(token),
  });
}

export async function deleteCategory(token: string, id: string) {
  return apiFetch<{ message: string }>(`/api/categories/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
}

// Stock & Alerts CRUD
export async function getStocks(token: string) {
  return apiFetch<import('@/types').StockItem[]>('/api/stocks', {
    headers: authHeaders(token),
  });
}

export async function createStock(
  token: string,
  data: { name: string; category?: string; quantity: number; minThreshold: number; unit?: string }
) {
  return apiFetch<import('@/types').StockItem>('/api/stocks', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: authHeaders(token),
  });
}

export async function updateStock(
  token: string,
  id: string,
  data: Partial<{ name: string; category: string; quantity: number; minThreshold: number; unit: string }>
) {
  return apiFetch<import('@/types').StockItem>(`/api/stocks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
    headers: authHeaders(token),
  });
}

export async function deleteStock(token: string, id: string) {
  return apiFetch<{ message: string }>(`/api/stocks/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
}

// Customers CRUD
export async function getCustomers(token: string) {
  return apiFetch<import('@/types').Customer[]>('/api/customers', {
    headers: authHeaders(token),
  });
}

export async function createCustomer(
  token: string,
  data: { name: string; phone: string; email?: string; totalOrders?: number; totalSpent?: number }
) {
  return apiFetch<import('@/types').Customer>('/api/customers', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: authHeaders(token),
  });
}

export async function updateCustomer(
  token: string,
  id: string,
  data: Partial<{ name: string; phone: string; email: string; totalOrders: number; totalSpent: number }>
) {
  return apiFetch<import('@/types').Customer>(`/api/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
    headers: authHeaders(token),
  });
}

export async function deleteCustomer(token: string, id: string) {
  return apiFetch<{ message: string }>(`/api/customers/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
}
