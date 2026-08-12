import axios, { AxiosError } from 'axios';
import { storage } from './storage';
import { API_BASE_URL } from '../constants/api';

// Callback for unauthorized session events
let onUnauthorized: (() => void) | null = null;
export const setOnUnauthorizedCallback = (cb: () => void) => {
    onUnauthorized = cb;
};

// Debounce flag to prevent multiple simultaneous redirects
let isRedirecting = false;

const handleAuthError = async () => {
    if (isRedirecting) return;
    isRedirecting = true;

    try {
        await storage.deleteItem('userToken');
        await storage.deleteItem('userData');
        console.log('Session cleared - redirecting to login');
        if (onUnauthorized) {
            onUnauthorized();
        }
    } catch (storageError) {
        console.error('Error clearing storage:', storageError);
    }

    // Reset debounce after short delay
    setTimeout(() => {
        isRedirecting = false;
    }, 2000);
};

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 15000, // 15 second timeout to prevent hanging
});

console.log('API base URL:', API_BASE_URL);

// Add a request interceptor to add the JWT token to headers
api.interceptors.request.use(
    async (config) => {
        console.log("📤 API Request:", {
            url: config.url,
            method: config.method,
            headers: config.headers,
            params: config.params,
            data: config.data,
        });
        try {
            const token = await storage.getItem('userToken');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        } catch (error) {
            // Silently fail - don't crash the app
        }
        return config;
    },
    (error) => {
        console.error("❌ API Request Error:", error);
        return Promise.reject(error);
    }
);

// Add a response interceptor for error handling and auto-redirect to login
api.interceptors.response.use(
    (response) => {
        console.log("✅ API Response:", {
            url: response.config.url,
            method: response.config.method,
            status: response.status,
            data: response.data,
        });
        return response;
    },
    async (error: AxiosError) => {
        if (error.response) {
            console.error("❌ API Response Error:", {
                url: error.config?.url,
                status: error.response.status,
                data: error.response.data,
            });

            // Handle 401 Unauthorized — clear session and redirect to login
            // Skip for push-token removal (called during logout when token may already be invalid)
            const url = error.config?.url ?? '';
            const isLogoutRelated = url.includes('/notifications/push-token') || url.includes('/auth/logout');
            if (error.response.status === 401 && !isLogoutRelated) {
                await handleAuthError();
            }
        } else if (error.request) {
            console.error("⚠️ No Response Received:", error.request);
        } else {
            console.error("❌ Request Setup Error:", error.message);
        }
        return Promise.reject(error);
    }
);

export default api;
