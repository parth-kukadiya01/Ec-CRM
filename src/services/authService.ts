import api from './api';
import { storage } from './storage';

export const authService = {
    login: async (email: string, password: string): Promise<any> => {
        const response = await api.post('/auth/login', { email, password });
        console.log('Login response:', response);
        if (response.data.data.token) {
            await storage.setItem('userToken', response.data.data.token);
            await storage.setItem('userData', JSON.stringify(response.data.data.user));
        }
        return response.data;
    },

    register: async (userData: any): Promise<any> => {
        const response = await api.post('/auth/register', userData);
        // Note: Registration now returns { success: true, message: '...', userId: '...' } 
        // without a token because approval is required.
        return response.data;
    },

    logout: async (): Promise<void> => {
        try {
            const token = await storage.getItem('userToken');
            if (token) {
                // Assuming we also have fcmToken stored, or we just remove by FCM token?
                // Wait, removePushToken takes the expo push token (FCM token). We need to get it from storage if saved, or use messaging().getToken().
                // Since this is authService, requiring messaging might be tricky. Let's import messaging and delete.
                const messaging = require('@react-native-firebase/messaging').default;
                const fcmToken = await messaging().getToken();
                if (fcmToken) {
                    const { notificationService } = require('./notificationService');
                    await notificationService.removePushToken(fcmToken);
                }
            }
        } catch (e) {
            console.error('Failed to remove push token on logout', e);
        }
        await storage.deleteItem('userToken');
        await storage.deleteItem('userData');
    },

    getCurrentUser: async (): Promise<any | null> => {
        const userStr = await storage.getItem('userData');
        return userStr ? JSON.parse(userStr) : null;
    },

    isAuthenticated: async (): Promise<boolean> => {
        const token = await storage.getItem('userToken');
        if (!token) return false;

        try {
            // Verify token with backend - /auth/me is protected
            await api.get('/auth/me');
            return true;
        } catch (error) {
            // Token is invalid/expired (interceptor in api.ts will clear it if 401)
            return false;
        }
    },

    forgotPassword: async (email: string): Promise<any> => {
        const response = await api.post('/auth/forgot-password', { email });
        return response.data;
    },

    resetPassword: async (token: string, password: string): Promise<any> => {
        // Backend expects token in URL: PUT /api/v1/auth/reset-password/:token
        // We treat the token as the OTP code
        const response = await api.put(`/auth/reset-password/${token}`, { password });
        // If successful, backend returns a new token for auto-login
        if (response.data.token) {
            await storage.setItem('userToken', response.data.token);
            // We might need to fetch user data again if backend doesn't return full user object
            // But usually resetPassword just logs them in
        }
        return response.data;
    }
};

export default authService;
