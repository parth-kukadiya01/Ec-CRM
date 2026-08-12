import React, { useEffect, useRef } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Animated,
} from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from './Icon';
import { B2B } from '../constants/Colors';

const { GOLD, GOLD_LIGHT, GOLD_DARK, NAVY, NAVY_CARD, NAVY_BORDER, TEXT_PRIMARY, TEXT_MUTED } = B2B;

interface CartToastProps {
    visible: boolean;
    cartCount: number;
    onViewCart: () => void;
    onDismiss: () => void;
}

/**
 * A premium sliding toast bar that replaces the "Added to Cart" popup.
 * Shows item count on the left and a "View Cart" button on the right.
 * Auto-dismisses after 4 seconds.
 */
export default function CartToast({ visible, cartCount, onViewCart, onDismiss }: CartToastProps) {
    const translateY = useRef(new Animated.Value(120)).current;
    const insets = useSafeAreaInsets();

    useEffect(() => {
        if (visible) {
            // Slide in
            Animated.spring(translateY, {
                toValue: 0,
                useNativeDriver: true,
                tension: 70,
                friction: 10,
            }).start();

            // Auto-dismiss after 5 seconds
            const timer = setTimeout(() => {
                slideOut();
            }, 5000);

            return () => clearTimeout(timer);
        }
    }, [visible]);

    const slideOut = () => {
        Animated.timing(translateY, {
            toValue: 120,
            duration: 280,
            useNativeDriver: true,
        }).start(() => onDismiss());
    };

    if (!visible) return null;

    return (
        <Animated.View
            style={[
                styles.container,
                { bottom: insets.bottom + 80, transform: [{ translateY }] },
            ]}
        >
            <View style={styles.card}>
                {/* Left: Cart info */}
                <View style={styles.infoSide}>
                    <View style={styles.iconBubble}>
                        <Icon name="shopping-bag" size={18} color={GOLD} />
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{cartCount}</Text>
                        </View>
                    </View>
                    <View style={styles.textGroup}>
                        <Text style={styles.addedText}>Added to Cart</Text>
                        <Text style={styles.countText}>{cartCount} item{cartCount !== 1 ? 's' : ''} in cart</Text>
                    </View>
                </View>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Right: View Cart button */}
                <TouchableOpacity
                    style={styles.viewCartBtn}
                    onPress={() => {
                        slideOut();
                        setTimeout(onViewCart, 150);
                    }}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={[GOLD_DARK, GOLD, GOLD_LIGHT]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.viewCartGradient}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, margin: 8, }}>
                            <Text style={styles.viewCartText}>View Cart</Text>
                            <Icon name="arrow-forward-ios" size={12} color={NAVY} />
                        </View>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 16,
        right: 16,
        zIndex: 9999,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: NAVY_CARD,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: NAVY_BORDER,
        paddingVertical: 12,
        paddingHorizontal: 16,
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 10,
    },
    infoSide: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconBubble: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(201,168,76,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(201,168,76,0.25)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    badge: {
        position: 'absolute',
        top: -4,
        right: -4,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: GOLD,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '900',
        color: NAVY,
    },
    textGroup: {
        gap: 2,
    },
    addedText: {
        fontSize: 13,
        fontWeight: '700',
        color: TEXT_PRIMARY,
    },
    countText: {
        fontSize: 11,
        fontWeight: '500',
        color: TEXT_MUTED,
    },
    divider: {
        width: 1,
        height: 36,
        backgroundColor: NAVY_BORDER,
    },
    viewCartBtn: {
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: 'red',
        // paddingHorizontal: 14,
    },
    viewCartGradient: {
        // flexDirection: 'row',
        // alignItems: 'center',
        // gap: 4,
        // paddingHorizontal: 14,
        // paddingVertical: 10,
    },
    viewCartText: {
        fontSize: 12,
        fontWeight: '900',
        color: NAVY,
        letterSpacing: 0.5,
    },
});
