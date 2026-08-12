import React, { useState, useMemo, useRef } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    Image,
    TouchableOpacity,
    Modal,
    TextInput,
    StatusBar,
    ActivityIndicator,
    Alert,
    Pressable,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import Icon from '../components/Icon';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { B2B } from '../constants/Colors';
import { cartService } from '../services/cartService';
import { useCart } from '../context/CartContext';
import { storage } from '../services/storage';
import ScreenHeader from '../components/ScreenHeader';
import { tpinService } from '../services/tpinService';
import MessageModal from '../components/MessageModal';

const { GOLD, GOLD_LIGHT, GOLD_DARK, NAVY, NAVY_CARD, NAVY_BORDER, NAVY_INPUT, TEXT_PRIMARY, TEXT_MUTED, GOLD_DIM, GOLD_BORDER } = B2B;

export default function CartScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    const insets = useSafeAreaInsets();

    // Cart state
    const [cartItems, setCartItems] = useState<any[]>([]);
    const [loadingCart, setLoadingCart] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const { cartCount, updateCartCount } = useCart();

    // T-PIN modal state
    const [showTpinModal, setShowTpinModal] = useState(false);
    const [tpinMode, setTpinMode] = useState<'verify' | 'generate' | 'confirm'>('verify');
    const [tpinInput, setTpinInput] = useState('');
    const [tpinConfirm, setTpinConfirm] = useState('');
    const [tpinError, setTpinError] = useState('');
    const [tpinLoading, setTpinLoading] = useState(false);

    // Refs so tapping the dots always re-opens the keyboard
    const tpinInputRef = useRef<TextInput>(null);
    const tpinConfirmRef = useRef<TextInput>(null);

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

    const fetchCart = async () => {
        const token = await storage.getItem('userToken');
        if (!token) {
            setLoadingCart(false);
            return;
        }

        try {
            const response = await cartService.getCart();
            if (response.success) {
                setCartItems(response.data.items);
            }
        } catch (error) {
            console.error('Error fetching cart:', error);
        } finally {
            setLoadingCart(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            fetchCart();
        }, [])
    );

    const updateQuantity = async (id: string, currentQty: number, delta: number) => {
        const newQty = Math.max(1, currentQty + delta);
        try {
            await cartService.updateCartItem(id, newQty);
            await updateCartCount();
            fetchCart();
        } catch (error) {
            setModalConfig({ visible: true, title: 'Error', message: 'Failed to update quantity', type: 'error' });
        }
    };

    const removeItem = async (id: string) => {
        try {
            await cartService.removeCartItem(id);
            await updateCartCount();
            fetchCart();
        } catch (error) {
            setModalConfig({ visible: true, title: 'Error', message: 'Failed to remove item', type: 'error' });
        }
    };

    const clearCart = async () => {
        try {
            await cartService.clearCart();
            await updateCartCount();
            fetchCart();
        } catch (error) {
            setModalConfig({ visible: true, title: 'Error', message: 'Failed to clear cart', type: 'error' });
        }
    };

    const handleSubmitOrder = async () => {
        if (cartItems.length === 0) {
            setModalConfig({ visible: true, title: 'Empty Cart', message: 'Please add items to your cart before submitting.', type: 'info' });
            return;
        }

        try {
            setTpinLoading(true);
            const statusRes = await tpinService.getStatus();
            const { hasTpin, isLocked, minutesLeft } = statusRes.data;

            if (isLocked) {
                setModalConfig({ visible: true, title: 'Account Locked', message: `Too many failed attempts. Try again in ${minutesLeft} minute(s).`, type: 'error' });
                setTpinLoading(false);
                return;
            }

            setTpinInput('');
            setTpinConfirm('');
            setTpinError('');

            if (hasTpin) {
                setTpinMode('verify');
            } else {
                setTpinMode('generate');
            }
            setShowTpinModal(true);
        } catch (error) {
            setModalConfig({ visible: true, title: 'Error', message: 'Failed to check T-PIN status. Please try again.', type: 'error' });
        } finally {
            setTpinLoading(false);
        }
    };

    const handleGenerateTpin = async () => {
        if (tpinInput.length !== 4) {
            setTpinError('T-PIN must be exactly 4 digits');
            return;
        }
        if (tpinMode === 'generate') {
            // Move to confirm step
            setTpinMode('confirm');
            setTpinConfirm('');
            setTpinError('');
            return;
        }
        // tpinMode === 'confirm'
        if (tpinConfirm !== tpinInput) {
            setTpinError('T-PINs do not match. Please try again.');
            return;
        }
        try {
            setTpinLoading(true);
            // Step 1: Create the T-PIN
            await tpinService.generate(tpinInput);
            // Step 2: Immediately place the order with the new PIN
            const response = await cartService.placeOrder(tpinInput);

            // Step 3: Clear everything and navigate
            setCartItems([]);
            updateCartCount();
            setShowTpinModal(false);
            setTpinInput('');
            setTpinConfirm('');
            setTpinError('');

            const orderId = response?.data?.orderId || response?.orderId || '';
            setModalConfig({
                visible: true,
                title: 'Order Placed! 🎉',
                message: `T-PIN created and order${orderId ? ` #${orderId}` : ''} submitted successfully!`,
                type: 'success',
            });
            // Navigate immediately — don't wait for user to close modal
            navigation.navigate('orders' as any);
        } catch (error: any) {
            const msg = error.response?.data?.message || 'Failed to complete order';
            setTpinError(msg);
        } finally {
            setTpinLoading(false);
        }
    };

    const handleVerifyAndOrder = async () => {
        if (tpinInput.length !== 4) {
            setTpinError('T-PIN must be exactly 4 digits');
            return;
        }
        try {
            setTpinLoading(true);
            setSubmitting(true);
            const response = await cartService.placeOrder(tpinInput);

            console.log('response', response)

            // Accept any truthy success signal from the server
            if (response?.success || response?.data?.orderId || response?.orderId || response?.data?.order) {
                // 1. Clear T-PIN modal & cart state immediately
                setShowTpinModal(false);
                setTpinInput('');
                setTpinError('');
                setCartItems([]);
                updateCartCount();

                // 2. Navigate to orders right away (don't wait for modal close)
                navigation.navigate('orders' as any);

                // 3. Show a small success message on the orders screen
                const orderId = response?.data?.orderId || response?.orderId || '';
                setTimeout(() => {
                    setModalConfig({
                        visible: true,
                        title: 'Order Placed! 🎉',
                        message: `Your order${orderId ? ` #${orderId}` : ''} has been submitted successfully.`,
                        type: 'success',
                    });
                }, 300);
            } else {
                // Success-looking response but no identifiable order ID — still navigate
                setShowTpinModal(false);
                setCartItems([]);
                updateCartCount();
                navigation.navigate('orders' as any);
            }
        } catch (error: any) {
            const msg = error.response?.data?.message || 'Failed to place order. Please try again.';
            setTpinError(msg);
        } finally {
            setTpinLoading(false);
            setSubmitting(false);
        }
    };

    const weightBreakdown = useMemo(() => {
        let totalNetWt = 0;
        let totalGrossWt = 0;

        cartItems.forEach((item: any) => {
            const qty = item.quantity || 1;
            const netWt = parseFloat(item.product?.netWt) || 0;
            const grossWt = parseFloat(item.product?.grossWt) || 0;
            totalNetWt += netWt * qty;
            totalGrossWt += grossWt * qty;
        });

        return {
            totalNetWt: totalNetWt.toFixed(2),
            totalGrossWt: totalGrossWt.toFixed(2),
        };
    }, [cartItems]);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={NAVY} />

            <LinearGradient
                colors={[NAVY, B2B.NAVY_MID, '#111D35']}
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
                buttonText={modalConfig.title === 'Order Placed!' ? 'View Orders' : 'OK'}
            />

            <ScreenHeader
                showBack
                title="Order Cart"
            />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Order Items ({cartItems.length})</Text>
                    {loadingCart && <ActivityIndicator size="small" color={GOLD} />}
                </View>

                <View style={styles.itemsList}>
                    {!loadingCart && cartItems.length === 0 && (
                        <View style={{ alignItems: 'center', marginTop: 40 }}>
                            <Icon name="shopping-cart" size={64} color={NAVY_BORDER} />
                            <Text style={{ marginTop: 16, fontSize: 16, color: TEXT_MUTED }}>Your cart is empty</Text>
                            <TouchableOpacity
                                style={{ marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: GOLD, borderRadius: 12 }}
                                onPress={() => navigation.navigate('home' as any)}
                            >
                                <Text style={{ color: NAVY, fontWeight: '900', fontSize: 12 }}>BROWSE PRODUCTS</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    {cartItems.map((item) => (
                        <View key={item._id} style={styles.itemCard}>
                            <View style={styles.itemMain}>
                                <Image source={{ uri: item.product?.images?.[0] || 'https://lh3.googleusercontent.com/aida-public/placeholder' }} style={styles.itemImage} />
                                <View style={styles.itemInfo}>
                                    <View style={styles.itemHeader}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.itemName} numberOfLines={1}>{item.product?.name || 'Unknown Product'}</Text>
                                            <Text style={styles.itemRef}>DESIGN NO. {item.product?.designNumber || 'N/A'}</Text>
                                            <Text style={styles.itemRef}>TAG NO. {item.product?.tagNumber || 'N/A'}</Text>
                                        </View>
                                        <TouchableOpacity style={styles.removeButton} onPress={() => removeItem(item._id)}>
                                            <Icon name="close" size={20} color={TEXT_MUTED} />
                                        </TouchableOpacity>
                                    </View>
                                    <View style={styles.tagsRow}>
                                        <View style={styles.tag}>
                                            <Text style={styles.tagText}>
                                                {item.purity || '18K'} {item.material || 'Gold'}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.itemControls}>
                                <View style={[styles.controlGroup]}>
                                    <Text style={styles.controlLabel}>SIZE</Text>
                                    <View style={styles.dateDisplay}>
                                        <Text style={styles.dateText}>{item.size || 'N/A'}</Text>
                                    </View>
                                </View>
                                <View style={[styles.controlGroup]}>
                                    <Text style={[styles.controlLabel, { textAlign: 'right' }]}>QUANTITY</Text>
                                    <View style={styles.qtyControl}>
                                        <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(item._id, item.quantity, -1)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                                            <Icon name="remove" size={16} color={GOLD} />
                                        </TouchableOpacity>
                                        <Text style={styles.qtyText}>{item.quantity}</Text>
                                        <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(item._id, item.quantity, 1)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                                            <Icon name="add" size={16} color={GOLD} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>

                            {item.description ? (
                                <View style={styles.itemNoteRow}>
                                    <Text style={styles.controlLabel}>NOTE :  <Text style={styles.noteText}>{item.description}</Text></Text>

                                </View>
                            ) : null}

                            <View style={styles.itemNoteRow}>
                                <Text style={styles.controlLabel}>DATE ADDED :  <Text style={styles.dateTextSmall}>{new Date(item.createdAt || Date.now()).toLocaleDateString()}</Text></Text>
                            </View>

                            <View style={styles.itemWeights}>
                                <View style={styles.weightCol}>
                                    <Text style={styles.weightLabel}>NET WT.</Text>
                                    <Text style={styles.weightValue}>{(parseFloat(item.product?.netWt || '0') * (item.quantity || 1)).toFixed(2)}g</Text>
                                </View>
                                <View style={[styles.weightCol, styles.weightBorder]}>
                                    <Text style={styles.weightLabel}>GROSS WT.</Text>
                                    <Text style={styles.weightValue}>{(parseFloat(item.product?.grossWt || '0') * (item.quantity || 1)).toFixed(2)}g</Text>
                                </View>
                            </View>
                        </View>
                    ))}
                </View>

                <View style={[styles.card, styles.breakdownCard]}>
                    <Text style={styles.breakdownTitle}>WEIGHT BREAKDOWN</Text>
                    <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>TOTAL NET WEIGHT</Text>
                        <Text style={styles.breakdownValue}>{weightBreakdown.totalNetWt} g</Text>
                    </View>
                    <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>TOTAL GROSS WEIGHT</Text>
                        <Text style={styles.breakdownValue}>{weightBreakdown.totalGrossWt} g</Text>
                    </View>
                    <View style={styles.totalRow}>
                        <View>
                            <Text style={styles.totalLabel}>AGGREGATE TOTAL</Text>
                            <Text style={styles.totalSubLabel}>Gross Weight</Text>
                        </View>
                        <Text style={styles.totalValue}>{weightBreakdown.totalGrossWt} <Text style={styles.unitText}>g</Text></Text>
                    </View>
                </View>

                <View style={styles.infoCard}>
                    <Icon name="info" size={20} color={GOLD} />
                    <Text style={styles.infoText}>
                        Estimated weights are provided for reference. Final verified gross weight and shipping documentation will be provided upon dispatch. Delivery dates are item-specific.
                    </Text>
                </View>
            </ScrollView>

            <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 24) }]}>
                <TouchableOpacity
                    style={[styles.submitButton, (submitting || cartItems.length === 0) && { opacity: 0.7 }]}
                    onPress={handleSubmitOrder}
                    disabled={submitting || cartItems.length === 0}
                >
                    <LinearGradient
                        colors={[GOLD_DARK, GOLD, GOLD_LIGHT]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFillObject}
                    />
                    <Text style={styles.submitText}>{submitting ? 'Placing Order...' : 'Submit Order Request'}</Text>
                    {submitting && <ActivityIndicator size="small" color={NAVY} style={{ marginLeft: 8 }} />}
                </TouchableOpacity>
            </View>

            <Modal visible={showTpinModal} transparent animationType="fade" onRequestClose={() => setShowTpinModal(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <View style={tpinStyles.overlay}>
                        <View style={tpinStyles.modalCard}>
                            <TouchableOpacity style={tpinStyles.closeBtn} onPress={() => setShowTpinModal(false)}>
                                <Icon name="close" size={24} color={TEXT_MUTED} />
                            </TouchableOpacity>
                            <View style={tpinStyles.iconCircle}>
                                <Icon name={tpinMode === 'verify' ? 'lock' : 'vpn-key'} size={32} color={GOLD} />
                            </View>
                            <Text style={tpinStyles.title}>
                                {tpinMode === 'verify' ? 'Enter T-PIN' : tpinMode === 'generate' ? 'Create T-PIN' : 'Confirm T-PIN'}
                            </Text>
                            <Text style={tpinStyles.subtitle}>
                                {tpinMode === 'verify'
                                    ? 'Enter your 4-digit T-PIN to place the order'
                                    : tpinMode === 'generate'
                                        ? 'Create a 4-digit T-PIN for secure order placement'
                                        : 'Re-enter your T-PIN to confirm'}
                            </Text>

                            {/* CONFIRM PIN dots */}
                            {tpinMode === 'confirm' ? (
                                <View style={tpinStyles.inputGroup}>
                                    <Text style={tpinStyles.inputLabel}>Re-enter T-PIN</Text>
                                    <Pressable
                                        style={tpinStyles.pinContainer}
                                        onPress={() => tpinConfirmRef.current?.focus()}
                                    >
                                        {[0, 1, 2, 3].map((i) => (
                                            <View key={i} style={[tpinStyles.pinDot, tpinConfirm.length > i && tpinStyles.pinDotActive]}>
                                                <Text style={tpinStyles.pinText}>{tpinConfirm[i] ? '●' : ''}</Text>
                                            </View>
                                        ))}
                                    </Pressable>
                                    <TextInput
                                        ref={tpinConfirmRef}
                                        style={tpinStyles.hiddenInput}
                                        value={tpinConfirm}
                                        onChangeText={(t) => { setTpinConfirm(t.replace(/[^0-9]/g, '').slice(0, 4)); setTpinError(''); }}
                                        keyboardType="number-pad"
                                        maxLength={4}
                                        autoFocus
                                    />
                                </View>
                            ) : (
                                /* VERIFY / GENERATE PIN dots */
                                <View style={tpinStyles.inputGroup}>
                                    <Text style={tpinStyles.inputLabel}>
                                        {tpinMode === 'verify' ? 'Enter T-PIN' : 'Create 4-digit T-PIN'}
                                    </Text>
                                    <Pressable
                                        style={tpinStyles.pinContainer}
                                        onPress={() => tpinInputRef.current?.focus()}
                                    >
                                        {[0, 1, 2, 3].map((i) => (
                                            <View key={i} style={[tpinStyles.pinDot, tpinInput.length > i && tpinStyles.pinDotActive]}>
                                                <Text style={tpinStyles.pinText}>{tpinInput[i] ? '●' : ''}</Text>
                                            </View>
                                        ))}
                                    </Pressable>
                                    <TextInput
                                        ref={tpinInputRef}
                                        style={tpinStyles.hiddenInput}
                                        value={tpinInput}
                                        onChangeText={(t) => { setTpinInput(t.replace(/[^0-9]/g, '').slice(0, 4)); setTpinError(''); }}
                                        keyboardType="number-pad"
                                        maxLength={4}
                                        autoFocus
                                    />
                                </View>
                            )}

                            {!!tpinError && (
                                <View style={tpinStyles.errorRow}>
                                    <Icon name="error-outline" size={16} color="#fb7185" />
                                    <Text style={tpinStyles.errorText}>{tpinError}</Text>
                                </View>
                            )}

                            <TouchableOpacity
                                style={[tpinStyles.actionBtn, tpinLoading && { opacity: 0.7 }]}
                                onPress={tpinMode === 'verify' ? handleVerifyAndOrder : handleGenerateTpin}
                                disabled={tpinLoading}
                            >
                                <LinearGradient
                                    colors={[GOLD_DARK, GOLD, GOLD_LIGHT]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={StyleSheet.absoluteFillObject}
                                />
                                {tpinLoading ? (
                                    <ActivityIndicator size="small" color={NAVY} />
                                ) : (
                                    <Text style={tpinStyles.actionBtnText}>
                                        {tpinMode === 'verify' ? 'Verify & Place Order' : tpinMode === 'generate' ? 'Next' : 'Create T-PIN'}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
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
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
    },
    clearButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: NAVY_INPUT,
        borderWidth: 1,
        borderColor: NAVY_BORDER,
    },
    clearText: {
        fontSize: 11,
        fontWeight: '800',
        color: GOLD,
        letterSpacing: 0.5,
    },
    scrollContent: {
        paddingTop: 24,
        paddingBottom: 160,
        paddingHorizontal: 20,
    },
    card: {
        borderRadius: 24,
        padding: 24,
        backgroundColor: NAVY_CARD,
        borderWidth: 1,
        borderColor: NAVY_BORDER,
        marginBottom: 32,
        overflow: 'hidden',
    },
    cardLabel: {
        fontSize: 10,
        fontWeight: '900',
        color: TEXT_MUTED,
        letterSpacing: 2,
        textTransform: 'uppercase',
        marginBottom: 16,
    },
    quickAddRow: {
        flexDirection: 'row',
        gap: 12,
    },
    inputWrapper: {
        flex: 1,
        height: 52,
        backgroundColor: NAVY_INPUT,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: NAVY_BORDER,
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    qtyInputWrapper: {
        width: 72,
        height: 52,
        backgroundColor: NAVY_INPUT,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: NAVY_BORDER,
        justifyContent: 'center',
        alignItems: 'center',
    },
    input: {
        fontSize: 14,
        fontWeight: '700',
        color: TEXT_PRIMARY,
        width: '100%',
    },
    qtyInput: {
        textAlign: 'center',
        fontWeight: '800',
    },
    addButton: {
        width: 52,
        height: 52,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: TEXT_PRIMARY,
        letterSpacing: -0.5,
    },
    itemsList: {
        gap: 20,
        marginBottom: 32,
    },
    itemCard: {
        borderRadius: 24,
        padding: 20,
        backgroundColor: NAVY_CARD,
        borderWidth: 1,
        borderColor: NAVY_BORDER,
        overflow: 'hidden',
    },
    itemMain: {
        flexDirection: 'row',
        gap: 20,
        marginBottom: 20,
    },
    itemImage: {
        width: 72,
        height: 72,
        borderRadius: 20,
        backgroundColor: NAVY_INPUT,
        borderWidth: 1,
        borderColor: NAVY_BORDER,
    },
    itemInfo: {
        flex: 1,
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    itemName: {
        fontSize: 16,
        fontWeight: '700',
        color: TEXT_PRIMARY,
        marginBottom: 4,
    },
    itemRef: {
        fontSize: 11,
        fontWeight: '800',
        color: TEXT_MUTED,
        letterSpacing: 0.5,
    },
    removeButton: {
        padding: 8,
        marginRight: -8,
        marginTop: -8,
    },
    tagsRow: {
        flexDirection: 'row',
        marginTop: 8,
    },
    tag: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: NAVY_INPUT,
        borderWidth: 1,
        borderColor: GOLD_BORDER,
    },
    tagText: {
        fontSize: 9,
        fontWeight: '800',
        color: GOLD,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    itemControls: {
        flexDirection: 'row',
        gap: 20,
        marginBottom: 20,
    },
    controlGroup: {
        flex: 1,
        gap: 8,
    },
    controlLabel: {
        fontSize: 9,
        fontWeight: '900',
        color: TEXT_MUTED,
        // letterSpacing: 1,
    },
    dateDisplay: {
        height: 44,
        backgroundColor: NAVY_INPUT,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: NAVY_BORDER,
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    dateText: {
        fontSize: 13,
        fontWeight: '700',
        color: TEXT_PRIMARY,
    },
    qtyControl: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    qtyBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: NAVY_INPUT,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: NAVY_BORDER,
    },
    qtyText: {
        fontSize: 18,
        fontWeight: '800',
        color: TEXT_PRIMARY,
        width: 32,
        textAlign: 'center',
    },
    itemNoteRow: {
        marginBottom: 16,
    },
    noteDisplay: {
        backgroundColor: NAVY_INPUT,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: NAVY_BORDER,
        padding: 12,
        marginTop: 8,
    },
    noteText: {
        fontSize: 12,
        color: TEXT_PRIMARY,
        lineHeight: 18,
        fontWeight: '700',
    },
    itemDateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 8,
    },
    dateTextSmall: {
        fontSize: 12,
        fontWeight: '700',
        color: TEXT_PRIMARY,
    },
    itemWeights: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: NAVY_BORDER,
        paddingTop: 16,
    },
    weightCol: {
        flex: 1,
        gap: 4,
    },
    weightBorder: {
        borderLeftWidth: 1,
        borderLeftColor: NAVY_BORDER,
        paddingLeft: 20,
    },
    weightLabel: {
        fontSize: 9,
        fontWeight: '900',
        color: TEXT_MUTED,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    weightValue: {
        fontSize: 14,
        fontWeight: '700',
        color: TEXT_PRIMARY,
    },
    breakdownCard: {
        marginBottom: 32,
    },
    breakdownTitle: {
        fontSize: 10,
        fontWeight: '900',
        color: GOLD,
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: NAVY_BORDER,
        paddingBottom: 16,
    },
    breakdownRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    breakdownLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: TEXT_MUTED,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    breakdownValue: {
        fontSize: 14,
        fontWeight: '700',
        color: TEXT_PRIMARY,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        borderTopWidth: 1,
        borderTopColor: NAVY_BORDER,
        paddingTop: 24,
        marginTop: 8,
    },
    totalLabel: {
        fontSize: 10,
        fontWeight: '900',
        color: TEXT_MUTED,
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    totalSubLabel: {
        fontSize: 18,
        fontWeight: '900',
        color: TEXT_PRIMARY,
        marginTop: 4,
    },
    totalValue: {
        fontSize: 32,
        fontWeight: '900',
        color: GOLD,
    },
    unitText: {
        fontSize: 18,
        fontWeight: '700',
        color: TEXT_MUTED,
    },
    infoCard: {
        flexDirection: 'row',
        padding: 20,
        borderRadius: 20,
        backgroundColor: 'rgba(201,168,76,0.05)',
        borderWidth: 1,
        borderColor: GOLD_BORDER,
        gap: 16,
        alignItems: 'flex-start',
    },
    infoText: {
        flex: 1,
        fontSize: 12,
        fontWeight: '500',
        color: TEXT_MUTED,
        lineHeight: 18,
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 24,
        borderTopWidth: 1,
        borderTopColor: NAVY_BORDER,
        backgroundColor: 'rgba(11,18,32,0.95)',
    },
    submitButton: {
        height: 60,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        overflow: 'hidden',
    },
    submitText: {
        fontSize: 14,
        fontWeight: '900',
        color: NAVY,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
});

const tpinStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(11,18,32,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalCard: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 32,
        padding: 32,
        backgroundColor: NAVY_CARD,
        borderWidth: 1,
        borderColor: NAVY_BORDER,
        alignItems: 'center',
    },
    closeBtn: {
        position: 'absolute',
        top: 20,
        right: 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: NAVY_INPUT,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: NAVY_BORDER,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: GOLD_DIM,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: GOLD_BORDER,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: TEXT_PRIMARY,
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 14,
        color: TEXT_MUTED,
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 20,
    },
    inputGroup: {
        width: '100%',
        marginBottom: 24,
    },
    inputLabel: {
        fontSize: 10,
        fontWeight: '900',
        color: TEXT_MUTED,
        marginBottom: 12,
        textAlign: 'center',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
    },
    pinContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
        paddingVertical: 10,
    },
    pinDot: {
        width: 48,
        height: 56,
        borderRadius: 12,
        backgroundColor: NAVY_INPUT,
        borderWidth: 1,
        borderColor: NAVY_BORDER,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pinDotActive: {
        borderColor: GOLD,
    },
    pinText: {
        fontSize: 20,
        color: GOLD,
    },
    hiddenInput: {
        position: 'absolute',
        top: 24, // below the label
        bottom: 0,
        left: 0,
        right: 0,
        opacity: 0,
        fontSize: 1,
    },
    errorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 24,
    },
    errorText: {
        fontSize: 13,
        color: '#fb7185',
        fontWeight: '600',
    },
    actionBtn: {
        width: '100%',
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    actionBtnText: {
        fontSize: 14,
        fontWeight: '900',
        color: NAVY,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
});
