import api from './api';

export const tpinService = {
    getStatus: async (): Promise<any> => {
        try {
            const response = await api.get('/tpin/status');
            return response.data;
        } catch (error) {
            console.error('Error fetching T-PIN status:', error);
            throw error;
        }
    },

    generate: async (tpin: string): Promise<any> => {
        try {
            const response = await api.post('/tpin/generate', { tpin });
            return response.data;
        } catch (error) {
            console.error('Error generating T-PIN:', error);
            throw error;
        }
    },

    verify: async (tpin: string): Promise<any> => {
        try {
            const response = await api.post('/tpin/verify', { tpin });
            return response.data;
        } catch (error) {
            console.error('Error verifying T-PIN:', error);
            throw error;
        }
    },

    update: async (currentTpin: string, newTpin: string): Promise<any> => {
        try {
            const response = await api.put('/tpin/update', { currentTpin, newTpin });
            return response.data;
        } catch (error) {
            console.error('Error updating T-PIN:', error);
            throw error;
        }
    },
};

export default tpinService;
