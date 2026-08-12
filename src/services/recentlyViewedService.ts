import api from './api';

export const recentlyViewedService = {
    trackView: (productId: string): Promise<any> =>
        api.post('/recently-viewed', { productId }),

    getRecentlyViewed: (limit: number = 10): Promise<any> =>
        api.get('/recently-viewed', { params: { limit } }),

    clearRecentlyViewed: (): Promise<any> =>
        api.delete('/recently-viewed'),
};

export default recentlyViewedService;
