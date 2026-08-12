// API Configuration Constants
import { Platform } from 'react-native';

// Base URL for the backend server
// Local development (LAN):
// export const BASE_URL = 'http://192.168.1.4:5001/api/v1';
// export const BASE_URL = 'http://192.168.1.69:5001/api/v1';

// Production server
export const BASE_URL = 'https://sv.riolls.com/api/v1';

// Base API URL - configures based on platform
export const API_BASE_URL = `${BASE_URL}`;

// Health check endpoint
export const API_HEALTH_URL = 'https://sv.riolls.com/health';

// Helper to construct full image URL
export const getImageUrl = (path: string | undefined | null) => {
    if (!path) return 'https://via.placeholder.com/400';
    if (path.startsWith('http')) {
        // Replace any local/LAN references with production domain
        return path
            .replace('http://localhost:5001', 'https://sv.riolls.com')
            .replace('http://127.0.0.1:5001', 'https://sv.riolls.com')
            .replace(/http:\/\/192\.168\.\d+\.\d+:5001/, 'https://sv.riolls.com');
    }
    return `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};

// API Endpoints
export const API_ENDPOINTS = {
    AUTH: {
        LOGIN: '/auth/login',
        REGISTER: '/auth/register',
        LOGOUT: '/auth/logout',
    },
    PRODUCTS: {
        BASE: '/products',
        NEW_ARRIVALS: '/products/new-arrivals',
        SEARCH: '/products/search',
        DETAILS: (id: string) => `/products/${id}`,
    },
    CATEGORIES: {
        BASE: '/categories',
    },
    CART: {
        BASE: '/cart',
    },
    FAVORITES: {
        BASE: '/favorites',
    },
    ORDERS: {
        BASE: '/orders',
        DETAILS: (id: string) => `/orders/${id}`,
    },
    NOTIFICATIONS: {
        BASE: '/notifications',
    },
    USER: {
        PROFILE: '/users/profile',
    },
    TPIN: {
        GENERATE: '/tpin/generate',
        VERIFY: '/tpin/verify',
        STATUS: '/tpin/status',
        UPDATE: '/tpin/update',
    },
};
