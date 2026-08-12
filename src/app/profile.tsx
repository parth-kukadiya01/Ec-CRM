import React from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    Image,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Modal as RNModal,
} from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import { StatusBar } from 'react-native';
import Icon from '../components/Icon';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { B2B } from '../constants/Colors';

import { authService } from '../services/authService';
import { userService } from '../services/userService';
import { useEffect, useState } from 'react';
import { getImageUrl } from '../constants/api';
import ScreenHeader from '../components/ScreenHeader';
import BottomNav from '../components/BottomNav';
import { launchImageLibrary } from 'react-native-image-picker';
import { tpinService } from '../services/tpinService';
import { useAppDispatch } from '../store/hooks';
import { logoutUser } from '../store/slices/authSlice';
import MessageModal from '../components/MessageModal';

const { GOLD, GOLD_LIGHT, GOLD_DARK, NAVY, NAVY_CARD, NAVY_BORDER, NAVY_INPUT, TEXT_PRIMARY, TEXT_MUTED, GOLD_DIM, GOLD_BORDER, NAVY_MID } = B2B;

export default function BusinessProfileScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    const dispatch = useAppDispatch();
    const insets = useSafeAreaInsets();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploadingCard, setUploadingCard] = useState(false);

    // Editable fields
    const [fullName, setFullName] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [phone, setPhone] = useState('');
    const [whatsappNumber, setWhatsappNumber] = useState('');
    const [address, setAddress] = useState('');
    const [panNumber, setPanNumber] = useState('');
    const [gstNumber, setGstNumber] = useState('');
    const [visitingCard, setVisitingCard] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const res = await userService.getProfile();
            const data = res.data;
            setUser(data);
            populateFields(data);
        } catch (error) {
            // Fallback to local storage
            try {
                const userData = await authService.getCurrentUser();
                if (userData) {
                    setUser(userData);
                    populateFields(userData);
                }
            } catch (e) { }
        } finally {
            setLoading(false);
        }
    };

    const populateFields = (data: any) => {
        setFullName(data?.fullName || '');
        setCompanyName(data?.companyName || '');
        setPhone(data?.phone || '');
        setWhatsappNumber(data?.whatsappNumber || '');
        setAddress(data?.address || '');
        setPanNumber(data?.panNumber || '');
        setGstNumber(data?.gstNumber || '');
        setVisitingCard(data?.visitingCard || null);
    };

    useEffect(() => { fetchProfile(); }, []);

    const handleCancel = () => {
        populateFields(user);
        setEditing(false);
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setFieldErrors({});
            const res = await userService.updateProfile({
                fullName, companyName, phone, whatsappNumber, address, panNumber, gstNumber, visitingCard,
            });
            if (res.success) {
                setUser(res.data);
                setEditing(false);
                setModalConfig({ visible: true, title: 'Success', message: 'Profile updated successfully', type: 'success' });
            }
        } catch (error: any) {
            // Handle specific field validation errors from backend
            if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
                const serverFieldErrors: Record<string, string> = {};
                error.response.data.errors.forEach((err: any) => {
                    if (err.path && err.msg) {
                        serverFieldErrors[err.path] = err.msg;
                    }
                });
                if (Object.keys(serverFieldErrors).length > 0) {
                    setFieldErrors(serverFieldErrors);
                    return;
                }
            }
            setModalConfig({ visible: true, title: 'Error', message: error?.response?.data?.message || 'Failed to update profile', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handlePickVisitingCard = async () => {
        try {
            const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });

            if (result.assets && result.assets[0]?.uri) {
                setUploadingCard(true);
                const uploadRes = await userService.uploadImage(result.assets[0].uri);
                if (uploadRes.success) { setVisitingCard(uploadRes.data.url); }
            }
        } catch (error) {
            setModalConfig({ visible: true, title: 'Error', message: 'Failed to upload visiting card', type: 'error' });
        } finally {
            setUploadingCard(false);
        }
    };

    const handleLogout = async () => { dispatch(logoutUser()); };

    // T-PIN state
    const [hasTpin, setHasTpin] = useState(false);
    const [showTpinProfileModal, setShowTpinProfileModal] = useState(false);
    const [tpinProfileMode, setTpinProfileMode] = useState<'generate' | 'confirm' | 'change'>('generate');
    const [tpinInput, setTpinInput] = useState('');
    const [tpinConfirm, setTpinConfirm] = useState('');
    const [tpinCurrentInput, setTpinCurrentInput] = useState('');
    const [tpinError, setTpinError] = useState('');
    const [tpinLoading, setTpinLoading] = useState(false);

    useEffect(() => {
        tpinService.getStatus().then((res: any) => {
            setHasTpin(res.data.hasTpin);
        }).catch(() => { });
    }, []);

    const openTpinModal = (mode: 'generate' | 'change') => {
        setTpinProfileMode(mode);
        setTpinInput(''); setTpinConfirm(''); setTpinCurrentInput(''); setTpinError('');
        setShowTpinProfileModal(true);
    };

    const handleTpinProfileAction = async () => {
        if (tpinProfileMode === 'generate') {
            if (tpinInput.length !== 4) { setTpinError('T-PIN must be 4 digits'); return; }
            setTpinProfileMode('confirm'); setTpinConfirm(''); setTpinError(''); return;
        }
        if (tpinProfileMode === 'confirm') {
            if (tpinConfirm !== tpinInput) { setTpinError('T-PINs do not match'); return; }
            try {
                setTpinLoading(true);
                await tpinService.generate(tpinInput);
                setHasTpin(true); setShowTpinProfileModal(false);
                setModalConfig({ visible: true, title: 'Success', message: 'T-PIN created successfully!', type: 'success' });
            } catch (error: any) {
                setTpinError(error.response?.data?.message || 'Failed to create T-PIN');
            } finally { setTpinLoading(false); }
            return;
        }
        // Change mode
        if (tpinCurrentInput.length !== 4) { setTpinError('Current T-PIN must be 4 digits'); return; }
        if (tpinInput.length !== 4) { setTpinError('New T-PIN must be 4 digits'); return; }
        try {
            setTpinLoading(true);
            await tpinService.update(tpinCurrentInput, tpinInput);
            setShowTpinProfileModal(false);
            setModalConfig({ visible: true, title: 'Success', message: 'T-PIN updated successfully!', type: 'success' });
        } catch (error: any) {
            setTpinError(error.response?.data?.message || 'Failed to update T-PIN');
        } finally { setTpinLoading(false); }
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <LinearGradient colors={[NAVY, NAVY_MID, '#09101d']} style={styles.background} />
                <ActivityIndicator size="large" color={GOLD} />
                <Text style={{ marginTop: 12, color: TEXT_MUTED, fontSize: 13, fontWeight: '600' }}>Loading profile...</Text>
            </View>
        );
    }


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


            <ScreenHeader
                showBack
                title="Profile"
                rightElement={
                    editing ? (
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                                <Text style={styles.cancelButtonText}>CANCEL</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
                                {saving ? <ActivityIndicator size="small" color={NAVY} /> : <Text style={styles.saveButtonText}>SAVE</Text>}
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity style={styles.editButton} onPress={() => setEditing(true)}>
                            <Text style={styles.editButtonText}>EDIT</Text>
                        </TouchableOpacity>
                    )
                }
            />

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={100}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    {/* Profile Card */}
                    <View style={styles.profileCard}>
                        <View style={styles.avatarContainer}>
                            <View style={styles.avatarBorder}>
                                <Image
                                    source={{ uri: user?.avatar ? getImageUrl(user.avatar) : 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y' }}
                                    style={styles.avatar}
                                />
                            </View>
                            <View style={styles.verifiedBadge}><Icon name="verified" size={14} color={NAVY} /></View>
                        </View>
                        <View style={styles.profileInfo}>
                            <Text style={styles.profileName}>{user?.fullName || 'Partner Name'}</Text>
                            <Text style={styles.profileRole}>WHOLESALE PARTNER</Text>
                            <Text style={styles.profileCompany}>{user?.companyName || 'Valued Business'}</Text>
                        </View>
                    </View>


                    {/* Personal Info */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}><Icon name="person" size={20} color={GOLD} /><Text style={styles.sectionTitle}>PERSONAL INFO</Text></View>
                        <View style={styles.detailsList}>
                            <FieldItem label="FULL NAME" value={fullName} icon="badge" editing={editing} onChangeText={setFullName} error={fieldErrors.fullName} />
                            <FieldItem label="COMPANY NAME" value={companyName} icon="business" editing={editing} onChangeText={setCompanyName} error={fieldErrors.companyName} />
                            <FieldItem label="EMAIL" value={user?.email || ''} icon="mail-outline" editing={false} readOnly />
                            <FieldItem label="CONTACT NUMBER" value={phone} icon="call" editing={editing} onChangeText={setPhone} keyboardType="phone-pad" error={fieldErrors.phone} />
                            <FieldItem label="WHATSAPP NUMBER" value={whatsappNumber} icon="chat" editing={editing} onChangeText={setWhatsappNumber} keyboardType="phone-pad" error={fieldErrors.whatsappNumber} />
                        </View>
                    </View>
                    <TouchableOpacity style={styles.actionBtnPrimary} onPress={() => navigation.navigate('orders' as any)}>
                        <Icon name="history" size={20} color={NAVY} />
                        <Text style={styles.actionBtnPrimaryText}>View Order History</Text>
                    </TouchableOpacity>

                    {/* Business Details */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}><Icon name="apartment" size={20} color={GOLD} /><Text style={styles.sectionTitle}>BUSINESS DETAILS</Text></View>
                        <View style={styles.detailsList}>
                            <FieldItem label="ADDRESS" value={address} icon="location-on" editing={editing} onChangeText={setAddress} multiline error={fieldErrors.address} />
                            <FieldItem label="PAN NUMBER" value={panNumber} icon="credit-card" editing={editing} onChangeText={setPanNumber} autoCapitalize="characters" error={fieldErrors.panNumber} />
                            <FieldItem label="GST NUMBER" value={gstNumber} icon="receipt-long" editing={editing} onChangeText={setGstNumber} autoCapitalize="characters" error={fieldErrors.gstNumber} />
                        </View>
                    </View>

                    {/* Visiting Card */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}><Icon name="contact-mail" size={20} color={GOLD} /><Text style={styles.sectionTitle}>VISITING CARD</Text></View>
                        {visitingCard ? (
                            <View style={styles.cardPreview}>
                                <Image source={{ uri: getImageUrl(visitingCard) }} style={styles.visitingCardImage} resizeMode="cover" />
                                {editing && (
                                    <View style={styles.cardActions}>
                                        <TouchableOpacity style={styles.changeCardBtn} onPress={handlePickVisitingCard} disabled={uploadingCard}>
                                            <Icon name="swap-horiz" size={16} color={GOLD} /><Text style={styles.changeCardText}>CHANGE</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.removeCardBtn} onPress={() => setVisitingCard(null)}>
                                            <Icon name="close" size={16} color="#fb7185" /><Text style={[styles.changeCardText, { color: '#fb7185' }]}>REMOVE</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        ) : (
                            <TouchableOpacity style={styles.uploadCard} onPress={editing ? handlePickVisitingCard : undefined} disabled={!editing || uploadingCard}>
                                {uploadingCard ? <ActivityIndicator size="large" color={GOLD} /> : (
                                    <>
                                        <Icon name="add-a-photo" size={40} color={editing ? GOLD : NAVY_BORDER} />
                                        <Text style={[styles.uploadCardText, !editing && { color: TEXT_MUTED }]}>{editing ? 'TAP TO UPLOAD VISITING CARD' : 'NO VISITING CARD'}</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* T-PIN Security */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}><Icon name="lock" size={20} color={GOLD} /><Text style={styles.sectionTitle}>T-PIN SECURITY</Text></View>
                        <View style={styles.detailItem}>
                            <View style={styles.detailTextContainer}>
                                <Text style={styles.detailLabel}>STATUS</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: hasTpin ? SUCCESS_COLOR : ERROR_COLOR }} />
                                    <Text style={styles.detailValue}>{hasTpin ? 'Active' : 'Not Set'}</Text>
                                </View>
                            </View>
                            <TouchableOpacity style={styles.detailIconContainer} onPress={() => openTpinModal(hasTpin ? 'change' : 'generate')}>
                                <Icon name={hasTpin ? 'edit' : 'add'} size={20} color={GOLD} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Account Actions */}
                    <View style={[styles.section, { gap: 16 }]}>
                        <TouchableOpacity style={styles.actionBtn} onPress={handleLogout}>
                            <Icon name="logout" size={20} color="#fb7185" />
                            <Text style={styles.logoutText}>Logout from Dashboard</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.footerInfo}>
                        <Text style={styles.memberSince}>MEMBER SINCE {new Date(user?.createdAt).getFullYear() || '2024'}</Text>
                        <Text style={styles.versionText}>SV GOLD B2B · v1.2.0</Text>
                    </View>

                </ScrollView>
            </KeyboardAvoidingView>

            <BottomNav activeTab="Account" />

            {/* T-PIN MODAL */}
            <RNModal visible={showTpinProfileModal} transparent animationType="fade">
                <View style={tStyles.overlay}>
                    <View style={tStyles.card}>
                        <TouchableOpacity style={tStyles.closeBtn} onPress={() => setShowTpinProfileModal(false)}><Icon name="close" size={24} color={TEXT_MUTED} /></TouchableOpacity>
                        <LinearGradient colors={[GOLD_DARK, GOLD, GOLD_LIGHT]} style={tStyles.iconRing}><Icon name="vpn-key" size={28} color={NAVY} /></LinearGradient>
                        <Text style={tStyles.title}>{tpinProfileMode === 'confirm' ? 'Confirm T-PIN' : tpinProfileMode === 'change' ? 'Update T-PIN' : 'Create T-PIN'}</Text>
                        <Text style={tStyles.subtitle}>{tpinProfileMode === 'confirm' ? 'Please re-enter to confirm' : 'Set a 4-digit PIN for order security'}</Text>

                        {tpinProfileMode === 'change' && (
                            <TextInput
                                style={tStyles.pinInput}
                                value={tpinCurrentInput}
                                onChangeText={(t) => { setTpinCurrentInput(t.replace(/[^0-9]/g, '').slice(0, 4)); setTpinError(''); }}
                                placeholder="Current PIN"
                                placeholderTextColor={TEXT_MUTED}
                                keyboardType="number-pad" maxLength={4} secureTextEntry textAlign="center"
                            />
                        )}
                        <TextInput
                            style={tStyles.pinInput}
                            value={tpinProfileMode === 'confirm' ? tpinConfirm : tpinInput}
                            onChangeText={(t) => {
                                if (tpinProfileMode === 'confirm') {
                                    setTpinConfirm(t.replace(/[^0-9]/g, '').slice(0, 4));
                                } else {
                                    setTpinInput(t.replace(/[^0-9]/g, '').slice(0, 4));
                                }
                                setTpinError('');
                            }}
                            placeholder={tpinProfileMode === 'confirm' ? "Confirm PIN" : "Enter 4-digit PIN"}
                            placeholderTextColor={TEXT_MUTED}
                            keyboardType="number-pad" maxLength={4} secureTextEntry textAlign="center" autoFocus
                        />

                        {tpinError ? <Text style={tStyles.error}>{tpinError}</Text> : null}

                        <TouchableOpacity style={tStyles.submitBtn} onPress={handleTpinProfileAction} disabled={tpinLoading}>
                            <LinearGradient colors={[GOLD_DARK, GOLD, GOLD_LIGHT]} style={tStyles.btnGradient}>
                                {tpinLoading ? <ActivityIndicator color={NAVY} /> : <Text style={tStyles.btnText}>{tpinProfileMode === 'generate' ? 'Next' : 'Secure Account'}</Text>}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </RNModal>
        </View>
    );
}

// Reusable field component
function FieldItem({ label, value, icon, editing, onChangeText, readOnly, keyboardType, multiline, autoCapitalize, error }: any) {
    return (
        <View style={styles.detailItemContainer}>
            <View style={[styles.detailItem, error ? { borderColor: ERROR_COLOR } : null]}>
                <View style={styles.detailTextContainer}>
                    <Text style={styles.detailLabel}>{label}</Text>
                    {editing && !readOnly ? (
                        <TextInput style={[styles.detailInput, multiline && { minHeight: 60 }]} value={value} onChangeText={onChangeText} keyboardType={keyboardType} placeholder={`Enter ${label}`} placeholderTextColor={TEXT_MUTED} multiline={multiline} autoCapitalize={autoCapitalize} />
                    ) : (
                        <Text style={styles.detailValue}>{value || 'Not Provided'}</Text>
                    )}
                </View>
                <View style={styles.detailIconContainer}><Icon name={icon} size={20} color={GOLD} /></View>
            </View>
            {error ? (
                <View style={styles.inlineError}>
                    <Icon name="error-outline" size={12} color={ERROR_COLOR} />
                    <Text style={styles.inlineErrorText}>{error}</Text>
                </View>
            ) : null}
        </View>
    );
}

const SUCCESS_COLOR = '#34D399';
const ERROR_COLOR = '#F87171';

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: NAVY },
    background: { ...StyleSheet.absoluteFillObject },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 140, paddingTop: 16 },
    editButton: { height: 44, paddingHorizontal: 16, justifyContent: 'center' },
    editButtonText: { fontSize: 11, fontWeight: '900', color: GOLD, letterSpacing: 1 },
    saveButton: { height: 36, paddingHorizontal: 16, backgroundColor: GOLD, borderRadius: 12, justifyContent: 'center' },
    saveButtonText: { fontSize: 11, fontWeight: '900', color: NAVY },
    cancelButton: { height: 36, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: NAVY_BORDER, justifyContent: 'center' },
    cancelButtonText: { fontSize: 10, fontWeight: '800', color: TEXT_MUTED },

    profileCard: { backgroundColor: NAVY_CARD, borderRadius: 32, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: NAVY_BORDER, marginBottom: 32, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.3, shadowRadius: 32, elevation: 10 },
    avatarContainer: { position: 'relative', marginBottom: 20 },
    avatarBorder: { padding: 4, borderRadius: 64, borderWidth: 2, borderColor: GOLD },
    avatar: { width: 110, height: 110, borderRadius: 55, backgroundColor: NAVY_INPUT },
    verifiedBadge: { position: 'absolute', bottom: 4, right: 4, backgroundColor: GOLD, padding: 6, borderRadius: 16, borderWidth: 3, borderColor: NAVY_CARD },
    profileInfo: { alignItems: 'center', gap: 6 },
    profileName: { fontSize: 24, fontWeight: '800', color: TEXT_PRIMARY },
    profileRole: { fontSize: 10, fontWeight: '900', color: GOLD, letterSpacing: 2 },
    profileCompany: { fontSize: 15, fontWeight: '600', color: TEXT_MUTED },

    section: { marginBottom: 16 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    sectionTitle: { fontSize: 10, fontWeight: '900', color: GOLD, letterSpacing: 2 },
    detailsList: { gap: 12 },
    detailItemContainer: { gap: 6 },
    detailItem: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 24, backgroundColor: NAVY_CARD, borderWidth: 1, borderColor: NAVY_BORDER },
    detailTextContainer: { flex: 1 },
    detailLabel: { fontSize: 9, fontWeight: '900', color: TEXT_MUTED, letterSpacing: 1.5, marginBottom: 4 },
    inlineError: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 12 },
    inlineErrorText: { color: ERROR_COLOR, fontSize: 11, fontWeight: '600' },
    detailValue: { fontSize: 14, fontWeight: '700', color: TEXT_PRIMARY },
    detailInput: { fontSize: 14, fontWeight: '700', color: TEXT_PRIMARY, padding: 0 },
    detailIconContainer: { width: 44, height: 44, borderRadius: 22, backgroundColor: NAVY_INPUT, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: NAVY_BORDER },

    uploadCard: { height: 160, borderRadius: 24, backgroundColor: NAVY_CARD, borderWidth: 2, borderColor: NAVY_BORDER, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', gap: 12 },
    uploadCardText: { fontSize: 10, fontWeight: '900', color: GOLD },
    cardPreview: { borderRadius: 24, backgroundColor: NAVY_CARD, overflow: 'hidden', borderWidth: 1, borderColor: NAVY_BORDER },
    visitingCardImage: { width: '100%', height: 200 },
    cardActions: { flexDirection: 'row', padding: 12, gap: 12, backgroundColor: 'rgba(0,0,0,0.3)' },
    changeCardBtn: { flex: 1, height: 40, borderRadius: 12, backgroundColor: NAVY_INPUT, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    removeCardBtn: { flex: 1, height: 40, borderRadius: 12, backgroundColor: 'rgba(251,113,133,0.1)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: 'rgba(251,113,133,0.2)' },
    changeCardText: { fontSize: 11, fontWeight: '900', color: GOLD },

    actionBtnPrimary: { marginBottom: 16, height: 56, borderRadius: 16, backgroundColor: GOLD, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 12 },
    actionBtnPrimaryText: { fontSize: 14, fontWeight: '800', color: NAVY },
    actionBtn: { height: 56, borderRadius: 16, backgroundColor: 'rgba(251,113,133,0.05)', borderWidth: 1, borderColor: 'rgba(251,113,133,0.15)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 12 },
    logoutText: { fontSize: 14, fontWeight: '700', color: '#fb7185' },
    footerInfo: { alignItems: 'center', gap: 8 },
    memberSince: { fontSize: 10, fontWeight: '900', color: TEXT_MUTED, letterSpacing: 2 },
    versionText: { fontSize: 9, fontWeight: '600', color: TEXT_MUTED, opacity: 0.5 },
});

const tStyles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 24 },
    card: { backgroundColor: NAVY_CARD, borderRadius: 32, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: NAVY_BORDER },
    closeBtn: { position: 'absolute', right: 20, top: 20 },
    iconRing: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    title: { fontSize: 20, fontWeight: '800', color: GOLD, marginBottom: 8 },
    subtitle: { fontSize: 13, color: TEXT_MUTED, textAlign: 'center', marginBottom: 24 },
    pinInput: { width: '100%', height: 56, backgroundColor: NAVY_INPUT, borderRadius: 16, color: TEXT_PRIMARY, fontSize: 18, fontWeight: '800', marginBottom: 16, borderWidth: 1, borderColor: NAVY_BORDER, paddingHorizontal: 16 },
    error: { color: ERROR_COLOR, fontSize: 12, fontWeight: '600', marginBottom: 16 },
    submitBtn: { width: '100%', height: 56, borderRadius: 16, overflow: 'hidden', marginTop: 8 },
    btnGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    btnText: { color: NAVY, fontSize: 15, fontWeight: '900' },
});
