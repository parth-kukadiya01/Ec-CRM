import React, { useState, useEffect, useCallback } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    Image,
    TouchableOpacity,
    Dimensions,
    ActivityIndicator,
    Alert,
    StatusBar,
    TextInput,
} from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import Icon from '../components/Icon';
import MessageModal from '../components/MessageModal';
import CartToast from '../components/CartToast';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { B2B } from '../constants/Colors';
import { cartService } from '../services/cartService';
import { useCart } from '../context/CartContext';
import { productService } from '../services/productService';
import { recentlyViewedService } from '../services/recentlyViewedService';
import { getImageUrl } from '../constants/api';
import ImageView from "react-native-image-viewing";

const { GOLD, GOLD_LIGHT, GOLD_DARK, NAVY, NAVY_CARD, NAVY_BORDER, NAVY_INPUT, TEXT_PRIMARY, TEXT_MUTED, GOLD_DIM, GOLD_BORDER, NAVY_MID } = B2B;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const MATERIALS = ['Yellow Gold', 'Rose Gold'];

const getDynamicSizes = (productName: string = '', categoryName: string = ''): string[] => {
    const name = (productName + ' ' + categoryName).toLowerCase();
    if (name.includes('bangle') || name.includes('bangal') || name.includes('kada') || name.includes('kangan')) {
        return ['2.2', '2.4', '2.6', '2.8', '2.10'];
    }
    if (name.includes('bracelet') || name.includes('breslet')) {
        return ['6.0', '6.5', '7.0', '7.5', '8.0'];
    }
    if (name.includes('necklace') || name.includes('nackless') || name.includes('choker')) {
        return ['14', '16', '18', '20', '22'];
    }
    if (name.includes('chain')) {
        return ['16', '18', '20', '22', '24'];
    }
    if (name.includes('kadali')) {
        return ['1.2', '1.4', '1.6', '1.8', '1.10'];
    }
    if (name.includes('pendant') || name.includes('earring') || name.includes('top') || name.includes('pandal')) {
        return [];
    }
    return Array.from({ length: 23 }, (_, i) => (i + 5).toString());
};

const getDynamicSizeLabel = (productName: string = '', categoryName: string = ''): string => {
    const name = (productName + ' ' + categoryName).toLowerCase();
    if (name.includes('bangle') || name.includes('bangal') || name.includes('kada') || name.includes('kankan') || name.includes('kangan')) return 'SIZE (INCHES)';
    if (name.includes('bracelet') || name.includes('breslet')) return 'BRACELET SIZE';
    if (name.includes('necklace') || name.includes('nackless') || name.includes('choker')) return 'LENGTH (INCHES)';
    if (name.includes('chain')) return 'CHAIN LENGTH';
    if (name.includes('kadali')) return 'KADALI SIZE';
    return 'RING SIZE';
};

export default function ProductDetailsScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    const route = useRoute<any>();
    const { name, ref, netWt, grossWt, image, id } = route.params || {};
    const insets = useSafeAreaInsets();
    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedMaterial, setSelectedMaterial] = useState('');
    const [selectedPurity, setSelectedPurity] = useState('');
    const [selectedSize, setSelectedSize] = useState('');
    const [note, setNote] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [addingToCart, setAddingToCart] = useState(false);


    // Cart Toast state (replaces the 'Added to Cart' popup)
    const [showCartToast, setShowCartToast] = useState(false);

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

    const { cartCount, updateCartCount } = useCart();

    const [isVisible, setIsVisible] = useState(false);
    const [activeImageIndex, setActiveImageIndex] = useState(0);

    useEffect(() => {
        const fetchProduct = async () => {
            if (!id) return;
            try {
                setLoading(true);
                const res = await productService.getProductDetails(id as string);
                const data = res.data.data;
                setProduct(data);
                let defaultMat = 'Yellow Gold';
                if (data.materials?.[0]) {
                    const matStr = data.materials[0].toLowerCase();
                    if (matStr.includes('rose')) defaultMat = 'Rose Gold';
                }
                setSelectedMaterial(defaultMat);
                setSelectedPurity(data.availablePurity?.[0] || '18k');
                const dynamicSizes = getDynamicSizes(data?.name || name, data?.category?.name || '');
                setSelectedSize(data.availableSizes?.[0] || dynamicSizes[0] || '');
                setLoading(false);
                recentlyViewedService.trackView(id as string).catch(() => { });
            } catch (error: any) {
                console.error('Error fetching product details:', error);
                const msg = error.response?.data?.message || 'Failed to load product details';
                setModalConfig({ visible: true, title: 'Error', message: msg, type: 'error' });
                setLoading(false);
            }
        };
        fetchProduct();
    }, [id]);

    const handleAddToCart = async () => {
        if (!id) {
            setModalConfig({ visible: true, title: 'Error', message: 'Product ID missing', type: 'error' });
            return;
        }

        setAddingToCart(true);
        try {
            await cartService.addToCart(id as string, quantity, {
                material: selectedMaterial,
                purity: selectedPurity,
                size: selectedSize,
                note: note.trim()
            });
            await updateCartCount();
            // Show non-blocking toast instead of a blocking popup
            setShowCartToast(true);
        } catch (error: any) {
            const message = error.response?.data?.message || 'Failed to add to cart';
            setModalConfig({ visible: true, title: 'Error', message: message, type: 'error' });
        } finally {
            setAddingToCart(false);
        }
    };

    const productImages = product?.images && product.images.length > 0 ? product.images : [image];

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom + 32 }]}>
            <StatusBar barStyle="light-content" backgroundColor={NAVY} />

            <LinearGradient
                colors={[NAVY, NAVY_MID, '#09101d']}
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

            {/* Non-blocking Cart Toast */}
            <CartToast
                visible={showCartToast}
                cartCount={cartCount}
                onViewCart={() => navigation.navigate('cart' as any)}
                onDismiss={() => setShowCartToast(false)}
            />

            {/* Premium Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
                    <Icon name="arrow-back-ios" size={20} color={GOLD} style={{ marginLeft: 6 }} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>PRODUCT PROFILE</Text>
                <TouchableOpacity style={styles.headerButton}>
                    <Icon name="more-horiz" size={24} color={GOLD} />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color={GOLD} />
                    <Text style={styles.loaderText}>Retrieving Specifications...</Text>
                </View>
            ) : (
                <>
                    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        {/* Image Showcase */}
                        <View style={styles.imageContainer}>
                            <View style={styles.imageCard}>
                                <ScrollView
                                    horizontal
                                    pagingEnabled
                                    snapToInterval={SCREEN_WIDTH - 40}
                                    decelerationRate="fast"
                                    showsHorizontalScrollIndicator={false}
                                    onMomentumScrollEnd={(e) => {
                                        const newIndex = Math.round(e.nativeEvent.contentOffset.x / (SCREEN_WIDTH - 40));
                                        setActiveImageIndex(newIndex);
                                    }}
                                >
                                    {productImages.map((img: string, index: number) => (
                                        <TouchableOpacity
                                            key={index}
                                            activeOpacity={0.9}
                                            onPress={() => setIsVisible(true)}
                                            style={styles.imageTouch}
                                        >
                                            <Image
                                                source={{ uri: getImageUrl(img) }}
                                                style={styles.mainImage}
                                                resizeMode="contain"
                                            />
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>

                                <View style={styles.paginationRow}>
                                    {productImages.map((_: any, index: number) => (
                                        <View key={index} style={[styles.dot, activeImageIndex === index && styles.activeDot]} />
                                    ))}
                                </View>

                                <TouchableOpacity style={styles.zoomAffordance} onPress={() => setIsVisible(true)}>
                                    <Icon name="fullscreen" size={20} color={GOLD} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <ImageView
                            images={productImages.map((img: string) => ({ uri: getImageUrl(img) }))}
                            imageIndex={activeImageIndex}
                            visible={isVisible}
                            onRequestClose={() => setIsVisible(false)}
                        />

                        {/* Title, Design Number & Tag Number Area */}
                        <View style={styles.metaRow}>
                            <View style={styles.titleCol}>
                                <Text style={styles.productName}>{product?.name || name}</Text>
                                <View style={styles.identifierRow}>
                                    <View style={styles.refBadge}>
                                        <Text style={styles.refLabel}>DESIGN NO.</Text>
                                        <Text style={styles.refText}>{product?.designNumber || ref || 'N/A'}</Text>
                                    </View>
                                    <View style={[styles.refBadge, styles.tagBadge]}>
                                        <Text style={styles.refLabel}>TAG NO.</Text>
                                        <Text style={styles.refText}>{product?.tagNumber || 'N/A'}</Text>
                                    </View>
                                </View>
                            </View>
                            <View style={styles.stockStatus}>
                                <View style={styles.pulse} />
                                <Text style={styles.stockLabel}>LIVE STOCK</Text>
                            </View>
                        </View>

                        {/* Technical Specifications */}
                        <View style={styles.specSection}>
                            <Text style={styles.sectionLabel}>Product Specifications</Text>
                            <View style={styles.specGrid}>
                                <View style={styles.specCard}>
                                    <Text style={styles.specSmall}>NET WT</Text>
                                    <Text style={styles.specLarge}>{product?.netWt || netWt}g</Text>
                                </View>
                                <View style={styles.specCard}>
                                    <Text style={styles.specSmall}>GROSS WT</Text>
                                    <Text style={styles.specLarge}>{product?.grossWt || grossWt}g</Text>
                                </View>
                                <View style={styles.specCard}>
                                    <Text style={styles.specSmall}>PURITY</Text>
                                    <Text style={styles.specLarge}>{product?.materials?.[0] || '18K'}</Text>
                                </View>
                            </View>

                            {/* <View style={styles.infoCard}>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>METAL COMPOSITION</Text>
                                    <Text style={styles.infoValue}>{product?.materials?.[0] || 'GOLD'}</Text>
                                </View>
                                <View style={styles.divider} />
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>CATEGORY</Text>
                                    <Text style={styles.infoValue}>{product?.category?.name || 'PREMIUM CATALOG'}</Text>
                                </View>
                                {product?.diamondDetails?.caratWeight && (
                                    <>
                                        <View style={styles.divider} />
                                        <View style={styles.infoRow}>
                                            <Text style={styles.infoLabel}>DIAMOND CARAT</Text>
                                            <Text style={styles.infoValue}>{product.diamondDetails.caratWeight} CT</Text>
                                        </View>
                                    </>
                                )}
                            </View> */}
                        </View>

                        {/* Configuration Selectors */}
                        <View style={styles.configSection}>
                            <Text style={styles.sectionLabel}>CUSTOMIZE SPECIFICATIONS</Text>

                            <View style={styles.configCard}>
                                <Text style={styles.configTitle}>MATERIAL FINISH</Text>
                                <View style={styles.optionsRow}>
                                    {MATERIALS.map(m => {
                                        const active = selectedMaterial === m;
                                        return (
                                            <TouchableOpacity
                                                key={m}
                                                style={[styles.optionBtn, active && styles.optionBtnActive]}
                                                onPress={() => setSelectedMaterial(m)}
                                            >
                                                <Text style={[styles.optionText, active && styles.optionTextActive]}>{m.split(' ')[0]}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

                            <View style={styles.configCard}>
                                <Text style={styles.configTitle}>GOLD PURITY</Text>
                                <View style={styles.optionsRow}>
                                    {(product?.category?.name === 'Kadali'
                                        ? ['18k', '22k']
                                        : ['9k', '14k', '18k', '22k']
                                    ).map((p: string) => {
                                        const active = (selectedPurity || '').toLowerCase() === p.toLowerCase();
                                        return (
                                            <TouchableOpacity
                                                key={p}
                                                style={[styles.optionBtn, active && styles.optionBtnActive]}
                                                onPress={() => setSelectedPurity(p)}
                                            >
                                                <Text style={[styles.optionText, active && styles.optionTextActive]}>{p.toUpperCase()}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

                            {(() => {
                                const sizes = getDynamicSizes(product?.name || name, product?.category?.name || '');
                                if (sizes.length === 0) return null;
                                return (
                                    <View style={styles.configCard}>
                                        <View style={styles.sizeHeader}>
                                            <Text style={styles.configTitle}>{getDynamicSizeLabel(product?.name || name, product?.category?.name || '')}</Text>
                                            <TouchableOpacity><Text style={styles.guideText}>SIZE GUIDE</Text></TouchableOpacity>
                                        </View>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sizeScroll}>
                                            {sizes.map(s => {
                                                const active = selectedSize === s;
                                                return (
                                                    <TouchableOpacity
                                                        key={s}
                                                        style={[styles.sizeBtn, active && styles.sizeBtnActive]}
                                                        onPress={() => setSelectedSize(s)}
                                                    >
                                                        <Text style={[styles.sizeText, active && styles.sizeTextActive]}>{s}</Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </ScrollView>
                                    </View>
                                );
                            })()}

                            <View style={styles.configCard}>
                                <Text style={styles.configTitle}>SPECIAL INSTRUCTIONS</Text>
                                <TextInput
                                    style={styles.noteInput}
                                    placeholder="Add custom notes here..."
                                    placeholderTextColor={TEXT_MUTED}
                                    value={note}
                                    onChangeText={setNote}
                                    multiline
                                />
                            </View>
                        </View>
                    </ScrollView>

                    {/* Transactional Action Bar */}
                    <View style={[styles.actionBarContainer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                        {/* <LinearGradient
                            colors={['transparent', 'rgba(24, 34, 55, 0.9)', NAVY]}
                            style={styles.barShadow}
                        /> */}
                        <View style={styles.actionBar}>
                            <View style={styles.qtyBox}>
                                <TouchableOpacity onPress={() => setQuantity(Math.max(1, quantity - 1))} style={styles.qtyBtn}>
                                    <Icon name="remove" size={16} color={GOLD} />
                                </TouchableOpacity>
                                <Text style={styles.qtyVal}>{quantity}</Text>
                                <TouchableOpacity onPress={() => setQuantity(quantity + 1)} style={styles.qtyBtn}>
                                    <Icon name="add" size={16} color={GOLD} />
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                style={styles.primaryBtn}
                                onPress={handleAddToCart}
                                disabled={addingToCart}
                            >
                                <LinearGradient
                                    colors={[GOLD_DARK, GOLD, GOLD_DARK]}
                                    style={StyleSheet.absoluteFillObject}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                />
                                {addingToCart ? (
                                    <ActivityIndicator color={NAVY} />
                                ) : (
                                    <>
                                        <Icon name="add-shopping-cart" size={20} color={NAVY} />
                                        <Text style={styles.btnText}>ADD TO CART</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                        {/* <View style={styles.trustRow}>
                            <Icon name="verified" size={12} color={GOLD_LIGHT} />
                            <Text style={styles.trustText}>SECURE WHOLESALE SETTLEMENT READY</Text>
                        </View> */}
                    </View>
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: NAVY },
    background: { ...StyleSheet.absoluteFillObject },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
    },
    headerButton: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: NAVY_CARD,
        borderWidth: 1,
        borderColor: NAVY_BORDER,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 11,
        fontWeight: '900',
        color: GOLD,
        letterSpacing: 2,
    },
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 20 },
    loaderText: { color: GOLD_LIGHT, fontSize: 13, fontWeight: '700', letterSpacing: 1 },
    scrollContent: { paddingBottom: 56, marginBottom: 12 },
    imageContainer: { paddingHorizontal: 20, marginTop: 10 },
    imageCard: {
        width: '100%',
        aspectRatio: 0.8,
        backgroundColor: NAVY_CARD,
        borderRadius: 30,
        borderWidth: 1,
        borderColor: NAVY_BORDER,
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
    },
    imageTouch: { width: SCREEN_WIDTH - 40, height: '100%', justifyContent: 'center', alignItems: 'center' },
    mainImage: { width: '85%', height: '85%' },
    paginationRow: {
        position: 'absolute',
        bottom: 25,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6,
    },
    dot: { width: 6, height: 2, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 1 },
    activeDot: { width: 20, backgroundColor: GOLD },
    zoomAffordance: {
        position: 'absolute',
        top: 20,
        right: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    metaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        marginTop: 20,
        alignItems: 'flex-start',
    },
    titleCol: { flex: 1, marginRight: 15 },
    productName: { fontSize: 28, fontWeight: '300', color: TEXT_PRIMARY, lineHeight: 36, letterSpacing: -0.5 },
    identifierRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 10 },
    refBadge: {
        backgroundColor: 'rgba(232,201,122,0.05)',
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 6,
        alignSelf: 'flex-start',
        borderWidth: 0.5,
        borderColor: 'rgba(232,201,122,0.2)',
    },
    tagBadge: {
        backgroundColor: 'rgba(99,102,241,0.07)',
        borderColor: 'rgba(99,102,241,0.3)',
    },
    refLabel: { fontSize: 7, fontWeight: '900', color: GOLD, letterSpacing: 1, marginBottom: 2 },
    refText: { fontSize: 9, fontWeight: '900', color: TEXT_MUTED, letterSpacing: 1 },
    stockStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
    pulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981' },
    stockLabel: { fontSize: 10, fontWeight: '900', color: '#10b981', letterSpacing: 1 },
    specSection: { paddingHorizontal: 20, marginTop: 24 },
    sectionLabel: { fontSize: 10, fontWeight: '900', color: GOLD, letterSpacing: 2, marginBottom: 16, marginLeft: 5 },
    specGrid: { flexDirection: 'row', gap: 12, marginBottom: 15 },
    specCard: {
        flex: 1,
        backgroundColor: NAVY_CARD,
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: NAVY_BORDER,
    },
    specSmall: { fontSize: 8, fontWeight: '900', color: TEXT_MUTED, letterSpacing: 1, marginBottom: 5 },
    specLarge: { fontSize: 16, fontWeight: '800', color: TEXT_PRIMARY },
    infoCard: { backgroundColor: NAVY_CARD, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: NAVY_BORDER },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
    infoLabel: { fontSize: 10, fontWeight: '700', color: TEXT_MUTED, letterSpacing: 0.5 },
    infoValue: { fontSize: 11, fontWeight: '900', color: GOLD_LIGHT, letterSpacing: 0.5 },
    divider: { height: 1, backgroundColor: NAVY_BORDER, marginVertical: 12 },
    configSection: { paddingHorizontal: 20, marginTop: 24 },
    configCard: {
        backgroundColor: NAVY_CARD,
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: NAVY_BORDER,
        marginBottom: 15,
    },
    configTitle: { fontSize: 10, fontWeight: '900', color: TEXT_MUTED, letterSpacing: 1, marginBottom: 18 },
    optionsRow: { flexDirection: 'row', gap: 10 },
    optionBtn: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        backgroundColor: NAVY_INPUT,
        borderWidth: 1,
        borderColor: NAVY_BORDER,
        justifyContent: 'center',
        alignItems: 'center',
    },
    optionBtnActive: { backgroundColor: GOLD, borderColor: GOLD },
    optionText: { fontSize: 11, fontWeight: '800', color: TEXT_MUTED, letterSpacing: 1 },
    optionTextActive: { color: NAVY },
    sizeHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
    guideText: { fontSize: 10, fontWeight: '900', color: GOLD, letterSpacing: 1 },
    sizeScroll: { gap: 8 },
    sizeBtn: {
        width: 54,
        height: 54,
        borderRadius: 15,
        backgroundColor: NAVY_INPUT,
        borderWidth: 1,
        borderColor: NAVY_BORDER,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sizeBtnActive: { backgroundColor: GOLD, borderColor: GOLD },
    sizeText: { fontSize: 13, fontWeight: '800', color: TEXT_MUTED },
    sizeTextActive: { color: NAVY },
    noteInput: {
        height: 80,
        backgroundColor: NAVY_INPUT,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: NAVY_BORDER,
        color: TEXT_PRIMARY,
        fontSize: 13,
        padding: 12,
        paddingTop: 12,
        textAlignVertical: 'top',
    },
    actionBarContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, backgroundColor: NAVY, paddingTop: 12 },
    barShadow: { position: 'absolute', top: -100, left: 0, right: 0, height: 100 },
    actionBar: {
        flexDirection: 'row',
        backgroundColor: 'rgba(11,18,32,0.98)',
        borderRadius: 24,
        padding: 10,
        borderWidth: 1,
        borderColor: NAVY_BORDER,
        gap: 10,
    },
    qtyBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: NAVY_INPUT,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: NAVY_BORDER,
    },
    qtyBtn: { width: 44, height: 56, justifyContent: 'center', alignItems: 'center' },
    qtyVal: { width: 30, textAlign: 'center', color: TEXT_PRIMARY, fontSize: 16, fontWeight: '800' },
    primaryBtn: {
        flex: 1,
        height: 56,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        overflow: 'hidden',
    },
    btnText: { color: NAVY, fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
    trustRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 15 },
    trustText: { fontSize: 8, fontWeight: '900', color: TEXT_MUTED, letterSpacing: 1 },
});

