import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from '../components/Icon';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCart } from '../context/CartContext';
import { useState, useEffect } from 'react';
import api from '../services/api';
import { B2B } from '../constants/Colors';

const { GOLD, GOLD_DARK, NAVY, NAVY_CARD, NAVY_BORDER, TEXT_PRIMARY, TEXT_MUTED } = B2B;

interface BottomNavProps {
    activeTab: 'Home' | 'Catalog' | 'Orders' | 'Account' | 'Saved' | 'Profile' | 'Notifications';
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab }) => {
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    const insets = useSafeAreaInsets();
    const { cartCount } = useCart();
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        const fetchUnread = async () => {
            try {
                const res = await api.get('/notifications');
                const count = res.data?.data?.notifications?.filter((n: any) => !n.isRead).length || 0;
                setUnreadCount(count);
            } catch (error) {
                console.log('Failed to fetch unread notifications');
            }
        };
        fetchUnread();
    }, []);

    const navItems = [
        { id: 'Home', icon: 'home', label: 'HOME', route: '/home' },
        { id: 'Catalog', icon: 'grid-view', label: 'CATALOG', route: '/catalog' },
        { id: 'Saved', icon: 'favorite-border', label: 'SAVED', route: '/favorites' },
        { id: 'Orders', icon: 'shopping-cart', label: 'CART', route: '/cart' }, // Changed label to CART for clarity
        { id: 'Account', icon: 'account-circle', label: 'PROFILE', route: '/profile' },
    ];

    const isActive = (itemId: string) => {
        if (itemId === activeTab) return true;
        if (itemId === 'Account' && activeTab === 'Profile') return true;
        return false;
    };

    return (
        <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            {navItems.map((item) => (
                <TouchableOpacity
                    key={item.id}
                    style={styles.navItem}
                    onPress={() => {
                        const targetRoute = item.id === 'Catalog' ? 'catalog' : item.route.replace('/', '');
                        const params = item.id === 'Catalog' ? { categoryId: null, categoryName: 'All', timestamp: Date.now() } : undefined;

                        if (targetRoute === 'home') {
                            navigation.reset({
                                index: 0,
                                routes: [{ name: 'home' }],
                            });
                        } else {
                            navigation.reset({
                                index: 1,
                                routes: [
                                    { name: 'home' },
                                    { name: targetRoute, params: params as any },
                                ],
                            });
                        }
                    }}
                >
                    <View style={styles.iconWrapper}>
                        <Icon
                            name={item.icon as any}
                            size={24}
                            color={isActive(item.id) ? GOLD : '#5a6b8e'}
                        />
                        {item.id === 'Orders' && cartCount > 0 && (
                            <View style={styles.badgeCount}>
                                <Text style={styles.badgeText}>{cartCount}</Text>
                            </View>
                        )}
                        {item.id === 'Notifications' && unreadCount > 0 && (
                            <View style={[styles.badgeCount, { backgroundColor: '#ef4444' }]}>
                                <Text style={styles.badgeText}>{unreadCount}</Text>
                            </View>
                        )}
                    </View>
                    <Text style={[styles.navText, isActive(item.id) && { color: GOLD }]}>
                        {item.label}
                    </Text>
                    {isActive(item.id) && <View style={styles.activeIndicator} />}
                </TouchableOpacity>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    bottomNav: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 16,
        backgroundColor: '#0a101a', // Deeper navy for bottom nav
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -12 },
        shadowOpacity: 0.3,
        shadowRadius: 24,
        elevation: 15,
    },
    navItem: {
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    iconWrapper: {
        marginBottom: 4,
        position: 'relative',
    },
    navText: {
        fontSize: 8,
        fontWeight: '900',
        color: '#5a6b8e',
        letterSpacing: 1,
    },
    activeIndicator: {
        width: 12,
        height: 2,
        backgroundColor: GOLD,
        borderRadius: 1,
        marginTop: 6,
    },
    badgeCount: {
        position: 'absolute',
        top: -4,
        right: -8,
        backgroundColor: GOLD,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#0a101a',
        paddingHorizontal: 2,
    },
    badgeText: {
        color: NAVY,
        fontSize: 8,
        fontWeight: '900',
    },
});

export default BottomNav;
