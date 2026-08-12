import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Image, Dimensions } from 'react-native';
import Icon from '../components/Icon';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getImageUrl } from '../constants/api';
import { B2B } from '../constants/Colors';

const { width } = Dimensions.get('window');
const DEFAULT_CARD_WIDTH = (width - 48) / 2;
const { GOLD, GOLD_LIGHT, GOLD_DARK, NAVY, NAVY_CARD, NAVY_BORDER, NAVY_INPUT, TEXT_PRIMARY, TEXT_MUTED } = B2B;

interface ProductCardProps {
    item: any;
    width?: number;
    onFavoritePress?: (id: string) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ item, width = DEFAULT_CARD_WIDTH, onFavoritePress }) => {
    const navigation = useNavigation<NativeStackNavigationProp<any>>();

    const handlePress = () => {
        navigation.navigate('product-details' as any, {
            id: item.id || item._id,
            name: item.name,
            ref: item.tagNumber || item.designNumber || item.ref,
            netWt: item.netWt,
            grossWt: item.grossWt,
            image: item.images?.[0] || item.image
        });
    };

    return (
        <TouchableOpacity
            style={[styles.productCard, { width }]}
            onPress={handlePress}
            activeOpacity={0.9}
        >
            <View style={styles.productImageContainer}>
                <Image
                    source={{ uri: getImageUrl(item.images?.[0] || item.image) }}
                    style={styles.productImage}
                    resizeMode="contain"
                />
                <TouchableOpacity
                    style={styles.favoriteButton}
                    onPress={() => onFavoritePress && onFavoritePress(item.id || item._id)}
                >
                    <Icon
                        name={item.isFavorite ? "favorite" : "favorite-border"}
                        size={18}
                        color={item.isFavorite ? "#f43f5e" : GOLD}
                    />
                </TouchableOpacity>
            </View>

            <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.productRef}>DESIGN NO. {item.designNumber || item.ref || 'N/A'}</Text>
                <Text style={styles.productTag}>TAG NO. {item.tagNumber || 'N/A'}</Text>

                <View style={styles.materialRow}>
                    <View style={[styles.materialDot, { backgroundColor: GOLD }]} />
                    <Text style={styles.materialText}>{item.materials?.[0] || item.goldType || 'Fine Gold'}</Text>
                </View>

                <View style={styles.productDetails}>
                    <View style={styles.detailRow}>
                        <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>NET</Text>
                            <Text style={styles.detailValue}>{item.netWt}g</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>GROSS</Text>
                            <Text style={styles.detailValue}>{item.grossWt}g</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.viewBadge}>
                    <Text style={styles.viewBadgeText}>VIEW ITEM</Text>
                    <Icon name="arrow-forward" size={12} color={NAVY} />
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    productCard: {
        backgroundColor: NAVY_CARD,
        borderRadius: 24,
        padding: 12,
        borderWidth: 1,
        borderColor: NAVY_BORDER,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 5,
    },
    productImageContainer: {
        width: '100%',
        aspectRatio: 1,
        borderRadius: 18,
        overflow: 'hidden',
        position: 'relative',
        marginBottom: 12,
        backgroundColor: NAVY_INPUT,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.03)',
    },
    productImage: {
        position: 'absolute',
        width: '100%',
        height: '100%',
    },
    favoriteButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    productInfo: {
        paddingHorizontal: 2,
    },
    productName: {
        fontSize: 14,
        fontWeight: '800',
        color: TEXT_PRIMARY,
        letterSpacing: -0.2,
    },
    productRef: {
        fontSize: 9,
        fontWeight: '700',
        color: TEXT_MUTED,
        marginTop: 2,
        marginBottom: 2,
        letterSpacing: 0.5,
    },
    productTag: {
        fontSize: 9,
        fontWeight: '700',
        color: '#6366f1',
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    materialRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 10,
    },
    materialDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        borderWidth: 1,
        borderColor: GOLD_LIGHT,
    },
    materialText: {
        fontSize: 10,
        fontWeight: '700',
        color: GOLD,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    productDetails: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 14,
        paddingVertical: 8,
        paddingHorizontal: 10,
        marginBottom: 12,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    detailItem: {
        flex: 1,
        alignItems: 'center',
    },
    divider: {
        width: 1,
        height: 12,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    detailLabel: {
        fontSize: 7,
        fontWeight: '900',
        color: TEXT_MUTED,
        letterSpacing: 0.8,
        marginBottom: 2,
    },
    detailValue: {
        fontSize: 11,
        fontWeight: '700',
        color: TEXT_PRIMARY,
    },
    viewBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: GOLD,
        paddingVertical: 8,
        borderRadius: 12,
        gap: 4,
    },
    viewBadgeText: {
        color: NAVY,
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 1,
    },
});

export default ProductCard;
