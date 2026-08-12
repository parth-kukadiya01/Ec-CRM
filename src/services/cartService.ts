import api from './api';

export const cartService = {
    getCart: async (): Promise<any> => {
        try {
            const response = await api.get('/cart');
            return response.data;
        } catch (error) {
            console.error('Error fetching cart:', error);
            throw error;
        }
    },

    addToCart: async (productId: string, quantity: number = 1, options?: { note?: string; size?: string; material?: string; purity?: string }): Promise<any> => {
        try {
            const response = await api.post('/cart', { productId, quantity, ...options });
            return response.data;
        } catch (error) {
            console.error('Error adding to cart:', error);
            throw error;
        }
    },

    updateCartItem: async (cartItemId: string, quantity: number): Promise<any> => {
        try {
            const response = await api.patch(`/cart/${cartItemId}`, { quantity });
            return response.data;
        } catch (error) {
            console.error('Error updating cart item:', error);
            throw error;
        }
    },

    removeCartItem: async (cartItemId: string): Promise<any> => {
        try {
            const response = await api.delete(`/cart/${cartItemId}`);
            return response.data;
        } catch (error) {
            console.error('Error removing from cart:', error);
            throw error;
        }
    },

    clearCart: async (): Promise<any> => {
        try {
            const response = await api.delete('/cart/clear');
            return response.data;
        } catch (error) {
            console.error('Error clearing cart:', error);
            throw error;
        }
    },

    placeOrder: async (tpin: string): Promise<any> => {
        try {
            const response = await api.post('/orders', { tpin });
            return response.data;
        } catch (error) {
            console.error('Error placing order:', error);
            throw error;
        }
    }
};

export default cartService;
