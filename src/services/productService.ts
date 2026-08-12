import api from './api';

export const productService = {
    getProducts: (params?: any): Promise<any> => api.get('/products', { params }),

    getNewArrivals: (limit: number = 10): Promise<any> => api.get('/products/new-arrivals', { params: { limit } }),

    getCategories: (): Promise<any> => api.get('/categories'),

    getProductDetails: (id: string): Promise<any> => api.get(`/products/${id}`),

    searchProducts: (q: string, params?: any): Promise<any> =>
        api.get('/products/search', { params: { q, ...params } }),

    getBanners: (): Promise<any> => api.get('/banners/hero'),
};

export default productService;
