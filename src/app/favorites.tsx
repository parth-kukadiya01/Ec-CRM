import React, { useState, useCallback } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    Image,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Alert,
    StatusBar,
} from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import Icon from '../components/Icon';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { B2B } from '../constants/Colors';
import { favoriteService } from '../services/favoriteService';
import ScreenHeader from '../components/ScreenHeader';
import BottomNav from '../components/BottomNav';
import MessageModal from '../components/MessageModal';
import { useCart } from '../context/CartContext';
import { useFocusEffect } from '@react-navigation/native';
import { useResponsive } from '../hooks/useResponsive';

const { GOLD, GOLD_LIGHT, GOLD_DARK, NAVY, NAVY_CARD, NAVY_BORDER, NAVY_INPUT, TEXT_PRIMARY, TEXT_MUTED, GOLD_DIM, NAVY_MID } = B2B;

export default function FavoritesScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    const insets = useSafeAreaInsets();
    const [favorites, setFavorites] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [addingToCart, setAddingToCart] = useState<string | null>(null);

    const [modalConfig, setModalConfig] = useState<{
        visible: boolean;
        title: string;
        message: string;
        type: 'success' | 'error' | 'info';
        onClose?: () => void;
    }>({
        visible: false,
        title: '',
        message: '',
        type: 'success'
    });
    const { width } = useResponsive();
    const CARD_WIDTH = (width - 48) / 2;

    const { updateCartCount } = useCart();

    const fetchFavorites = async () => {
        try {
            setLoading(true);
            const res = await favoriteService.getFavorites();
            if (res.success) {
                setFavorites(res.data || []);
            }
        } catch (error: any) {
            console.error('Error fetching favorites:', error);
            const msg = error.response?.data?.message || 'Failed to load favorites';
            setModalConfig({ visible: true, title: 'Error', message: msg, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            updateCartCount();
            fetchFavorites();
        }, [])
    );

    const removeFavorite = async (id: string) => {
        try {
            await favoriteService.removeFavorite(id);
            setFavorites(current => current.filter((item: any) => (item.id || item._id) !== id));
        } catch (error: any) {
            if (error?.response?.status === 404) {
                setFavorites(current => current.filter((item: any) => (item.id || item._id) !== id));
            } else {
                console.error('Error removing favorite:', error);
                const msg = error.response?.data?.message || 'Failed to remove from favorites';
                setModalConfig({ visible: true, title: 'Error', message: msg, type: 'error' });
            }
        }
    };

    const renderFavorite = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[styles.productCard, { width: CARD_WIDTH }]}
            onPress={() => navigation.navigate('product-details' as any, {
                id: item.id || item._id,
                name: item.name,
                netWt: item.netWt,
                grossWt: item.grossWt,
                image: item.image
            })}
            activeOpacity={0.9}
        >
            <View style={styles.imageContainer}>
                <Image source={{ uri: item.image }} style={styles.productImage} />
                <TouchableOpacity
                    style={styles.favoriteButton}
                    onPress={() => removeFavorite((item.id || item._id).toString())}
                >
                    <Icon name="favorite" size={18} color="#f43f5e" />
                </TouchableOpacity>
            </View>

            <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>

                <View style={styles.weightRow}>
                    {/* <View style={styles.weightItem}> */}
                    <Text style={styles.weightLabel}>NET WT</Text>
                    <Text style={styles.weightValue}>{item.netWt}g</Text>
                    {/* </View> */}
                    {/* <View style={styles.weightItem}>
                        <Text style={styles.weightLabel}>GROSS WT</Text>
                        <Text style={styles.weightValue}>{item.grossWt}g</Text>
                    </View> */}
                </View>

                <View style={styles.materialRow}>
                    <View style={[styles.materialDot, { backgroundColor: GOLD }]} />
                    <Text style={styles.materialText}>{item.goldType || 'Fine Gold'}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={NAVY} />
            <LinearGradient colors={[NAVY, NAVY_MID, '#09101d']} style={styles.background} />

            <MessageModal
                visible={modalConfig.visible}
                title={modalConfig.title}
                message={modalConfig.message}
                type={modalConfig.type}
                onClose={() => {
                    setModalConfig(prev => ({ ...prev, visible: false }));
                    if (modalConfig.onClose) modalConfig.onClose();
                }}
            />

            <ScreenHeader showBack title="Favorites" showCart onPressBack={() => navigation.replace('home' as any)} />

            {/* <View style={styles.headerFilters}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContainer}>
                    <TouchableOpacity style={[styles.filterChip, styles.activeFilterChip]}>
                        <Text style={[styles.filterText, styles.activeFilterText]}>ALL SAVED ITEMS</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View> */}

            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={GOLD} />
                    <Text style={{ marginTop: 12, color: TEXT_MUTED, fontSize: 13, fontWeight: '600' }}>Loading favorites...</Text>
                </View>
            ) : favorites.length === 0 ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 100 }}>
                    <View style={styles.emptyIconContainer}>
                        <Icon name="favorite-border" size={64} color={GOLD_DIM} />
                    </View>
                    <Text style={{ marginTop: 24, color: TEXT_PRIMARY, fontSize: 18, fontWeight: '800', letterSpacing: -0.5 }}>Your wishlist is empty</Text>
                    <Text style={{ marginTop: 8, color: TEXT_MUTED, fontSize: 13, fontWeight: '500', textAlign: 'center', paddingHorizontal: 60, lineHeight: 18 }}>
                        Discover exquisite pieces from our catalog and save them for later
                    </Text>
                    <TouchableOpacity style={styles.browseButton} onPress={() => navigation.navigate('catalog' as any)}>
                        <LinearGradient colors={[GOLD_DARK, GOLD, GOLD_LIGHT]} style={styles.browseButtonGradient}>
                            <Text style={styles.browseButtonText}>EXPLORE CATALOG</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={favorites}
                    renderItem={renderFavorite}
                    keyExtractor={item => (item.id || item._id || '').toString()}
                    numColumns={2}
                    contentContainerStyle={styles.gridContent}
                    columnWrapperStyle={styles.gridColumn}
                    showsVerticalScrollIndicator={false}
                />
            )}

            <BottomNav activeTab="Saved" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: NAVY },
    background: { ...StyleSheet.absoluteFillObject },
    headerFilters: { backgroundColor: 'rgba(10,18,32,0.4)', borderBottomWidth: 1, borderBottomColor: NAVY_BORDER, zIndex: 10 },
    filterContainer: { gap: 8, paddingBottom: 16, paddingHorizontal: 20, paddingTop: 12 },
    filterChip: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24, backgroundColor: NAVY_INPUT, borderWidth: 1, borderColor: NAVY_BORDER },
    activeFilterChip: { backgroundColor: GOLD, borderColor: GOLD, shadowColor: GOLD, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    filterText: { fontSize: 10, fontWeight: '800', color: TEXT_MUTED, letterSpacing: 1, textTransform: 'uppercase' },
    activeFilterText: { color: NAVY, fontWeight: '900' },
    gridContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 100 },
    gridColumn: { justifyContent: 'space-between', marginBottom: 20 },
    // productCard: { borderRadius: 24, padding: 10, backgroundColor: NAVY_CARD, borderWidth: 1, borderColor: NAVY_BORDER, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 5 },
    productCard: { backgroundColor: NAVY_CARD, borderRadius: 24, padding: 10, borderWidth: 1, borderColor: NAVY_BORDER },
    // imageContainer: { width: '100%', aspectRatio: 1, borderRadius: 18, overflow: 'hidden', backgroundColor: NAVY_INPUT },
    imageContainer: { width: '100%', aspectRatio: 1, borderRadius: 18, overflow: 'hidden', backgroundColor: '#000' },
    // productImage: { position: 'absolute', width: '100%', height: '100%' },
    productImage: { ...StyleSheet.absoluteFillObject },
    favoriteButton: { position: 'absolute', top: 8, right: 8, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    productInfo: { padding: 8, },
    productName: { fontSize: 14, fontWeight: '500', color: TEXT_PRIMARY, },
    weightRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, paddingVertical: 6, borderTopWidth: 0.5, borderBottomWidth: 0.5, borderColor: 'rgba(232,201,122,0.1)' },
    weightItem: { alignItems: 'center' },
    weightLabel: { fontSize: 8, fontWeight: '900', color: GOLD_LIGHT },
    weightValue: { fontSize: 13, fontWeight: '700', color: TEXT_PRIMARY },
    materialRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    materialDot: { width: 6, height: 6, borderRadius: 3, borderWidth: 1, borderColor: GOLD_LIGHT },
    materialText: { fontSize: 11, fontWeight: '600', color: TEXT_MUTED },
    emptyIconContainer: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(201,168,76,0.05)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(201,168,76,0.1)' },
    browseButton: { marginTop: 32, borderRadius: 16, overflow: 'hidden', shadowColor: GOLD, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
    browseButtonGradient: { paddingHorizontal: 32, paddingVertical: 16, justifyContent: 'center', alignItems: 'center' },
    browseButtonText: { color: NAVY, fontSize: 12, fontWeight: '900', letterSpacing: 1 },
});
