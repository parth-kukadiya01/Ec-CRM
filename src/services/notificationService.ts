import api from './api';

export const notificationService = {
    /**
     * Register push token with backend
     * @param token Expo push token
     */
    registerPushToken: async (token: string) => {
        try {
            const response = await api.post('/notifications/push-token', { token });
            return response.data;
        } catch (error) {
            console.error('Error registering push token:', error);
            throw error;
        }
    },

    /**
     * Remove push token from backend (logout)
     * @param token Expo push token
     */
    removePushToken: async (token: string) => {
        try {
            const response = await api.delete('/notifications/push-token', { data: { token } });
            return response.data;
        } catch (error) {
            // Best-effort cleanup: log but don't throw so logout always succeeds
            // even when the token is already expired or the server rejects with 401
            console.warn('Could not remove push token (non-fatal):', (error as any)?.response?.status ?? error);
        }
    },
};
