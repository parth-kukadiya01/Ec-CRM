import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    TextInput,
    FlatList,
    ActivityIndicator,
    Alert,
    StatusBar,
} from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import Icon, { IconName } from '../components/Icon';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { B2B } from '../constants/Colors';
import ProductCard from '../components/ProductCard';
import { useCart } from '../context/CartContext';
import { useFocusEffect } from '@react-navigation/native';
import { productService } from '../services/productService';
import { favoriteService } from '../services/favoriteService';
import { storage } from '../services/storage';
import MessageModal from '../components/MessageModal';

const { GOLD, GOLD_LIGHT, GOLD_DARK, NAVY, NAVY_CARD, NAVY_BORDER, NAVY_INPUT, TEXT_PRIMARY, TEXT_MUTED, GOLD_DIM, NAVY_MID } = B2B;

const RECENT_SEARCHES_KEY = 'sv_gold_recent_searches';
const MAX_RECENT_SEARCHES = 10;

export default function SearchScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    const insets = useSafeAreaInsets();
    const { updateCartCount } = useCart();

    // State
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
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
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [recommendations, setRecommendations] = useState<any[]>([]);
    const [loadingRecommendations, setLoadingRecommendations] = useState(true);

    // Filters
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState('desc');
    const [showFilters, setShowFilters] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Auto-search when query changes (2+ chars)
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (query.trim().length >= 2) {
            debounceRef.current = setTimeout(() => {
                performSearch(query.trim(), selectedCategory, sortBy, sortOrder);
            }, 400);
        } else if (query.trim().length === 0 && hasSearched) {
            setHasSearched(false);
            setResults([]);
        }

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [query]);

    // Load recent searches + categories + recommendations on mount
    useFocusEffect(
        useCallback(() => {
            updateCartCount();
            loadRecentSearches();
            loadCategories();
            loadRecommendations();
        }, [])
    );

    const loadRecentSearches = async () => {
        try {
            const stored = await storage.getItem(RECENT_SEARCHES_KEY);
            if (stored) setRecentSearches(JSON.parse(stored));
        } catch (e) {
            console.log('Error loading recent searches', e);
        }
    };

    const saveRecentSearch = async (term: string) => {
        try {
            const trimmed = term.trim();
            if (!trimmed) return;
            let updated = [trimmed, ...recentSearches.filter(s => s !== trimmed)];
            if (updated.length > MAX_RECENT_SEARCHES) updated = updated.slice(0, MAX_RECENT_SEARCHES);
            setRecentSearches(updated);
            await storage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
        } catch (e) {
            console.log('Error saving recent search', e);
        }
    };

    const clearRecentSearches = async () => {
        setRecentSearches([]);
        await storage.deleteItem(RECENT_SEARCHES_KEY);
    };

    const loadCategories = async () => {
        try {
            const res = await productService.getCategories();
            if (res.data?.success) {
                setCategories(res.data.data || []);
            }
        } catch (e) {
            console.log('Error loading categories', e);
        }
    };

    const loadRecommendations = async () => {
        try {
            setLoadingRecommendations(true);
            const res = await productService.getNewArrivals(6);
            if (res.data?.success) {
                const products = res.data.data?.products || res.data.data || [];
                setRecommendations(products);
            }
        } catch (e) {
            console.log('Error loading recommendations', e);
        } finally {
            setLoadingRecommendations(false);
        }
    };

    const performSearch = async (term: string, catId?: string | null, currentSortBy?: string, currentSortOrder?: string, saveTerm = false) => {
        if (term.length < 2) return;

        setLoading(true);
        setHasSearched(true);
        if (saveTerm) saveRecentSearch(term);

        try {
            const params: any = {
                sortBy: currentSortBy || sortBy,
                sortOrder: currentSortOrder || sortOrder,
            };
            if (catId) params.category = catId;

            const res = await productService.searchProducts(term, params);
            if (res.data?.success) {
                setResults(res.data.data?.results || []);
            } else {
                setResults([]);
            }
        } catch (error: any) {
            console.log('Search error:', error?.response?.data || error.message);
            // Fallback: getProducts + client-side filter
            try {
                const fallbackRes = await productService.getProducts({
                    sortBy: currentSortBy || sortBy,
                    sortOrder: currentSortOrder || sortOrder,
                    category: catId || undefined,
                });
                if (fallbackRes.data?.success) {
                    const allProducts = fallbackRes.data.data?.products || [];
                    const filtered = allProducts.filter((p: any) =>
                        p.name?.toLowerCase().includes(term.toLowerCase()) ||
                        p.tagNumber?.toLowerCase().includes(term.toLowerCase()) ||
                        p.designNumber?.toLowerCase().includes(term.toLowerCase())
                    );
                    setResults(filtered);
                }
            } catch (fallbackErr) {
                setResults([]);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (searchQuery?: string) => {
        const term = (searchQuery || query).trim();
        if (term.length < 2) return;
        saveRecentSearch(term);
        performSearch(term, selectedCategory, sortBy, sortOrder, false);
    };

    const handleFilterByCategory = async (catId: string | null) => {
        setSelectedCategory(catId);
        const term = query.trim();
        if (term.length >= 2) {
            performSearch(term, catId, sortBy, sortOrder);
        } else if (catId) {
            // Browse by category without search query
            setLoading(true);
            setHasSearched(true);
            try {
                const res = await productService.getProducts({ category: catId, sortBy, sortOrder });
                if (res.data?.success) {
                    setResults(res.data.data?.products || []);
                }
            } catch (e) {
                setResults([]);
            } finally {
                setLoading(false);
            }
        } else {
            setHasSearched(false);
            setResults([]);
        }
    };

    const handleSortChange = (newSortBy: string, newSortOrder: string) => {
        setSortBy(newSortBy);
        setSortOrder(newSortOrder);
        setShowFilters(false);
        const term = query.trim();
        if (term.length >= 2) {
            performSearch(term, selectedCategory, newSortBy, newSortOrder);
        } else if (selectedCategory) {
            // Re-fetch category products with new sort
            setLoading(true);
            productService.getProducts({ category: selectedCategory, sortBy: newSortBy, sortOrder: newSortOrder })
                .then(res => {
                    if (res.data?.success) setResults(res.data.data?.products || []);
                })
                .catch(() => { })
                .finally(() => setLoading(false));
        }
    };

    const toggleFavorite = async (id: string) => {
        const item = results.find((p: any) => (p._id || p.id) === id);
        if (!item) return;

        try {
            if (item.isFavorite) {
                await favoriteService.removeFavorite(id);
            } else {
                await favoriteService.addFavorite(id);
            }
            setResults(current =>
                current.map((p: any) =>
                    (p._id || p.id) === id ? { ...p, isFavorite: !p.isFavorite } : p
                )
            );
        } catch (error: any) {
            console.error('Favorite error:', error);
            const msg = error?.response?.data?.message || 'Failed to update favorite';
            if (error?.response?.status === 400 || msg === 'Product already in favorites') {
                setModalConfig({ visible: true, title: 'Error', message: msg, type: 'error' });
                setResults(current =>
                    current.map((p: any) =>
                        (p._id || p.id) === id ? { ...p, isFavorite: true } : p
                    )
                );
            } else if (error?.response?.status === 404) {
                setResults(current =>
                    current.map((p: any) =>
                        (p._id || p.id) === id ? { ...p, isFavorite: false } : p
                    )
                );
            } else {
                console.log('Favorite toggle error', error);
                setModalConfig({ visible: true, title: 'Error', message: msg, type: 'error' });
            }
        }
    };

    const renderProduct = ({ item }: { item: any }) => (
        <ProductCard
            item={item}
            onFavoritePress={() => toggleFavorite(item._id || item.id)}
        />
    );

    const selectedCategoryName = categories.find(c => (c._id || c.id) === selectedCategory)?.name;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={NAVY} />

            <LinearGradient
                colors={[NAVY, NAVY_MID, '#111D35']}
                locations={[0, 0.5, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.background}
            />

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

            {/* Premium Search Header */}
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <View style={styles.headerRow}>
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                        <Icon name="arrow-back-ios" size={18} color={GOLD} style={{ marginLeft: 6 }} />
                    </TouchableOpacity>

                    <View style={styles.searchBarContainer}>
                        <Icon name="search" size={20} color={GOLD} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Name, Tag No., Design No..."
                            placeholderTextColor={TEXT_MUTED}
                            value={query}
                            onChangeText={setQuery}
                            onSubmitEditing={() => handleSearch()}
                            returnKeyType="search"
                            autoFocus
                        />
                        {query.length > 0 && (
                            <TouchableOpacity onPress={() => { setQuery(''); setHasSearched(false); setResults([]); }}>
                                <Icon name="close" size={20} color={GOLD} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* <TouchableOpacity
                        style={[styles.filterButton, showFilters && styles.filterButtonActive]}
                        onPress={() => setShowFilters(!showFilters)}
                    >
                        <Icon name="tune" size={20} color={showFilters ? NAVY : GOLD} />
                    </TouchableOpacity> */}
                </View>

                {/* Categories Flow */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipsContainer}
                >
                    {/* <TouchableOpacity
                        style={[styles.chip, !selectedCategory && styles.activeChip]}
                        onPress={() => handleFilterByCategory(null)}
                    >
                        <Text style={[styles.chipText, !selectedCategory && styles.activeChipText]}>Catalog</Text>
                    </TouchableOpacity> */}
                    {categories.map(cat => {
                        const isCatActive = selectedCategory === (cat._id || cat.id);
                        return (
                            <TouchableOpacity
                                key={cat._id || cat.id}
                                style={[styles.chip, isCatActive && styles.activeChip]}
                                onPress={() => handleFilterByCategory(cat._id || cat.id)}
                            >
                                <Text style={[styles.chipText, isCatActive && styles.activeChipText]}>
                                    {cat.name}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {/* Floating Filter Panel */}
            {showFilters && (
                <View style={[styles.filterPanel, { top: insets.top + 135 }]}>
                    <View style={styles.filterPanelInner}>
                        <Text style={styles.filterTitle}>DISCOVERY SORT</Text>
                        {[
                            { label: 'Market Newest', sortBy: 'createdAt', sortOrder: 'desc' },
                            { label: 'Weight: Light to Heavy', sortBy: 'netWt', sortOrder: 'asc' },
                            { label: 'Weight: Heavy to Light', sortBy: 'netWt', sortOrder: 'desc' },
                            { label: 'Gross Mass Ascending', sortBy: 'grossWt', sortOrder: 'asc' },
                            { label: 'Gross Mass Descending', sortBy: 'grossWt', sortOrder: 'desc' },
                        ].map(opt => {
                            const isOptActive = sortBy === opt.sortBy && sortOrder === opt.sortOrder;
                            return (
                                <TouchableOpacity
                                    key={opt.label}
                                    style={[styles.filterOption, isOptActive && styles.filterOptionActive]}
                                    onPress={() => handleSortChange(opt.sortBy, opt.sortOrder)}
                                >
                                    <Text style={[styles.filterOptionText, isOptActive && styles.filterOptionTextActive]}>
                                        {opt.label}
                                    </Text>
                                    {isOptActive && <Icon name="check" size={16} color={GOLD} />}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            )}

            <ScrollView
                contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 145 }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Searching State */}
                {loading && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={GOLD} />
                        <Text style={styles.loadingText}>Scouring Database...</Text>
                    </View>
                )}

                {/* Display Results */}
                {!loading && hasSearched && (
                    <>
                        <View style={styles.resultHeader}>
                            <Text style={styles.resultCount}>
                                {results.length} result{results.length === 1 ? '' : 's'} found
                                {selectedCategoryName ? ` in ${selectedCategoryName}` : ''}
                            </Text>
                        </View>

                        {results.length > 0 ? (
                            <FlatList
                                data={results}
                                renderItem={renderProduct}
                                keyExtractor={item => (item._id || item.id || Math.random()).toString()}
                                numColumns={2}
                                scrollEnabled={false}
                                columnWrapperStyle={styles.gridColumn}
                                contentContainerStyle={styles.gridContent}
                            />
                        ) : (
                            <View style={styles.emptyContainer}>
                                <View style={styles.emptyIconCircle}>
                                    <Icon name="search-off" size={48} color={NAVY_BORDER} />
                                </View>
                                <Text style={styles.emptyTitle}>Zero Results Found</Text>
                                <Text style={styles.emptySubtitle}>Refine your search term or select a different vault category.</Text>
                            </View>
                        )}
                    </>
                )}

                {/* Initial View: Recent & Recommended */}
                {!loading && !hasSearched && (
                    <>
                        {recentSearches.length > 0 && (
                            <View style={styles.sectionContainer}>
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionTitle}>AUDIT LOG</Text>
                                    <TouchableOpacity onPress={clearRecentSearches}>
                                        <Text style={styles.clearText}>PURGE HISTORY</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.recentCard}>
                                    {recentSearches.map((term, index) => (
                                        <TouchableOpacity
                                            key={`${term}-${index}`}
                                            style={[
                                                styles.recentItem,
                                                index !== recentSearches.length - 1 && styles.recentItemBorder,
                                            ]}
                                            onPress={() => {
                                                setQuery(term);
                                                handleSearch(term);
                                            }}
                                        >
                                            <View style={styles.recentLeft}>
                                                <Icon name="history" size={18} color={TEXT_MUTED} />
                                                <Text style={styles.recentText}>{term}</Text>
                                            </View>
                                            <Icon name="north-west" size={16} color={GOLD_DIM} />
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}

                        <View style={styles.sectionContainer}>
                            <Text style={styles.sectionTitle}>SELECTION</Text>
                        </View>
                        {loadingRecommendations ? (
                            <ActivityIndicator size="small" color={GOLD} style={{ marginTop: 20 }} />
                        ) : recommendations.length > 0 ? (
                            <FlatList
                                data={recommendations}
                                renderItem={renderProduct}
                                keyExtractor={item => (item._id || item.id || Math.random()).toString()}
                                numColumns={2}
                                scrollEnabled={false}
                                columnWrapperStyle={styles.gridColumn}
                                contentContainerStyle={styles.gridContent}
                            />
                        ) : (
                            <Text style={styles.emptySubtitle}>No recommendations available in current catalog.</Text>
                        )}

                    </>
                )}
            </ScrollView>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: NAVY,
    },
    background: {
        ...StyleSheet.absoluteFillObject,
    },
    header: {
        paddingBottom: 12,
        paddingHorizontal: 20,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        backgroundColor: NAVY,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: NAVY_CARD,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: NAVY_BORDER,
    },
    searchBarContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        height: 44,
        borderRadius: 14,
        backgroundColor: NAVY_INPUT,
        borderWidth: 1,
        borderColor: NAVY_BORDER,
        paddingHorizontal: 12,
        gap: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
        color: TEXT_PRIMARY,
    },
    filterButton: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: NAVY_CARD,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: NAVY_BORDER,
    },
    filterButtonActive: {
        backgroundColor: GOLD,
        borderColor: GOLD,
    },
    chipsContainer: {
        gap: 10,
        paddingBottom: 4,
    },
    chip: {
        height: 34,
        paddingHorizontal: 16,
        backgroundColor: NAVY_CARD,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: NAVY_BORDER,
        justifyContent: 'center',
        alignItems: 'center',
    },
    activeChip: {
        backgroundColor: GOLD_DIM,
        borderColor: GOLD,
    },
    chipText: {
        color: TEXT_MUTED,
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    activeChipText: {
        color: GOLD,
    },
    filterPanel: {
        position: 'absolute',
        right: 20,
        zIndex: 200,
        width: 240,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.5,
        shadowRadius: 24,
        elevation: 20,
    },
    filterPanelInner: {
        padding: 20,
        backgroundColor: NAVY_CARD,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: NAVY_BORDER,
    },
    filterTitle: {
        fontSize: 10,
        fontWeight: '900',
        color: GOLD,
        letterSpacing: 2,
        marginBottom: 16,
        opacity: 0.8,
    },
    filterOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: NAVY_BORDER,
    },
    filterOptionActive: {
        borderBottomColor: GOLD_DIM,
    },
    filterOptionText: {
        fontSize: 13,
        fontWeight: '600',
        color: TEXT_MUTED,
    },
    filterOptionTextActive: {
        color: TEXT_PRIMARY,
        fontWeight: '700',
    },
    scrollContent: {
        paddingBottom: 120,
    },
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
        gap: 16,
    },
    loadingText: {
        fontSize: 14,
        fontWeight: '700',
        color: GOLD,
        letterSpacing: 0.5,
    },
    resultHeader: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    resultCount: {
        fontSize: 12,
        fontWeight: '800',
        color: TEXT_MUTED,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    gridContent: {
        paddingHorizontal: 16,
    },
    gridColumn: {
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
        gap: 16,
    },
    emptyIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: NAVY_CARD,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: NAVY_BORDER,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: TEXT_PRIMARY,
    },
    emptySubtitle: {
        fontSize: 14,
        fontWeight: '600',
        color: TEXT_MUTED,
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: 40,
    },
    sectionContainer: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '800',
        color: GOLD,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    clearText: {
        fontSize: 10,
        fontWeight: '900',
        color: '#ef4444',
        letterSpacing: 1,
    },
    recentCard: {
        borderRadius: 24,
        paddingHorizontal: 20,
        backgroundColor: NAVY_CARD,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: NAVY_BORDER,
    },
    recentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
    },
    recentItemBorder: {
        borderBottomWidth: 1,
        borderBottomColor: NAVY_BORDER,
    },
    recentLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    recentText: {
        fontSize: 14,
        fontWeight: '700',
        color: TEXT_PRIMARY,
    },
});
