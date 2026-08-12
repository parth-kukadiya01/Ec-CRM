import api from './api';

export const bannerService = {
    // Get all active banners
    getBanners: async () => {
        return api.get('/banners/hero');
    },
};
