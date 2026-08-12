import React, { useEffect, useState, useCallback } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    RefreshControl,
    StatusBar,
    Alert,
} from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon, { IconName } from '../components/Icon';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { orderService } from '../services/orderService';
import { useCart } from '../context/CartContext';
import { storage } from '../services/storage';
import { API_BASE_URL, getImageUrl } from '../constants/api';
import MessageModal from '../components/MessageModal';
import { B2B } from '../constants/Colors';
import ScreenHeader from '../components/ScreenHeader';

const { GOLD, GOLD_LIGHT, GOLD_DARK, NAVY, NAVY_CARD, NAVY_BORDER, NAVY_INPUT, TEXT_PRIMARY, TEXT_MUTED, GOLD_DIM, GOLD_BORDER, NAVY_MID } = B2B;

const TABS = ['All', 'Processing', 'Shipment', 'Completed'];

interface Order {
    _id: string;
    orderId: string;
    status: string;
    totalNetWeight: number;
    totalGrossWeight: number;
    createdAt: string;
    items: any[];
    trackingId?: string;
}

export default function OrderHistoryScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    const insets = useSafeAreaInsets();
    const [activeTab, setActiveTab] = useState('All');
    const { updateCartCount } = useCart();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
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
    const [refreshing, setRefreshing] = useState(false);
    const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
    const [downloading, setDownloading] = useState<string | null>(null);

    const fetchOrders = async () => {
        try {
            const response = await orderService.getOrders({ limit: 50 });
            if (response.success) {
                setOrders(response.data.orders);
            }
        } catch (error: any) {
            console.error('Failed to load orders', error);
            const msg = error.response?.data?.message || 'Failed to load orders';
            setModalConfig({ visible: true, title: 'Error', message: msg, type: 'error' });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        updateCartCount();
        fetchOrders();
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchOrders();
    }, []);

    const handleDownloadInvoice = async (dbId: string, logicalId: string) => {
        try {
            const token = await storage.getItem('userToken');
            if (!token) {
                setModalConfig({ visible: true, title: 'Error', message: 'You need to be logged in to view invoices', type: 'error' });
                return;
            }

            const downloadDir = RNFS.CachesDirectoryPath;
            if (!downloadDir) {
                setModalConfig({ visible: true, title: 'Error', message: 'Storage not available on this device', type: 'error' });
                return;
            }

            const fileUri = downloadDir + `/Invoice-${logicalId}.pdf`;
            const downloadRes = await RNFS.downloadFile({
                fromUrl: `${API_BASE_URL}/orders/${dbId}/invoice`,
                toFile: fileUri,
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }).promise;

            if (downloadRes.statusCode === 200) {
                await Share.open({ url: `file://${fileUri}`, type: 'application/pdf' });
            } else {
                setModalConfig({ visible: true, title: 'Error', message: 'Failed to download invoice', type: 'error' });
            }
        } catch (error: any) {
            console.error('Invoice download error:', error);
            const msg = error.response?.data?.message || 'Could not download invoice';
            setModalConfig({ visible: true, title: 'Error', message: msg, type: 'error' });
        }
    };

    const getFilteredOrders = () => {
        if (activeTab === 'All') return orders;
        if (activeTab === 'Processing') return orders.filter(o => ['PENDING', 'PROCESSING'].includes(o.status));
        if (activeTab === 'Shipment') return orders.filter(o => ['SHIPPED', 'SHIPMENT'].includes(o.status));
        if (activeTab === 'Completed') return orders.filter(o => ['DELIVERED', 'COMPLETED'].includes(o.status));
        return orders;
    };

    const filteredOrders = getFilteredOrders();

    const formatDate = (dateString: string) => {
        const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    const getStatusConfig = (status: string): { label: string; color: string; bg: string; icon: IconName } => {
        switch (status) {
            case 'PROCESSING':
            case 'PENDING':
                return {
                    label: 'Processing',
                    color: GOLD,
                    bg: GOLD_DIM,
                    icon: 'history'
                };
            case 'SHIPMENT':
            case 'SHIPPED':
                return {
                    label: 'Shipment',
                    color: '#6366f1',
                    bg: 'rgba(99, 102, 241, 0.15)',
                    icon: 'local-shipping'
                };
            case 'COMPLETED':
            case 'DELIVERED':
                return {
                    label: 'Delivered',
                    color: '#10b981',
                    bg: 'rgba(16, 185, 129, 0.15)',
                    icon: 'check-circle'
                };
            case 'CANCELLED':
                return {
                    label: 'Cancelled',
                    color: '#ef4444',
                    bg: 'rgba(239, 68, 68, 0.15)',
                    icon: 'close'
                };
            default:
                return {
                    label: status,
                    color: TEXT_MUTED,
                    bg: NAVY_INPUT,
                    icon: 'info'
                };
        }
    };

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

            <ScreenHeader
                showBack
                title="Order Repository"
                rightElement={
                    <TouchableOpacity style={styles.headerRight}>
                        <Icon name="search" size={24} color={GOLD} />
                    </TouchableOpacity>
                }
            />

            <View style={styles.tabsSection}>
                <View style={styles.tabsWrapper}>
                    {TABS.map((tab) => {
                        const isActive = activeTab === tab;
                        return (
                            <TouchableOpacity
                                key={tab}
                                style={[styles.tab, isActive && styles.activeTab]}
                                onPress={() => setActiveTab(tab)}
                            >
                                <Text style={[styles.tabText, isActive && styles.activeTabText]}>
                                    {tab}
                                </Text>
                                {isActive && (
                                    <LinearGradient
                                        colors={[GOLD_DARK, GOLD, GOLD_LIGHT]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.activeTabIndicator}
                                    />
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            <ScrollView
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={GOLD}
                        colors={[GOLD]}
                    />
                }
            >
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={GOLD} />
                    </View>
                ) : filteredOrders.length > 0 ? (
                    filteredOrders.map((order) => {
                        const statusConfig = getStatusConfig(order.status);
                        return (
                            <TouchableOpacity
                                key={order._id}
                                style={styles.orderCard}
                                activeOpacity={0.7}
                                onPress={() => setExpandedOrderId(expandedOrderId === order._id ? null : order._id)}
                            >
                                <View style={styles.cardHeader}>
                                    <View>
                                        <Text style={styles.orderIdText}>Order #{order.orderId}</Text>
                                        <Text style={styles.orderDateText}>{formatDate(order.createdAt)}</Text>
                                    </View>
                                    <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                                        <Icon name={statusConfig.icon} size={14} color={statusConfig.color} style={{ marginRight: 6 }} />
                                        <Text style={[styles.statusTabText, { color: statusConfig.color }]}>
                                            {statusConfig.label}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.cardDivider} />

                                <View style={styles.statsRow}>
                                    <View style={styles.statBox}>
                                        <Text style={styles.statLabelText}>Net Weight</Text>
                                        <Text style={styles.statValueText}>{order.totalNetWeight}<Text style={styles.unitText}>g</Text></Text>
                                    </View>
                                    <View style={[styles.statBox, styles.statBorder]}>
                                        <Text style={styles.statLabelText}>Gross Weight</Text>
                                        <Text style={styles.statValueText}>{order.totalGrossWeight}<Text style={styles.unitText}>g</Text></Text>
                                    </View>
                                    <View style={[styles.statBox, styles.statBorder]}>
                                        <Text style={styles.statLabelText}>Items</Text>
                                        <Text style={styles.statValueText}>{order.items.length}<Text style={styles.unitText}> Designs</Text></Text>
                                    </View>
                                </View>

                                {expandedOrderId === order._id && (
                                    <View style={styles.expandedSection}>
                                        <Text style={styles.expandedTitle}>ITEM BREAKDOWN</Text>
                                        <View style={styles.expandedDivider} />
                                        {order.items.map((item, idx) => {
                                            const productImg = item.image || item.product?.images?.[0];
                                            const imgUrl = productImg ? getImageUrl(productImg) : 'https://images.unsplash.com/photo-1615486171448-4fd3ac54bc67';
                                            const productName = item.name || item.product?.name || 'Unknown Product';
                                            const productDesign = item.designNumber || item.product?.designNumber || '';
                                            return (
                                                <View key={idx} style={styles.expandedItemRow}>
                                                    <Image source={{ uri: imgUrl }} style={styles.expandedItemImage} />
                                                    <View style={styles.expandedItemDetails}>
                                                        <Text style={styles.expandedItemName} numberOfLines={1}>{productName}</Text>
                                                        <Text style={styles.expandedItemText} numberOfLines={1}>DESIGN NO. {item.designNumber || productDesign || 'N/A'}</Text>
                                                        <Text style={styles.expandedItemText} numberOfLines={1}>TAG NO. {item.tagNumber || item.product?.tagNumber || 'N/A'}</Text>
                                                        <View style={styles.expandedItemMetaRow}>
                                                            {item.material && <View style={styles.expandedBadge}><Text style={styles.expandedBadgeText}>{item.material}</Text></View>}
                                                            {item.purity && <View style={styles.expandedBadge}><Text style={styles.expandedBadgeText}>{item.purity}</Text></View>}
                                                            {item.size && <View style={styles.expandedBadge}><Text style={styles.expandedBadgeText}>Sz {item.size}</Text></View>}
                                                        </View>
                                                        {item.description ? (
                                                            <View style={styles.expandedNoteRow}>
                                                                <Text style={styles.expandedNoteLabel}>NOTE: </Text>
                                                                <Text style={styles.expandedNoteText}>{item.description}</Text>
                                                            </View>
                                                        ) : null}
                                                    </View>
                                                    <View style={styles.expandedItemQty}>
                                                        <Text style={styles.expandedQtyLabel}>QTY</Text>
                                                        <Text style={styles.expandedQtyValue}>{item.quantity}</Text>
                                                    </View>
                                                </View>
                                            );
                                        })}
                                    </View>
                                )}

                                <View style={[styles.cardActions, !order.trackingId && { justifyContent: 'flex-end' }]}>
                                    {order.trackingId && (
                                        <View style={styles.trackingInfo}>
                                            <Icon name="local-shipping" size={16} color={GOLD} />
                                            <Text style={styles.trackingText}>{order.trackingId}</Text>
                                        </View>
                                    )}
                                    <TouchableOpacity
                                        style={styles.invoiceBtn}
                                        onPress={() => handleDownloadInvoice(order._id, order.orderId)}
                                    >
                                        <LinearGradient
                                            colors={[GOLD_DARK, GOLD]}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                            style={styles.invoiceGradient}
                                        />
                                        <Icon name="receipt-long" size={18} color={NAVY} />
                                        <Text style={styles.invoiceBtnText}>INVOICE</Text>
                                    </TouchableOpacity>
                                </View>
                            </TouchableOpacity>
                        );
                    })
                ) : (
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconCircle}>
                            <Icon name="inventory-2" size={48} color={NAVY_BORDER} />
                        </View>
                        <Text style={styles.emptyTitleText}>No Orders Documented</Text>
                        <Text style={styles.emptySubText}>Your transaction history will be cataloged here as you place orders.</Text>
                        <TouchableOpacity
                            style={styles.browseBtn}
                            onPress={() => navigation.navigate('home' as any)}
                        >
                            <Text style={styles.browseBtnText}>CATALOG BROWSER</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>

            {/* <BottomNav activeTab="Orders" /> */}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: NAVY,
    },
    background: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    headerRight: {
        padding: 8,
    },
    tabsSection: {
        paddingHorizontal: 20,
        marginTop: 12,
        marginBottom: 20,
    },
    tabsWrapper: {
        flexDirection: 'row',
        backgroundColor: NAVY_CARD,
        borderRadius: 16,
        padding: 4,
        borderWidth: 1,
        borderColor: NAVY_BORDER,
    },
    tab: {
        flex: 1,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12,
        position: 'relative',
    },
    activeTab: {
        backgroundColor: 'rgba(201,168,76,0.05)',
    },
    tabText: {
        fontSize: 12,
        fontWeight: '700',
        color: TEXT_MUTED,
    },
    activeTabText: {
        color: GOLD,
        fontWeight: '900',
    },
    activeTabIndicator: {
        position: 'absolute',
        bottom: 6,
        width: 12,
        height: 2,
        borderRadius: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 4,
    },
    loadingContainer: {
        marginTop: 60,
        alignItems: 'center',
    },
    orderCard: {
        backgroundColor: NAVY_CARD,
        borderRadius: 24,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: NAVY_BORDER,
        overflow: 'hidden',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    orderIdText: {
        fontSize: 15,
        fontWeight: '900',
        color: TEXT_PRIMARY,
        letterSpacing: -0.5,
    },
    orderDateText: {
        fontSize: 12,
        fontWeight: '600',
        color: TEXT_MUTED,
        marginTop: 4,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    statusTabText: {
        fontSize: 10,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    cardDivider: {
        height: 1,
        backgroundColor: NAVY_BORDER,
        marginBottom: 16,
    },
    statsRow: {
        flexDirection: 'row',
    },
    statBox: {
        flex: 1,
        gap: 4,
    },
    statBorder: {
        borderLeftWidth: 1,
        borderLeftColor: NAVY_BORDER,
        paddingLeft: 16,
    },
    statLabelText: {
        fontSize: 9,
        fontWeight: '900',
        color: TEXT_MUTED,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    statValueText: {
        fontSize: 15,
        fontWeight: '700',
        color: TEXT_PRIMARY,
    },
    unitText: {
        fontSize: 10,
        color: TEXT_MUTED,
        fontWeight: '600',
    },
    cardActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: NAVY_BORDER,
    },
    trackingInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    trackingText: {
        fontSize: 12,
        fontWeight: '700',
        color: TEXT_MUTED,
    },
    invoiceBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 12,
        gap: 8,
        overflow: 'hidden',
    },
    invoiceGradient: {
        ...StyleSheet.absoluteFillObject,
    },
    invoiceBtnText: {
        fontSize: 11,
        fontWeight: '900',
        color: NAVY,
        letterSpacing: 0.5,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingTop: 80,
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
        marginBottom: 24,
    },
    emptyTitleText: {
        fontSize: 18,
        fontWeight: '900',
        color: TEXT_PRIMARY,
        marginBottom: 8,
    },
    emptySubText: {
        fontSize: 13,
        color: TEXT_MUTED,
        textAlign: 'center',
        lineHeight: 20,
        paddingHorizontal: 40,
        marginBottom: 32,
    },
    browseBtn: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: GOLD,
        borderRadius: 16,
    },
    browseBtnText: {
        fontSize: 12,
        fontWeight: '900',
        color: NAVY,
        letterSpacing: 1,
    },
    expandedSection: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: NAVY_BORDER,
    },
    expandedTitle: {
        fontSize: 10,
        fontWeight: '900',
        color: GOLD,
        letterSpacing: 2,
    },
    expandedDivider: {
        height: 1,
        backgroundColor: NAVY_BORDER,
        marginTop: 8,
        marginBottom: 12,
    },
    expandedItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    expandedItemImage: {
        width: 48,
        height: 48,
        borderRadius: 8,
        backgroundColor: NAVY_INPUT,
        borderWidth: 1,
        borderColor: NAVY_BORDER,
    },
    expandedItemDetails: {
        flex: 1,
        paddingHorizontal: 12,
        justifyContent: 'center',
    },
    expandedItemName: {
        fontSize: 13,
        fontWeight: '700',
        color: TEXT_PRIMARY,
        marginBottom: 2,
    },
    expandedItemText: {
        fontSize: 10,
        fontWeight: '600',
        color: TEXT_MUTED,
        marginBottom: 6,
    },
    expandedItemMetaRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 8,
    },
    expandedBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        backgroundColor: NAVY_INPUT,
        borderWidth: 1,
        borderColor: NAVY_BORDER,
    },
    expandedBadgeText: {
        fontSize: 9,
        fontWeight: '900',
        color: TEXT_MUTED,
        letterSpacing: 0.5,
    },
    expandedNoteRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(251,113,133,0.05)',
        paddingHorizontal: 6,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(251,113,133,0.1)',
        alignSelf: 'flex-start',
        marginTop: 4,
    },
    expandedNoteLabel: {
        fontSize: 9,
        fontWeight: '900',
        color: '#fb7185',
    },
    expandedNoteText: {
        fontSize: 9,
        fontWeight: '500',
        color: TEXT_PRIMARY,
    },
    expandedItemQty: {
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    expandedQtyLabel: {
        fontSize: 9,
        fontWeight: '900',
        color: TEXT_MUTED,
        letterSpacing: 1,
    },
    expandedQtyValue: {
        fontSize: 16,
        fontWeight: '900',
        color: GOLD,
    },
});
