import api from './api';

export const orderService = {
    getOrders: async (params?: any): Promise<any> => {
        try {
            const response = await api.get('/orders', { params });
            return response.data;
        } catch (error) {
            console.error('Error fetching orders:', error);
            throw error;
        }
    },

    getOrderById: async (id: string): Promise<any> => {
        try {
            const response = await api.get(`/orders/${id}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching order details:', error);
            throw error;
        }
    }
};

export default orderService;
