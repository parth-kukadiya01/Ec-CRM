import React, { useState, useRef } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    ScrollView,
    Animated,
} from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import { StatusBar } from 'react-native';
import Icon from '../components/Icon';

import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loginUser, clearAuthError } from '../store/slices/authSlice';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { B2B } from '../constants/Colors';

const { GOLD, GOLD_LIGHT, GOLD_DARK, NAVY, NAVY_CARD, NAVY_BORDER, NAVY_INPUT, TEXT_PRIMARY, TEXT_MUTED, GOLD_DIM, GOLD_BORDER, NAVY_MID } = B2B;
const ERROR_COLOR = '#F87171';

type FieldErrors = {
    email?: string;
    password?: string;
};

function validate(email: string, password: string): FieldErrors {
    const errors: FieldErrors = {};
    if (!email.trim()) {
        errors.email = 'Email, phone, or user ID is required';
    }
    if (!password) {
        errors.password = 'Password is required';
    } else if (password.length < 6) {
        errors.password = 'Password must be at least 6 characters';
    }
    return errors;
}

export default function LoginScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<any>>();

    const dispatch = useAppDispatch();
    const { isAuthenticating, error } = useAppSelector((state) => state.auth);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberSession, setRememberSession] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [serverError, setServerError] = useState('');
    const [accountStatus, setAccountStatus] = useState<'pending' | 'rejected' | null>(null);

    const shakeAnim = useRef(new Animated.Value(0)).current;

    const triggerShake = () => {
        shakeAnim.setValue(0);
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
        ]).start();
    };

    React.useEffect(() => {
        if (error) {
            setAccountStatus(null);
            if (typeof error === 'object' && (error as any).errors) {
                const serverFieldErrors: FieldErrors = {};
                (error as any).errors.forEach((err: any) => {
                    if (err.path === 'email' || err.path === 'password') {
                        serverFieldErrors[err.path as keyof FieldErrors] = err.msg;
                    }
                });
                setFieldErrors(serverFieldErrors);
                if ((error as any).message) setServerError((error as any).message);
            } else {
                const msg = error as string;
                // Detect pending/rejected status and set special state
                if (msg.includes('under review') || msg.includes('wait for admin')) {
                    setAccountStatus('pending');
                } else if (msg.includes('rejected')) {
                    setAccountStatus('rejected');
                } else {
                    setServerError(msg);
                }
            }
            triggerShake();
            dispatch(clearAuthError());
        }
    }, [error]);

    const handleLogin = async () => {
        setServerError('');
        setAccountStatus(null);
        const errors = validate(email, password);
        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            triggerShake();
            return;
        }
        setFieldErrors({});
        dispatch(loginUser({ email, password }));
    };

    const handleFieldChange = (field: keyof FieldErrors, value: string) => {
        if (fieldErrors[field]) {
            setFieldErrors(prev => ({ ...prev, [field]: undefined }));
        }
        if (field === 'email') { setEmail(value); }
        else { setPassword(value); }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={NAVY} />

            <LinearGradient
                colors={[NAVY, NAVY_MID, '#09101d']}
                locations={[0, 0.5, 1]}
                style={styles.background}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            <View style={styles.goldTopLine} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.contentContainer}>

                        <View style={styles.brandSection}>
                            <View style={styles.logoRing}>
                                <LinearGradient
                                    colors={[GOLD_DARK, GOLD, GOLD_LIGHT]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.logoGradient}
                                >
                                    <Icon name="diamond" size={28} color={NAVY} />
                                </LinearGradient>
                            </View>
                            <Text style={styles.brandName}>SV GOLD</Text>
                            <Text style={styles.brandTagline}>WHOLESALE PARTNER PORTAL</Text>
                        </View>

                        <Animated.View style={[styles.card, { transform: [{ translateX: shakeAnim }] }]}>

                            <Text style={styles.cardTitle}>Welcome Back</Text>
                            <Text style={styles.cardSubtitle}>Sign in to your wholesale account</Text>

                            {/* Pending Approval Banner */}
                            {accountStatus === 'pending' ? (
                                <View style={styles.pendingBanner}>
                                    <Icon name="info" size={18} color="#F59E0B" />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.pendingBannerTitle}>Account Under Review</Text>
                                        <Text style={styles.pendingBannerText}>Your registration is pending admin approval. You will be notified once approved.</Text>
                                    </View>
                                </View>
                            ) : accountStatus === 'rejected' ? (
                                <View style={styles.rejectedBanner}>
                                    <Icon name="lock" size={18} color="#F87171" />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.pendingBannerTitle}>Account Rejected</Text>
                                        <Text style={styles.pendingBannerText}>{serverError || 'Your account was not approved. Please contact support.'}</Text>
                                    </View>
                                </View>
                            ) : serverError ? (
                                <View style={styles.errorBanner}>
                                    <Icon name="error-outline" size={16} color={ERROR_COLOR} />
                                    <Text style={styles.errorBannerText}>{serverError}</Text>
                                </View>
                            ) : null}

                            <View style={styles.form}>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>EMAIL / PHONE / USER ID</Text>
                                    <View style={[
                                        styles.inputRow,
                                        fieldErrors.email ? styles.inputRowError : null,
                                    ]}>
                                        <Icon name="person" size={20} color={fieldErrors.email ? ERROR_COLOR : GOLD} style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Enter your email or ID"
                                            placeholderTextColor={TEXT_MUTED}
                                            value={email}
                                            onChangeText={(v) => handleFieldChange('email', v)}
                                            autoCapitalize="none"
                                            keyboardType="email-address"
                                            returnKeyType="next"
                                        />
                                    </View>
                                    {fieldErrors.email ? (
                                        <View style={styles.inlineError}>
                                            <Icon name="error-outline" size={13} color={ERROR_COLOR} />
                                            <Text style={styles.inlineErrorText}>{fieldErrors.email}</Text>
                                        </View>
                                    ) : null}
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>PASSWORD</Text>
                                    <View style={[
                                        styles.inputRow,
                                        fieldErrors.password ? styles.inputRowError : null,
                                    ]}>
                                        <Icon name="lock" size={20} color={fieldErrors.password ? ERROR_COLOR : GOLD} style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Min 6 characters"
                                            placeholderTextColor={TEXT_MUTED}
                                            value={password}
                                            onChangeText={(v) => handleFieldChange('password', v)}
                                            secureTextEntry={!showPassword}
                                            returnKeyType="done"
                                            onSubmitEditing={handleLogin}
                                        />
                                        <TouchableOpacity
                                            onPress={() => setShowPassword(!showPassword)}
                                            style={styles.eyeBtn}
                                        >
                                            <Icon name={showPassword ? 'visibility' : 'visibility-off'} size={20} color={GOLD} />
                                        </TouchableOpacity>
                                    </View>
                                    {fieldErrors.password ? (
                                        <View style={styles.inlineError}>
                                            <Icon name="error-outline" size={13} color={ERROR_COLOR} />
                                            <Text style={styles.inlineErrorText}>{fieldErrors.password}</Text>
                                        </View>
                                    ) : null}
                                </View>

                                <View style={styles.optionsRow}>
                                    <TouchableOpacity
                                        style={styles.checkboxRow}
                                        onPress={() => setRememberSession(!rememberSession)}
                                    >
                                        <View style={[styles.checkbox, rememberSession && styles.checkboxChecked]}>
                                            {rememberSession && <Icon name="check" size={12} color={NAVY} />}
                                        </View>
                                        <Text style={styles.checkboxLabel}>Remember me</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity onPress={() => navigation.navigate('forgot-password' as any)}>
                                        <Text style={styles.forgotLink}>Forgot Password?</Text>
                                    </TouchableOpacity>
                                </View>

                                <TouchableOpacity
                                    onPress={handleLogin}
                                    disabled={isAuthenticating}
                                    activeOpacity={0.85}
                                >
                                    <LinearGradient
                                        colors={[GOLD_DARK, GOLD, GOLD_LIGHT]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.loginBtn}
                                    >
                                        {isAuthenticating ? (
                                            <ActivityIndicator color={NAVY} />
                                        ) : (
                                            <>
                                                <Text style={styles.loginBtnText}>Login to Dashboard</Text>
                                                <Icon name="arrow-forward" size={18} color={NAVY} style={{ marginLeft: 8 }} />
                                            </>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>

                            </View>

                            <View style={styles.cardFooter}>
                                <Text style={styles.footerText}>New wholesale partner? </Text>
                                <TouchableOpacity onPress={() => navigation.navigate('register' as any)}>
                                    <Text style={styles.footerLink}>Request Access</Text>
                                </TouchableOpacity>
                            </View>

                        </Animated.View>

                        <View style={styles.bottomInfo}>
                            <View style={styles.goldDividerRow}>
                                <View style={styles.goldLine} />
                                <Icon name="verified" size={12} color={GOLD} />
                                <View style={styles.goldLine} />
                            </View>
                            <Text style={styles.bottomInfoText}>SV GOLD WHOLESALE · v1.0.0</Text>
                            <View style={styles.bottomLinks}>
                                <TouchableOpacity><Text style={styles.bottomLink}>Privacy Policy</Text></TouchableOpacity>
                                <View style={styles.dot} />
                                <TouchableOpacity><Text style={styles.bottomLink}>Terms of Use</Text></TouchableOpacity>
                            </View>
                        </View>

                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: NAVY },
    background: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
    goldTopLine: { height: 3, backgroundColor: GOLD, width: '100%' },
    keyboardView: { flex: 1 },
    scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 32 },
    contentContainer: { width: '100%', maxWidth: 440, alignSelf: 'center' },

    brandSection: { alignItems: 'center', marginBottom: 32 },
    logoRing: {
        width: 72, height: 72, borderRadius: 36,
        borderWidth: 2, borderColor: GOLD,
        padding: 3, marginBottom: 16,
        shadowColor: GOLD, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 16,
    },
    logoGradient: { flex: 1, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
    brandName: { fontSize: 28, fontWeight: '800', color: GOLD, letterSpacing: 4 },
    brandTagline: { fontSize: 10, fontWeight: '700', color: TEXT_MUTED, letterSpacing: 2.5, marginTop: 4, textTransform: 'uppercase' },

    card: {
        backgroundColor: NAVY_CARD,
        borderRadius: 32,
        borderWidth: 1,
        borderColor: NAVY_BORDER,
        padding: 28,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.4, shadowRadius: 32,
        elevation: 12,
    },
    cardTitle: { fontSize: 22, fontWeight: '700', color: TEXT_PRIMARY, marginBottom: 4 },
    cardSubtitle: { fontSize: 13, color: TEXT_MUTED, fontWeight: '500', marginBottom: 24 },

    errorBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: 'rgba(248,113,113,0.12)',
        borderWidth: 1, borderColor: 'rgba(248,113,113,0.35)',
        borderRadius: 14, padding: 12, marginBottom: 16,
    },
    errorBannerText: { color: ERROR_COLOR, fontSize: 13, fontWeight: '600', flex: 1 },

    pendingBanner: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 10,
        backgroundColor: 'rgba(245,158,11,0.10)',
        borderWidth: 1, borderColor: 'rgba(245,158,11,0.35)',
        borderRadius: 14, padding: 14, marginBottom: 16,
    },
    rejectedBanner: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 10,
        backgroundColor: 'rgba(248,113,113,0.10)',
        borderWidth: 1, borderColor: 'rgba(248,113,113,0.35)',
        borderRadius: 14, padding: 14, marginBottom: 16,
    },
    pendingBannerTitle: { fontSize: 13, fontWeight: '800', color: TEXT_PRIMARY, marginBottom: 2 },
    pendingBannerText: { fontSize: 12, fontWeight: '500', color: TEXT_MUTED, lineHeight: 18 },

    form: { gap: 18 },
    inputGroup: { gap: 6 },
    label: { fontSize: 9, fontWeight: '900', color: TEXT_MUTED, letterSpacing: 1.5, textTransform: 'uppercase' },
    inputRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: NAVY_INPUT,
        borderRadius: 16, borderWidth: 1, borderColor: NAVY_BORDER, height: 56,
    },
    inputRowError: { borderColor: ERROR_COLOR },
    inputIcon: { marginLeft: 16, marginRight: 4 },
    input: { flex: 1, height: '100%', paddingHorizontal: 10, fontSize: 14, fontWeight: '500', color: TEXT_PRIMARY },
    eyeBtn: { paddingHorizontal: 16, height: '100%', justifyContent: 'center' },

    inlineError: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingLeft: 2 },
    inlineErrorText: { color: ERROR_COLOR, fontSize: 12, fontWeight: '600', flex: 1 },

    optionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    checkbox: {
        width: 20, height: 20, borderRadius: 6,
        borderWidth: 1.5, borderColor: NAVY_BORDER,
        justifyContent: 'center', alignItems: 'center',
        backgroundColor: NAVY_INPUT,
    },
    checkboxChecked: { backgroundColor: GOLD, borderColor: GOLD },
    checkboxLabel: { color: TEXT_MUTED, fontSize: 13, fontWeight: '600' },
    forgotLink: { color: GOLD, fontSize: 13, fontWeight: '700' },

    loginBtn: {
        height: 56, borderRadius: 16,
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
        marginTop: 4,
        shadowColor: GOLD, shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
    },
    loginBtnText: { color: NAVY, fontWeight: '900', fontSize: 15, letterSpacing: 0.5 },

    cardFooter: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24 },
    footerText: { color: TEXT_MUTED, fontSize: 13, fontWeight: '500' },
    footerLink: { color: GOLD, fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' },

    bottomInfo: { alignItems: 'center', marginTop: 32, gap: 10 },
    goldDividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, opacity: 0.4 },
    goldLine: { height: 1, width: 40, backgroundColor: GOLD },
    bottomInfoText: { color: TEXT_MUTED, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, opacity: 0.6 },
    bottomLinks: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    bottomLink: { color: TEXT_MUTED, fontSize: 11, fontWeight: '600', opacity: 0.7 },
    dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: TEXT_MUTED, opacity: 0.5 },
});
