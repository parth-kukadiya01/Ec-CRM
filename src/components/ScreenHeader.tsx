import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import Icon from '../components/Icon';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCart } from '../context/CartContext';
import { B2B } from '../constants/Colors';

const { GOLD, NAVY, NAVY_CARD, NAVY_BORDER, TEXT_PRIMARY } = B2B;

interface ScreenHeaderProps {
    title?: string;
    showBrand?: boolean;
    showBack?: boolean;
    showSearch?: boolean;
    showNotification?: boolean;
    showCart?: boolean;
    rightElement?: React.ReactNode;
    onPressBack?: () => void;
}

const ScreenHeader: React.FC<ScreenHeaderProps> = ({
    title,
    showBrand = false,
    showBack = false,
    showSearch = false,
    showNotification = false,
    showCart = false,
    rightElement,
    onPressBack
}) => {
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    const insets = useSafeAreaInsets();
    const { cartCount } = useCart();

    return (
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
            <View style={styles.headerLeft}>
                {showBack && (
                    <TouchableOpacity style={styles.iconButton} onPress={onPressBack || (() => navigation.goBack())}>
                        <Icon name="arrow-back-ios" size={20} color={GOLD} style={{ marginLeft: 6 }} />
                    </TouchableOpacity>
                )}

                {showBrand && (
                    <View style={styles.brandRow}>
                        <TouchableOpacity onPress={() => navigation.navigate('profile' as any)}>
                            <Image
                                source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAmYvC62LstT5Ho5pBcRjIiD_AxipO6HhqLcSMQeJ2uHa6XvKnzZnJ4BJbXnGruYjLa2MWTYuVH2rdzHrfGp0YTZT2gvHg_vZ8Ctxd7HRIFoO1XeYxejhUkSc87ay0WEqYIF_CyIJvaGD33hrq86GxSKFga3qgeepv-Mr1zEQbnJSptOY20C07PiR4n4VIi-W-NMf7eFTJ1DZjil7GBMnchOgBS5eXLsMoMDoOeSWpR8B__6rRTykuwsFfG50Bg8XRcN5x8zLwEeEA' }}
                                style={styles.profileImage}
                            />
                        </TouchableOpacity>
                        <View>
                            <Text style={styles.portalText}>SV GOLD</Text>
                            <Text style={styles.brandText}>Wholesale Portal</Text>
                        </View>
                    </View>
                )}

                {title && !showBrand && (
                    <Text style={styles.headerTitle}>{title}</Text>
                )}
            </View>

            <View style={styles.headerRight}>
                {showSearch && (
                    <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('search' as any)}>
                        <Icon name="search" size={24} color={GOLD} />
                    </TouchableOpacity>
                )}

                {showNotification && (
                    <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('notifications' as any)}>
                        <Icon name="notifications-none" size={24} color={GOLD} />
                        <View style={styles.notificationDot} />
                    </TouchableOpacity>
                )}

                {showCart && (
                    <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('cart' as any)}>
                        <Icon name="shopping-bag" size={22} color={GOLD} />
                        {cartCount > 0 && (
                            <View style={styles.cartBadge}>
                                <Text style={styles.cartBadgeText}>{cartCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                )}

                {rightElement}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        paddingBottom: 10,
        paddingHorizontal: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: NAVY_BORDER,
        backgroundColor: NAVY,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    brandRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    profileImage: {
        width: 44,
        height: 44,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: NAVY_BORDER,
    },
    portalText: {
        fontSize: 10,
        fontWeight: '900',
        color: GOLD,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
    },
    brandText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: TEXT_PRIMARY,
    },
    headerTitle: {
        fontSize: 13,
        fontWeight: '900',
        color: GOLD,
        letterSpacing: 2,
        textTransform: 'uppercase',
    },
    headerRight: {
        flexDirection: 'row',
        gap: 8,
    },
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: NAVY_CARD,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: NAVY_BORDER,
    },
    notificationDot: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#fb7185',
        borderWidth: 1,
        borderColor: NAVY,
    },
    cartBadge: {
        position: 'absolute',
        top: -2,
        right: -2,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: GOLD,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: NAVY,
        paddingHorizontal: 4,
    },
    cartBadgeText: {
        color: NAVY,
        fontSize: 9,
        fontWeight: '900',
    },
});

export default ScreenHeader;
