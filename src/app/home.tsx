import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    Image,
    TouchableOpacity,
    Platform,
    FlatList,
    ActivityIndicator,
    Alert,
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import { StatusBar } from 'react-native';
import Icon from '../components/Icon';
// import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { B2B } from '../constants/Colors';
import { useCart } from '../context/CartContext';
import BottomNav from '../components/BottomNav';
import { useFocusEffect } from '@react-navigation/native';
import { useResponsive } from '../hooks/useResponsive';

// Static mock data removed

import { productService } from '../services/productService';
import { favoriteService } from '../services/favoriteService';
import { recentlyViewedService } from '../services/recentlyViewedService';
import { getImageUrl } from '../constants/api';

import { bannerService } from '../services/bannerService';

const { GOLD, GOLD_LIGHT, GOLD_DARK, NAVY, NAVY_CARD, NAVY_BORDER, NAVY_INPUT, TEXT_PRIMARY, TEXT_MUTED, GOLD_DIM, GOLD_BORDER, NAVY_MID } = B2B;

export default function HomeScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    const insets = useSafeAreaInsets();
    const { width, isTablet, isDesktop, columns } = useResponsive();
    const [activeCategory, setActiveCategory] = useState(1);
    const [newArrivals, setNewArrivals] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [banners, setBanners] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
    const { updateCartCount } = useCart();
    const [recentlyViewed, setRecentlyViewed] = useState<any[]>([]);

    useFocusEffect(
        React.useCallback(() => {
            updateCartCount();
            loadRecentlyViewed();
        }, [])
    );

    useEffect(() => {
        const fetchHomeData = async () => {
            try {
                setLoading(true);
                // Use allSettled so one failure doesn't break everything
                const [arrivalsRes, categoriesRes, bannersRes] = await Promise.allSettled([
                    productService.getNewArrivals(6),
                    productService.getCategories(),
                    bannerService.getBanners()
                ]);

                if (arrivalsRes.status === 'fulfilled') {
                    setNewArrivals(arrivalsRes.value?.data?.data || []);
                }
                if (categoriesRes.status === 'fulfilled') {
                    setCategories(categoriesRes.value?.data?.data || []);
                }
                if (bannersRes.status === 'fulfilled') {
                    setBanners(bannersRes.value?.data?.data || []);
                }
            } catch (error: any) {
                console.error('Home data fetch error:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchHomeData();
    }, []);

    const loadRecentlyViewed = async () => {
        try {
            const res = await recentlyViewedService.getRecentlyViewed(10);
            if (res.data?.success) {
                setRecentlyViewed(res.data.data?.products || []);
            }
        } catch (e: any) {
            console.log('Recently viewed error:', e?.response?.data || e.message);
        }
    };

    // Auto-scroll logic for Hero Carousel

    const getIconName = (iconStr: string): string => {
        const iconMap: Record<string, string> = {
            'diamond': 'diamond',
            'blur-circular': 'blur-circular',
            'layers': 'layers',
            'diamond-plus': 'diamond',
            'filter-vintage': 'filter-vintage',
            'link': 'link',
        };
        return iconMap[iconStr] || 'category';
    };

    const toggleFavorite = async (id: string) => {
        // Find item in either list to check status (prefer newArrivals if in both, just for reference)
        const item = newArrivals.find((p: any) => (p._id || p.id) === id) ||
            recentlyViewed.find((p: any) => (p._id || p.id) === id);

        if (!item) return;

        try {
            if (item.isFavorite) {
                await favoriteService.removeFavorite(id);
            } else {
                await favoriteService.addFavorite(id);
            }

            // Update New Arrivals state
            setNewArrivals(current =>
                current.map((p: any) =>
                    (p._id || p.id) === id ? { ...p, isFavorite: !p.isFavorite } : p
                )
            );

            // Update Recently Viewed state
            setRecentlyViewed(current =>
                current.map((p: any) =>
                    (p._id || p.id) === id ? { ...p, isFavorite: !p.isFavorite } : p
                )
            );
        } catch (error: any) {
            // Handle "already in favorites" case gracefully (400 or specific message)
            const isAlreadyFav = error?.response?.status === 400 || error?.response?.data?.message === 'Product already in favorites';
            if (isAlreadyFav) {
                // Ensure it's marked as favorite in both lists
                setNewArrivals(current =>
                    current.map((p: any) =>
                        (p._id || p.id) === id ? { ...p, isFavorite: true } : p
                    )
                );
                setRecentlyViewed(current =>
                    current.map((p: any) =>
                        (p._id || p.id) === id ? { ...p, isFavorite: true } : p
                    )
                );
            }
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={NAVY} />

            <LinearGradient
                colors={[NAVY, NAVY_MID, '#09101d']}
                style={styles.background}
            />

            {/* Premium Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <View style={styles.headerContent}>

                    <View style={styles.headerInfo}>
                        <Text style={styles.brandTitle}>SV GOLD</Text>
                        <Text style={styles.portalSubtitle}> JO JO KADALI</Text>
                    </View>

                    <View style={styles.headerActions}>
                        <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.navigate('search' as any)}>
                            <Icon name="search" size={22} color={GOLD} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.navigate('notifications' as any)}>
                            <Icon name="notifications-none" size={22} color={GOLD} />
                            <View style={styles.badge} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                style={{ flex: 1 }}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Hero Carousel */}
                <View style={styles.heroContainer}>
                    {banners.length > 0 ? (
                        <FlatList
                            data={banners}
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            keyExtractor={(item, index) => item._id || index.toString()}
                            onMomentumScrollEnd={(e) => {
                                const index = Math.round(e.nativeEvent.contentOffset.x / (width - 40));
                                setCurrentHeroIndex(index);
                            }}
                            renderItem={({ item }) => (
                                <View style={[styles.heroCard, { width: width - 40 }]}>
                                    <Image
                                        source={{ uri: getImageUrl(item.image) }}
                                        style={styles.heroImage}
                                        resizeMode="cover"
                                    />
                                    <LinearGradient
                                        colors={['transparent', 'rgba(11,18,32,0.95)']}
                                        style={styles.heroOverlay}
                                    >
                                        <View style={styles.tagBadge}>
                                            <Text style={styles.tagText}>{item.tag || 'EXCLUSIVE'}</Text>
                                        </View>
                                        <Text style={styles.heroTitle}>{item.title}</Text>
                                        <Text style={styles.heroSubtitle}>{item.subtitle}</Text>
                                    </LinearGradient>
                                </View>
                            )}
                        />
                    ) : (
                        <View style={[styles.heroCard, { width: width - 40 }]}>
                            <Image
                                source={{ uri: 'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?q=80&w=2938&auto=format&fit=crop' }}
                                style={styles.heroImage}
                            />
                            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.heroOverlay}>
                                <Text style={styles.heroTitle}>Premium Collection</Text>
                                <Text style={styles.heroSubtitle}>CRAFTED FOR ROYALTY</Text>
                            </LinearGradient>
                        </View>
                    )}
                    <View style={styles.indicatorContainer}>
                        {(banners.length > 0 ? banners : [1]).map((_, i) => (
                            <View key={i} style={[styles.indicator, currentHeroIndex === i && styles.indicatorActive]} />
                        ))}
                    </View>
                </View>

                {/* Vertical Category Navigation */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionLabel}>COLLECTIONS</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('catalog' as any)}>
                            <Text style={styles.seeAllText}>EXPLORE ALL</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                        {categories.map((cat) => {
                            const active = activeCategory === cat._id;
                            return (
                                <TouchableOpacity
                                    key={cat._id}
                                    style={[styles.categoryCard, active && styles.categoryCardActive]}
                                    onPress={() => navigation.navigate('catalog' as any, { categoryId: cat._id, categoryName: cat.name })}
                                >
                                    <View style={[styles.categoryIconBox, active && styles.categoryIconBoxActive]}>
                                        <Icon name={getIconName(cat.icon) as any} size={24} color={active ? NAVY : GOLD_LIGHT} />
                                    </View>
                                    <Text style={[styles.categoryLabel, active && styles.categoryLabelActive]}>{cat.name}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* New Arrivals Grid */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionLabel}>NEW ARRIVALS</Text>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalProducts}>
                        {newArrivals.map((item) => (
                            <TouchableOpacity
                                key={item._id || item.id}
                                style={styles.compactProductCard}
                                activeOpacity={0.9}
                                onPress={() => navigation.navigate('product-details' as any, { id: item._id || item.id, ...item })}
                            >
                                <View style={styles.productImgWrapper}>
                                    <Image source={{ uri: getImageUrl(item.image || item.images?.[0]) }} style={styles.productImg} />
                                    <TouchableOpacity style={styles.favBtn} onPress={() => toggleFavorite(item._id || item.id)}>
                                        <Icon name={item.isFavorite ? "favorite" : "favorite-border"} size={16} color={item.isFavorite ? GOLD : TEXT_MUTED} />
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.productBrief}>
                                    <Text style={styles.productTitle} numberOfLines={1}>{item.name}</Text>
                                    <Text style={styles.productWeight}>{item.netWt} GM</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Recently Viewed */}
                {recentlyViewed.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionLabel}>RECENT VIEWED</Text>
                        </View>
                        <View style={styles.historyList}>
                            {recentlyViewed.slice(0, 4).map((item) => (
                                <TouchableOpacity
                                    key={item._id || item.id}
                                    style={styles.historyCard}
                                    onPress={() => navigation.navigate('product-details' as any, { id: item._id || item.id, ...item })}
                                >
                                    <Image source={{ uri: getImageUrl(item.image || item.images?.[0]) }} style={styles.historyImg} />
                                    <View style={styles.historyInfo}>
                                        <Text style={styles.historyTitle} numberOfLines={1}>{item.name}</Text>
                                        <Text style={styles.historyRef}>DESIGN NO. {item.designNumber || item.ref || 'N/A'}</Text>
                                    </View>
                                    <Icon name="chevron-right" size={20} color={GOLD_LIGHT} />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}

                {/* Footer Banner */}
                <TouchableOpacity style={styles.footerBanner}>
                    <Image
                        source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD4EEVS0P0z80W6N5OvUzdFrzszG1sSQFQBUmGMaqrdsQlqHijdiANASStpG8PIp_tBAYULHJ2em5n0-w7lEfTkYqYw8SpFIsew5K3S1KmJrdkU8SMlhNmpCAQlz-MCpZxFOZvNTgCYuuPq3-O17_MNDeRfZX3kbNspLzPTa8idFREMZyshy7sMLXAC583HSPTJoMQ5OgZQJEgJKnyY8pLX2be-CxFc-1lEI4E_TKgHBMLTlIBkn0fODZmkh0JUQK0uZlROXQ9XEkQ' }}
                        style={styles.bannerImg}
                    />
                    <View style={styles.bannerContent}>
                        <Text style={styles.bannerTag}>CURATED EXCELLENCE</Text>
                        <Text style={styles.bannerHeading}>Bridal Masterpieces</Text>
                        <Text style={styles.bannerLink}>VIEW CATALOGUE</Text>
                    </View>
                </TouchableOpacity>

            </ScrollView>

            <BottomNav activeTab="Home" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: NAVY },
    background: { ...StyleSheet.absoluteFillObject },
    header: {
        // height: 110,
        backgroundColor: 'rgba(11,18,32,0.95)',
        borderBottomWidth: 1,
        borderColor: NAVY_BORDER,
        paddingHorizontal: 20,
        // zIndex: 100,
    },
    headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, paddingBottom: 16 },
    profileBtn: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    profileImage: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, borderColor: GOLD_BORDER },
    headerInfo: { justifyContent: 'center' },
    brandTitle: { fontSize: 16, fontWeight: '900', color: GOLD, letterSpacing: 1 },
    portalSubtitle: { fontSize: 8, fontWeight: '700', color: TEXT_MUTED, letterSpacing: 1 },
    headerActions: { flexDirection: 'row', gap: 10 },
    headerIconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: NAVY_CARD, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: NAVY_BORDER },
    badge: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444', borderWidth: 1, borderColor: NAVY },
    scrollContent: { paddingTop: 20, paddingBottom: 120, },
    heroContainer: { marginBottom: 30, paddingHorizontal: 20 },
    heroCard: { height: 220, borderRadius: 30, overflow: 'hidden', backgroundColor: NAVY_CARD, borderWidth: 1, borderColor: NAVY_BORDER, elevation: 12 },
    heroImage: { ...StyleSheet.absoluteFillObject },
    heroOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', padding: 25 },
    tagBadge: { backgroundColor: 'rgba(232,201,122,0.2)', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginBottom: 10, borderWidth: 0.5, borderColor: GOLD },
    tagText: { color: GOLD, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
    heroTitle: { color: TEXT_PRIMARY, fontSize: 24, fontWeight: '300', lineHeight: 30 },
    heroSubtitle: { color: GOLD_LIGHT, fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginTop: 5 },
    indicatorContainer: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 15 },
    indicator: { width: 6, height: 2, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 1 },
    indicatorActive: { width: 20, backgroundColor: GOLD },
    section: { marginBottom: 35 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25, marginBottom: 20 },
    sectionLabel: { fontSize: 10, fontWeight: '900', color: GOLD, letterSpacing: 2 },
    seeAllText: { fontSize: 10, fontWeight: '900', color: TEXT_MUTED, letterSpacing: 1 },
    categoryScroll: { paddingHorizontal: 20, gap: 12 },
    categoryCard: { width: 85, height: 110, borderRadius: 24, backgroundColor: NAVY_CARD, borderWidth: 1, borderColor: NAVY_BORDER, justifyContent: 'center', alignItems: 'center', gap: 10 },
    categoryCardActive: { backgroundColor: GOLD, borderColor: GOLD },
    categoryIconBox: { width: 50, height: 50, borderRadius: 18, backgroundColor: NAVY_INPUT, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: NAVY_BORDER },
    categoryIconBoxActive: { backgroundColor: NAVY, borderColor: 'transparent' },
    categoryLabel: { fontSize: 10, fontWeight: '800', color: TEXT_MUTED },
    categoryLabelActive: { color: NAVY, fontWeight: '900' },
    horizontalProducts: { paddingHorizontal: 20, gap: 15 },
    compactProductCard: { width: 160, backgroundColor: NAVY_CARD, borderRadius: 24, padding: 10, borderWidth: 1, borderColor: NAVY_BORDER },
    productImgWrapper: { width: '100%', aspectRatio: 1, borderRadius: 18, overflow: 'hidden', backgroundColor: '#000' },
    productImg: { ...StyleSheet.absoluteFillObject },
    favBtn: { position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    productBrief: { padding: 10, gap: 4 },
    productTitle: { fontSize: 13, fontWeight: '300', color: TEXT_PRIMARY },
    productWeight: { fontSize: 10, fontWeight: '900', color: GOLD, letterSpacing: 0.5 },
    historyList: { paddingHorizontal: 20, gap: 12 },
    historyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: NAVY_CARD, borderRadius: 20, padding: 12, borderWidth: 1, borderColor: NAVY_BORDER, gap: 15 },
    historyImg: { width: 50, height: 50, borderRadius: 12, backgroundColor: '#000' },
    historyInfo: { flex: 1, gap: 4 },
    historyTitle: { fontSize: 14, fontWeight: '300', color: TEXT_PRIMARY },
    historyRef: { fontSize: 9, fontWeight: '900', color: TEXT_MUTED, letterSpacing: 1 },
    footerBanner: { marginHorizontal: 20, height: 180, borderRadius: 30, overflow: 'hidden', marginBottom: 20, elevation: 10 },
    bannerImg: { ...StyleSheet.absoluteFillObject },
    bannerContent: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(11,18,32,0.7)', justifyContent: 'center', padding: 30 },
    bannerTag: { color: GOLD, fontSize: 9, fontWeight: '900', letterSpacing: 2, marginBottom: 10 },
    bannerHeading: { color: TEXT_PRIMARY, fontSize: 26, fontWeight: '300', marginBottom: 15 },
    bannerLink: { color: GOLD_LIGHT, fontSize: 10, fontWeight: '900', letterSpacing: 2, textDecorationLine: 'underline' },
});
