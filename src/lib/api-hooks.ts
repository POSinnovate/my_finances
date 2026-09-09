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

export function useExpenses(month?: string) {
  return useQuery({
    queryKey: ['expenses', 'list', month || 'ALL'],
    queryFn: async () => {
      const url = month && month !== 'ALL' ? `/api/expenses?month=${month}` : '/api/expenses';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Error al cargar movimientos');
      const data = await res.json();
      return data.expenses || [];
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
