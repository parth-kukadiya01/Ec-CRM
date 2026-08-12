import api from './api';

export const favoriteService = {
    getFavorites: async (): Promise<any> => {
        const response = await api.get('/favorites');
        return response.data;
    },

    addFavorite: async (productId: string): Promise<any> => {
        const response = await api.post('/favorites', { productId });
        return response.data;
    },

    removeFavorite: async (productId: string): Promise<any> => {
        const response = await api.delete(`/favorites/${productId}`);
        return response.data;
    },
};

export default favoriteService;
