import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    Image,
    TouchableOpacity,
    TextInput,
    FlatList,
    ActivityIndicator,
    Modal,
    Alert,
} from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import { StatusBar } from 'react-native';
import Icon from '../components/Icon';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { B2B } from '../constants/Colors';
import { useCart } from '../context/CartContext';
import { useFocusEffect } from '@react-navigation/native';
import { productService } from '../services/productService';
import { favoriteService } from '../services/favoriteService';
import { getImageUrl } from '../constants/api';
import { useResponsive } from '../hooks/useResponsive';
import BottomNav from '../components/BottomNav';

const { GOLD, GOLD_LIGHT, GOLD_DARK, NAVY, NAVY_CARD, NAVY_BORDER, NAVY_INPUT, TEXT_PRIMARY, TEXT_MUTED, GOLD_DIM, GOLD_BORDER, NAVY_MID } = B2B;

export default function CatalogScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    const route = useRoute<any>();
    const insets = useSafeAreaInsets();
    const { categoryId, categoryName, timestamp } = route.params || {};
    const { width } = useResponsive();
    const CARD_WIDTH = (width - 48) / 2;

    const [activeFilter, setActiveFilter] = useState('All');
    const [activeFilterId, setActiveFilterId] = useState<string | null>(null);
    const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const { cartCount, updateCartCount } = useCart();

    const [showRefine, setShowRefine] = useState(false);
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState('desc');

    const routeParamsRef = useRef(route.params);
    routeParamsRef.current = route.params;

    const sortRef = useRef({ sortBy, sortOrder });
    sortRef.current = { sortBy, sortOrder };

    const fetchProducts = useCallback(async (filterId: string | null) => {
        try {
            setLoading(true);
            const params: any = { sortBy: sortRef.current.sortBy, sortOrder: sortRef.current.sortOrder };
            if (filterId) {
                params.category = filterId;
            }
            const res = await productService.getProducts(params);
            const products = res.data.data.products || [];
            setFilteredProducts(products);
        } catch (error) {
            console.error('Error fetching products:', error);
            setFilteredProducts([]);
        } finally {
            setLoading(false);
        }
    }, []);
    useFocusEffect(
        useCallback(() => {
            console.log("categoryId", categoryId);
            updateCartCount();
            const params: any = routeParamsRef.current || {};
            const catId: string | null = params.categoryId || activeFilterId || null;
            const catName: string = params.categoryName || 'All';
            setActiveFilterId(catId);
            setActiveFilter(catName);
            console.log("catId", catId);
            fetchProducts(catId);
        }, [categoryId, sortBy, sortOrder])
    );

    // useEffect(() => {
    //     console.log("sortBy", sortBy);
    //     fetchProducts(activeFilterId);
    // }, [sortBy, sortOrder]);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await productService.getCategories();
                setCategories(res.data.data);
            } catch (error) {
                console.error('Error fetching categories:', error);
            }
        };
        fetchCategories();
    }, []);

    const handleFilterPress = (filterName: string, filterId: string | null) => {
        if (activeFilter !== filterName) {
            setActiveFilter(filterName);
            setActiveFilterId(filterId);
            fetchProducts(filterId);
        }
    };

    const handleToggleFavorite = async (item: any) => {
        const productId = item._id || item.id;
        try {
            if (item.isFavorite) {
                await favoriteService.removeFavorite(productId);
            } else {
                await favoriteService.addFavorite(productId);
            }
            setFilteredProducts(current =>
                current.map(p =>
                    (p._id || p.id) === productId
                        ? { ...p, isFavorite: !p.isFavorite }
                        : p
                )
            );
        } catch (error: any) {
            const msg = error?.response?.data?.message || 'Failed to update favorite';
            if (error?.response?.status === 400 || msg === 'Product already in favorites') {
                setFilteredProducts(current =>
                    current.map(p =>
                        (p._id || p.id) === productId
                            ? { ...p, isFavorite: true }
                            : p
                    )
                );
            }
        }
    };

    const handleApplyRefine = () => {
        setShowRefine(false);
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        try {
            setLoading(true);
            const res = await productService.getProducts({ search: searchQuery });
            const products = res.data.data.products || [];
            setFilteredProducts(products);
        } catch (error: any) {
            console.error('Error searching products:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderProduct = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[styles.productCard, { width: CARD_WIDTH }]}
            onPress={() => navigation.navigate('product-details' as any, {
                id: item._id || item.id,
                ...item
            })}
            activeOpacity={0.9}
        >
            <View style={styles.imageContainer}>
                <Image source={{ uri: getImageUrl(item.image || item.images?.[0]) }} style={styles.productImage} />
                <TouchableOpacity
                    style={styles.favoriteButton}
                    onPress={() => handleToggleFavorite(item)}
                >
                    <Icon
                        name={item.isFavorite ? "favorite" : "favorite-border"}
                        size={18}
                        color={item.isFavorite ? GOLD : TEXT_MUTED}
                    />
                </TouchableOpacity>
            </View>

            <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.designText}>DESIGN NO. {item.designNumber || item.ref || 'N/A'}</Text>
                <Text style={styles.tagText}>TAG NO. {item.tagNumber || 'N/A'}</Text>
                <View style={styles.weightRow}>
                    <Text style={styles.weightLabel}>NET WT</Text>
                    <Text style={styles.weightValue}>{item.netWt} GM</Text>
                </View>
                <TouchableOpacity
                    style={styles.viewBtn}
                    onPress={() => navigation.navigate('product-details' as any, { id: item._id || item.id, ...item })}
                >
                    <Text style={styles.viewBtnText}>VIEW DETAILS</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={NAVY} />

            <LinearGradient
                colors={[NAVY, NAVY_MID, '#09101d']}
                style={styles.background}
            />

            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <View style={styles.topBar}>
                    <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.replace('home' as any)}>
                        <Icon name="arrow-back-ios" size={20} color={GOLD} style={{ marginLeft: 6 }} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>COLLECTIONS</Text>
                    <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('cart' as any)}>
                        <Icon name="shopping-cart" size={20} color={GOLD} />
                        {cartCount > 0 && <View style={styles.badge} />}
                    </TouchableOpacity>
                </View>

                <View style={styles.searchWrap}>
                    <View style={styles.searchBar}>
                        <Icon name="search" size={18} color={GOLD} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search masterpiece..."
                            placeholderTextColor={TEXT_MUTED}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            onSubmitEditing={handleSearch}
                            returnKeyType="search"
                        />
                    </View>
                    <TouchableOpacity style={styles.refineBtn} onPress={() => setShowRefine(true)}>
                        <Icon name="tune" size={20} color={GOLD} />
                    </TouchableOpacity>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                    <TouchableOpacity
                        style={[styles.filterPill, activeFilter === 'All' && styles.filterPillActive]}
                        onPress={() => handleFilterPress('All', null)}
                    >
                        <Text style={[styles.filterText, activeFilter === 'All' && styles.filterTextActive]}>ALL</Text>
                    </TouchableOpacity>
                    {categories.map((cat) => (
                        <TouchableOpacity
                            key={cat._id}
                            style={[styles.filterPill, activeFilter === cat.name && styles.filterPillActive]}
                            onPress={() => handleFilterPress(cat.name, cat._id)}
                        >
                            <Text style={[styles.filterText, activeFilter === cat.name && styles.filterTextActive]}>{cat.name.toUpperCase()}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <FlatList
                data={filteredProducts}
                renderItem={renderProduct}
                keyExtractor={item => (item._id || item.id || '').toString()}
                numColumns={2}
                contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
                columnWrapperStyle={styles.columnWrapper}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                    <View style={styles.listHeader}>
                        <Text style={styles.resultsCount}>{filteredProducts.length} DESIGNS FOUND</Text>
                        <View style={styles.headerLine} />
                    </View>
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Icon name="search-off" size={60} color={NAVY_BORDER} />
                        <Text style={styles.emptyText}>No matches found</Text>
                    </View>
                }
            />

            <BottomNav activeTab="Catalog" />

            <Modal visible={showRefine} transparent animationType="fade" onRequestClose={() => setShowRefine(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>REFINE RESULTS</Text>
                            <TouchableOpacity onPress={() => setShowRefine(false)}>
                                <Icon name="close" size={24} color={GOLD} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalSub}>SORT BY PREFERENCE</Text>
                        <View style={styles.sortList}>
                            {[
                                { label: 'Newest First', value: 'createdAt', order: 'desc' },
                                { label: 'Weight: Low to High', value: 'netWt', order: 'asc' },
                                { label: 'Weight: High to Low', value: 'netWt', order: 'desc' },
                            ].map((opt) => (
                                <TouchableOpacity
                                    key={`${opt.value}-${opt.order}`}
                                    style={[styles.sortOpt, sortBy === opt.value && sortOrder === opt.order && styles.sortOptActive]}
                                    onPress={() => { setSortBy(opt.value); setSortOrder(opt.order); }}
                                >
                                    <Text style={[styles.sortText, sortBy === opt.value && sortOrder === opt.order && styles.sortTextActive]}>{opt.label}</Text>
                                    {sortBy === opt.value && sortOrder === opt.order && <Icon name="check" size={18} color={NAVY} />}
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity style={styles.applyBtn} onPress={handleApplyRefine}>
                            <LinearGradient colors={[GOLD_DARK, GOLD, GOLD_LIGHT]} style={styles.applyGradient}>
                                <Text style={styles.applyText}>APPLY FILTERS</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: NAVY },
    background: { ...StyleSheet.absoluteFillObject },
    header: {
        backgroundColor: 'rgba(11,18,32,0.98)',
        borderBottomWidth: 1,
        borderColor: NAVY_BORDER,
        paddingBottom: 15,
    },
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: 50 },
    headerBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: NAVY_CARD, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: NAVY_BORDER },
    headerTitle: { fontSize: 13, fontWeight: '900', color: GOLD, letterSpacing: 2 },
    badge: { position: 'absolute', top: 10, right: 10, width: 6, height: 6, borderRadius: 3, backgroundColor: '#ef4444', borderWidth: 1, borderColor: NAVY },
    searchWrap: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginTop: 15 },
    searchBar: { flex: 1, height: 48, borderRadius: 14, backgroundColor: NAVY_INPUT, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, borderWidth: 1, borderColor: NAVY_BORDER },
    searchInput: { flex: 1, marginLeft: 10, color: TEXT_PRIMARY, fontSize: 14, fontWeight: '500' },
    refineBtn: { width: 48, height: 48, borderRadius: 14, backgroundColor: NAVY_CARD, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: NAVY_BORDER },
    filterScroll: { paddingHorizontal: 20, gap: 10, marginTop: 15 },
    filterPill: { paddingHorizontal: 18, height: 34, borderRadius: 12, backgroundColor: NAVY_CARD, borderWidth: 1, borderColor: NAVY_BORDER, justifyContent: 'center', alignItems: 'center' },
    filterPillActive: { backgroundColor: GOLD, borderColor: GOLD },
    filterText: { fontSize: 10, fontWeight: '900', color: TEXT_MUTED, letterSpacing: 1 },
    filterTextActive: { color: NAVY },
    listContent: { paddingHorizontal: 20, paddingTop: 20 },
    columnWrapper: { justifyContent: 'space-between', marginBottom: 20 },
    productCard: { backgroundColor: NAVY_CARD, borderRadius: 24, padding: 10, borderWidth: 1, borderColor: NAVY_BORDER },
    imageContainer: { width: '100%', aspectRatio: 1, borderRadius: 18, overflow: 'hidden', backgroundColor: '#000' },
    productImage: { ...StyleSheet.absoluteFillObject },
    favoriteButton: { position: 'absolute', top: 8, right: 8, width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    productInfo: { padding: 8, },
    productName: { fontSize: 14, fontWeight: '500', color: TEXT_PRIMARY },
    designText: { fontSize: 9, fontWeight: '900', color: TEXT_MUTED, letterSpacing: 0.5 },
    tagText: { fontSize: 9, fontWeight: '900', color: '#6366f1', letterSpacing: 0.5, marginTop: 2 },
    weightRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, paddingVertical: 6, borderTopWidth: 0.5, borderBottomWidth: 0.5, borderColor: 'rgba(232,201,122,0.1)' },
    weightLabel: { fontSize: 8, fontWeight: '900', color: GOLD_LIGHT },
    weightValue: { fontSize: 11, fontWeight: '800', color: TEXT_PRIMARY },
    viewBtn: { height: 36, backgroundColor: 'rgba(232,201,122,0.08)', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: 'rgba(232,201,122,0.2)' },
    viewBtnText: { color: GOLD, fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
    listHeader: { marginBottom: 20 },
    resultsCount: { fontSize: 9, fontWeight: '900', color: GOLD, letterSpacing: 1.5 },
    headerLine: { height: 1, width: 30, backgroundColor: GOLD, marginTop: 4 },
    emptyState: { padding: 60, alignItems: 'center', gap: 15 },
    emptyText: { color: TEXT_MUTED, fontSize: 14, fontWeight: '600' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(11,18,32,0.9)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: NAVY_CARD, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, borderWidth: 1, borderColor: NAVY_BORDER },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    modalTitle: { fontSize: 13, fontWeight: '900', color: GOLD, letterSpacing: 2 },
    modalSub: { fontSize: 9, fontWeight: '900', color: TEXT_MUTED, letterSpacing: 1.5, marginBottom: 15 },
    sortList: { gap: 10, marginBottom: 30 },
    sortOpt: { height: 54, borderRadius: 16, backgroundColor: NAVY_INPUT, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, borderWidth: 1, borderColor: NAVY_BORDER },
    sortOptActive: { backgroundColor: GOLD, borderColor: GOLD },
    sortText: { color: TEXT_PRIMARY, fontSize: 14, fontWeight: '600' },
    sortTextActive: { color: NAVY, fontWeight: '900' },
    applyBtn: { height: 54, borderRadius: 16, overflow: 'hidden', elevation: 8 },
    applyGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    applyText: { color: NAVY, fontSize: 13, fontWeight: '900', letterSpacing: 1 },
});
