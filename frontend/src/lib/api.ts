import axios from 'axios';

// When running in the browser, using the relative proxy path '/backend-api' guarantees
// that all requests route through Next.js server to the backend without CORS or localhost issues from remote devices.
export const getBaseApiUrl = () => {
  if (typeof window !== 'undefined') {
    if (process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_API_URL.includes('127.0.0.1') && !process.env.NEXT_PUBLIC_API_URL.includes('localhost')) {
      return process.env.NEXT_PUBLIC_API_URL;
    }
    return '/backend-api';
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
};

export const API_BASE = getBaseApiUrl();

export const getBackendBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'http://127.0.0.1:8000';
};

export const getImageUrl = (url?: string | null) => {
  if (!url) return '';
  // S3 URLs and data URIs pass through directly
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  // Relative paths (e.g. /uploads/file.jpg) use the current origin in browser
  // or the backend base URL on the server
  if (typeof window !== 'undefined') {
    return url.startsWith('/') ? url : `/${url}`;
  }
  const backendBase = process.env.INTERNAL_BACKEND_URL || 'http://127.0.0.1:8000';
  return `${backendBase}${url.startsWith('/') ? '' : '/'}${url}`;
};

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
  list: (params?: any) => api.get('/inventory', { params: typeof params === 'string' ? { search: params } : params }),
  create: (data: any) => api.post('/inventory', data),
  update: (id: number, data: any) => api.put(`/inventory/${id}`, data),
  delete: (id: number) => api.delete(`/inventory/${id}`),
};

export const uploadApi = {
  uploadFile: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

export const accountsApi = {
  list: (params?: any) => api.get('/accounts', { params: typeof params === 'string' ? { search: params } : params }),
  create: (data: any) => api.post('/accounts', data),
  update: (id: number, data: any) => api.put(`/accounts/${id}`, data),
  delete: (id: number) => api.delete(`/accounts/${id}`),
};

export const adminCostsApi = {
  list: () => api.get('/admin-costs'),
  createOrUpdate: (data: any) => api.post('/admin-costs', data),
  delete: (month: string) => api.delete(`/admin-costs/${month}`),
};

export const companiesApi = {
  list: (params?: any) => api.get('/companies', { params: typeof params === 'string' ? { search: params } : params }),
  getOne: (id: number) => api.get(`/companies/${id}`),
  create: (data: any) => api.post('/companies', data),
  update: (id: number, data: any) => api.put(`/companies/${id}`, data),
  delete: (id: number) => api.delete(`/companies/${id}`),
};

export const partnersMgmtApi = {
  list: (params?: any) => api.get('/partners-mgmt', { params: typeof params === 'string' ? { search: params } : params }),
  getOne: (id: number) => api.get(`/partners-mgmt/${id}`),
  create: (data: any) => api.post('/partners-mgmt', data),
  update: (id: number, data: any) => api.put(`/partners-mgmt/${id}`, data),
  delete: (id: number) => api.delete(`/partners-mgmt/${id}`),
};

export const ordersApi = {
  list: (params?: any) => api.get('/orders', { params }),
  getOne: (id: number) => api.get(`/orders/${id}`),
  create: (data: any) => api.post('/orders', data),
  createBulk: (data: any[]) => api.post('/orders/bulk', data),
  update: (id: number, data: any) => api.put(`/orders/${id}`, data),
  updateStatus: (id: number, status: string) => api.put(`/orders/${id}`, { status, order_status: status }),
  uploadCsv: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/orders/upload-csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  extractUrlImage: (url: string) => api.get('/orders/extract-url-image', { params: { url } }),
  delete: (id: number) => api.delete(`/orders/${id}`),
};

export const purchasesApi = {
  list: (params?: any) => api.get('/purchases', { params }),
  create: (data: any) => api.post('/purchases', data),
  update: (id: number, data: any) => api.put(`/purchases/${id}`, data),
  delete: (id: number) => api.delete(`/purchases/${id}`),
};

export const shipmentsApi = {
  list: (params?: any) => api.get('/shipments', { params }),
  create: (data: any) => api.post('/shipments', data),
  update: (id: number, data: any) => api.put(`/shipments/${id}`, data),
  delete: (id: number) => api.delete(`/shipments/${id}`),
};

export const usersApi = {
  list: (params?: any) => api.get('/users', { params }),
  getOne: (id: number) => api.get(`/users/${id}`),
  getMyProfile: () => api.get('/users/me/profile'),
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

export const employeeSalaryApi = {
  list: (userId: number) => api.get(`/users/${userId}/salary`),
  create: (userId: number, data: any) => api.post(`/users/${userId}/salary`, data),
  update: (userId: number, salaryId: number, data: any) => api.put(`/users/${userId}/salary/${salaryId}`, data),
  delete: (userId: number, salaryId: number) => api.delete(`/users/${userId}/salary/${salaryId}`),
};

export const employeeAssetsApi = {
  list: (userId: number) => api.get(`/users/${userId}/assets`),
  create: (userId: number, data: any) => api.post(`/users/${userId}/assets`, data),
  update: (userId: number, assetId: number, data: any) => api.put(`/users/${userId}/assets/${assetId}`, data),
  delete: (userId: number, assetId: number) => api.delete(`/users/${userId}/assets/${assetId}`),
};

export const employeeDocumentsApi = {
  list: (userId: number) => api.get(`/users/${userId}/documents`),
  create: (userId: number, data: any) => api.post(`/users/${userId}/documents`, data),
  update: (userId: number, docId: number, data: any) => api.put(`/users/${userId}/documents/${docId}`, data),
  delete: (userId: number, docId: number) => api.delete(`/users/${userId}/documents/${docId}`),
};

export const expenseClaimsApi = {
  create: (data: any) => api.post('/expense-claims', data),
  getMyClaims: (params?: any) => api.get('/expense-claims/my', { params }),
  getAllClaims: (params?: any) => api.get('/expense-claims', { params }),
  updateStatus: (id: number, data: any) => api.put(`/expense-claims/${id}/status`, data),
};

export const tasksApi = {
  create: (data: any) => api.post('/tasks', data),
  list: (allTasks?: boolean, params?: any) => api.get('/tasks', { params: typeof allTasks === 'boolean' ? { all_tasks: allTasks, ...params } : allTasks }),
  getOne: (id: number) => api.get(`/tasks/${id}`),
  update: (id: number, data: any) => api.put(`/tasks/${id}`, data),
  updateStatus: (id: number, status: string, comment?: string) => api.patch(`/tasks/${id}/status`, { status, comment }),
  addComment: (id: number, notes: string) => api.post(`/tasks/${id}/history`, { notes }),
};

export const financeApi = {
  getSummary: (period?: string) => api.get('/finance/summary', { params: { period: period || 'all' } }),
  getBreakdown: (period?: string) => api.get('/finance/breakdown', { params: { period: period || 'all' } }),
};

