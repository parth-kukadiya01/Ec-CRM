import React, { createContext, useContext, useState, useEffect } from 'react';
import { cartService } from '../services/cartService';

import { storage } from '../services/storage';

interface CartContextType {
    cartCount: number;
    updateCartCount: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [cartCount, setCartCount] = useState(0);

    const updateCartCount = async () => {
        try {
            const token = await storage.getItem('userToken');
            if (!token) {
                setCartCount(0);
                return;
            }

            const response = await cartService.getCart();
            if (response.success) {
                const totalQuantity = response.data.summary.totalQuantity || response.data.items.length;
                setCartCount(totalQuantity);
            }
        } catch (error) {
            // Silently fail — don't crash. API interceptor handles auth redirect.
            setCartCount(0);
        }
    };

    useEffect(() => {
        updateCartCount();
    }, []);

    return (
        <CartContext.Provider value={{ cartCount, updateCartCount }}>
            {children}
        </CartContext.Provider>
    );
}

export const useCart = () => {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};
