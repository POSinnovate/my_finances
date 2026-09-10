import { useQuery, useQueryClient } from '@tanstack/react-query';

export function useUser() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me');
      if (res.status === 401) {
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
          window.location.href = '/login';
        }
        throw new Error('Unauthorized');
      }
      if (!res.ok) throw new Error('Unauthorized');
      const data = await res.json();
      return data.user;
    },
    staleTime: 1000 * 60 * 5, // 5 min cache
    retry: false,
  });
}

export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const res = await fetch('/api/stats');
      if (!res.ok) throw new Error('Error al cargar estadísticas');
      return res.json();
    },
    staleTime: 1000 * 60 * 3, // 3 min cache
  });
}

export function useRecentExpenses(limit = 10) {
  return useQuery({
    queryKey: ['expenses', 'recent', limit],
    queryFn: async () => {
      const res = await fetch(`/api/expenses?limit=${limit}`);
      if (!res.ok) throw new Error('Error al cargar movimientos recientes');
      const data = await res.json();
      return data.expenses || [];
    },
    staleTime: 1000 * 60 * 3, // 3 min cache
  });
}

export interface ExpenseFilters {
  month?: string;
  type?: string;
  categoryId?: string;
  paymentMethod?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export function useExpenses(filters?: string | ExpenseFilters) {
  const options: ExpenseFilters = typeof filters === 'string' ? { month: filters } : (filters || {});
  const { month = 'ALL', type = 'ALL', categoryId = 'ALL', paymentMethod = 'ALL', search = '', page = 1, pageSize = 15 } = options;

  return useQuery({
    queryKey: ['expenses', 'list', month, type, categoryId, paymentMethod, search, page, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (month && month !== 'ALL') params.set('month', month);
      if (type && type !== 'ALL') params.set('type', type);
      if (categoryId && categoryId !== 'ALL') params.set('categoryId', categoryId);
      if (paymentMethod && paymentMethod !== 'ALL') params.set('paymentMethod', paymentMethod);
      if (search) params.set('search', search);
      if (page) params.set('page', String(page));
      if (pageSize) params.set('pageSize', String(pageSize));

      const queryStr = params.toString();
      const url = queryStr ? `/api/expenses?${queryStr}` : '/api/expenses';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Error al cargar movimientos');
      const data = await res.json();
      return {
        expenses: data.expenses || [],
        pagination: data.pagination || { total: (data.expenses || []).length, page: 1, pageSize: 15, totalPages: 1 },
        summary: data.summary || { total_income: 0, total_expense: 0, net_balance: 0 },
      };
    },
    staleTime: 1000 * 60 * 3, // 3 min cache
  });
}

export function useCategories(type?: 'EXPENSE' | 'INCOME') {
  return useQuery({
    queryKey: ['categories', type || 'ALL'],
    queryFn: async () => {
      const url = type ? `/api/categories?type=${type}` : '/api/categories';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Error al cargar categorías');
      const data = await res.json();
      return data.categories || [];
    },
    staleTime: 1000 * 60 * 5, // 5 min cache
  });
}

export function usePaymentMethods() {
  return useQuery({
    queryKey: ['payment-methods'],
    queryFn: async () => {
      const res = await fetch('/api/payment-methods');
      if (!res.ok) throw new Error('Error al cargar métodos de pago');
      const data = await res.json();
      return data.paymentMethods || [];
    },
    staleTime: 1000 * 60 * 5, // 5 min cache
  });
}

export function useGoals() {
  return useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      const res = await fetch('/api/goals');
      if (!res.ok) throw new Error('Error al cargar metas');
      const data = await res.json();
      return data.goals || [];
    },
    staleTime: 1000 * 60 * 3,
  });
}

/**
 * Invalidate all finance data across the app after a mutation
 * (creating/editing/deleting expenses, categories, payment methods, or goals)
 */
export function useInvalidateFinance() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ['stats'] });
    queryClient.invalidateQueries({ queryKey: ['expenses'] });
    queryClient.invalidateQueries({ queryKey: ['categories'] });
    queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
    queryClient.invalidateQueries({ queryKey: ['goals'] });
    queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
  };
}
