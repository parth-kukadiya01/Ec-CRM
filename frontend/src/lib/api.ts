import axios from 'axios';

const API_BASE = 'http://127.0.0.1:8000/api/v1';

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('crm_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== 'undefined' && error.response?.status === 401) {
      localStorage.removeItem('crm_token');
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

// API Helper Endpoints
export const authApi = {
  login: (data: any) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

export const inventoryApi = {
  list: (search?: string) => api.get('/inventory', { params: { search } }),
  create: (data: any) => api.post('/inventory', data),
  update: (id: number, data: any) => api.put(`/inventory/${id}`, data),
  delete: (id: number) => api.delete(`/inventory/${id}`),
};

export const accountsApi = {
  list: (search?: string) => api.get('/accounts', { params: { search } }),
  create: (data: any) => api.post('/accounts', data),
  update: (id: number, data: any) => api.put(`/accounts/${id}`, data),
  delete: (id: number) => api.delete(`/accounts/${id}`),
};

export const ordersApi = {
  list: (params?: any) => api.get('/orders', { params }),
  getOne: (id: number) => api.get(`/orders/${id}`),
  create: (data: any) => api.post('/orders', data),
  update: (id: number, data: any) => api.put(`/orders/${id}`, data),
  delete: (id: number) => api.delete(`/orders/${id}`),
};

export const purchasesApi = {
  list: () => api.get('/purchases'),
  create: (data: any) => api.post('/purchases', data),
  update: (id: number, data: any) => api.put(`/purchases/${id}`, data),
  delete: (id: number) => api.delete(`/purchases/${id}`),
};

export const shipmentsApi = {
  list: () => api.get('/shipments'),
  create: (data: any) => api.post('/shipments', data),
  update: (id: number, data: any) => api.put(`/shipments/${id}`, data),
  delete: (id: number) => api.delete(`/shipments/${id}`),
};

export const usersApi = {
  list: () => api.get('/users'),
  getOne: (id: number) => api.get(`/users/${id}`),
  create: (data: any) => api.post('/users', data),
  update: (id: number, data: any) => api.put(`/users/${id}`, data),
  delete: (id: number) => api.delete(`/users/${id}`),
};

export const rolesApi = {
  list: () => api.get('/roles'),
  listPermissions: () => api.get('/roles/permissions'),
  create: (data: any) => api.post('/roles', data),
  update: (id: number, data: any) => api.put(`/roles/${id}`, data),
  delete: (id: number) => api.delete(`/roles/${id}`),
};
