import React, { useState, useRef } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert,
    ActivityIndicator,
    Animated,
} from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import { StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon, { IconName } from '../components/Icon';
import { authService } from '../services/authService';
import MessageModal from '../components/MessageModal';

// Design tokens — same palette as Login
const GOLD = '#C9A84C';
const GOLD_LIGHT = '#E8C97A';
const NAVY = '#0B1220';
const NAVY_CARD = '#162040';
const NAVY_INPUT = '#1C2A4A';
const NAVY_BORDER = '#2A3F6A';
const TEXT_PRIMARY = '#F0EAD6';
const TEXT_MUTED = '#8899BB';
const ERROR_COLOR = '#F87171';
const SUCCESS_COLOR = '#34D399';

type FormData = {
    fullName: string;
    companyName: string;
    email: string;
    phone: string;
    taxId: string;
    password: string;
    repassword: string;
};

type FormErrors = Partial<Record<keyof FormData, string>>;

function validateForm(data: FormData): FormErrors {
    const errors: FormErrors = {};

    if (!data.fullName.trim()) {
        errors.fullName = 'Full name is required';
    } else if (data.fullName.trim().length < 2) {
        errors.fullName = 'Full name must be at least 2 characters';
    }

    if (!data.companyName.trim()) {
        errors.companyName = 'Company name is required';
    }

    if (!data.email.trim()) {
        errors.email = 'Business email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
        errors.email = 'Enter a valid email address';
    }

    if (!data.phone.trim()) {
        errors.phone = 'Phone number is required';
    } else if (!/^\+?[\d\s\-()]{7,15}$/.test(data.phone.trim())) {
        errors.phone = 'Enter a valid phone number';
    }

    if (!data.taxId.trim()) {
        errors.taxId = 'Tax ID / registration number is required';
    }

    if (!data.password) {
        errors.password = 'Password is required';
    } else if (data.password.length < 8) {
        errors.password = 'Password must be at least 8 characters';
    }

    if (!data.repassword) {
        errors.repassword = 'Please confirm your password';
    } else if (data.password !== data.repassword) {
        errors.repassword = 'Passwords do not match';
    }

    return errors;
}

// A single styled field row
type FieldProps = {
    label: string;
    placeholder: string;
    iconName: IconName;
    value: string;
    onChangeText: (v: string) => void;
    error?: string;
    keyboardType?: any;
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
    secureTextEntry?: boolean;
    rightElement?: React.ReactNode;
    badge?: string;
    returnKeyType?: any;
    onSubmitEditing?: () => void;
};

function Field({
    label, placeholder, iconName, value, onChangeText, error,
    keyboardType = 'default', autoCapitalize = 'words',
    secureTextEntry = false, rightElement, badge, returnKeyType, onSubmitEditing,
}: FieldProps) {
    return (
        <View style={fieldStyles.group}>
            <View style={fieldStyles.labelRow}>
                <Text style={fieldStyles.label}>{label}</Text>
                {badge && <Text style={fieldStyles.badge}>{badge}</Text>}
            </View>
            <View style={[fieldStyles.inputRow, error ? fieldStyles.inputRowError : null]}>
                <Icon name={iconName} size={19} color={error ? ERROR_COLOR : TEXT_MUTED} style={fieldStyles.icon} />
                <TextInput
                    style={fieldStyles.input}
                    placeholder={placeholder}
                    placeholderTextColor={TEXT_MUTED}
                    value={value}
                    onChangeText={onChangeText}
                    keyboardType={keyboardType}
                    autoCapitalize={autoCapitalize}
                    secureTextEntry={secureTextEntry}
                    returnKeyType={returnKeyType}
                    onSubmitEditing={onSubmitEditing}
                />
                {rightElement}
            </View>
            {error ? (
                <View style={fieldStyles.inlineError}>
                    <Icon name="error-outline" size={12} color={ERROR_COLOR} />
                    <Text style={fieldStyles.inlineErrorText}>{error}</Text>
                </View>
            ) : null}
        </View>
    );
}

const fieldStyles = StyleSheet.create({
    group: { gap: 6 },
    labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    label: { fontSize: 10, fontWeight: '800', color: TEXT_MUTED, letterSpacing: 1.5, textTransform: 'uppercase' },
    badge: { fontSize: 9, fontWeight: '800', color: GOLD, letterSpacing: 1, textTransform: 'uppercase', opacity: 0.9 },
    inputRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: NAVY_INPUT,
        borderRadius: 12, borderWidth: 1, borderColor: NAVY_BORDER, height: 52,
    },
    inputRowError: { borderColor: ERROR_COLOR },
    icon: { marginLeft: 14, marginRight: 4 },
    input: { flex: 1, height: '100%', paddingHorizontal: 10, fontSize: 14, fontWeight: '500', color: TEXT_PRIMARY },
    inlineError: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingLeft: 2 },
    inlineErrorText: { color: ERROR_COLOR, fontSize: 12, fontWeight: '600', flex: 1 },
});

export default function RegisterScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<FormErrors>({});
    const [serverError, setServerError] = useState('');

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

    const shakeAnim = useRef(new Animated.Value(0)).current;

    const [formData, setFormData] = useState<FormData>({
        fullName: '',
        companyName: '',
        email: '',
        phone: '',
        taxId: '',
        password: '',
        repassword: '',
    });

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

    const handleChange = (key: keyof FormData, value: string) => {
        setFormData(prev => ({ ...prev, [key]: value }));
        // Clear error on change
        if (errors[key]) {
            setErrors(prev => ({ ...prev, [key]: undefined }));
        }
        if (serverError) { setServerError(''); }
    };

    const handleRegister = async () => {
        setServerError('');
        const validationErrors = validateForm(formData);
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            triggerShake();
            return;
        }
        setErrors({});
        setLoading(true);
        try {
            const response = await authService.register({
                fullName: formData.fullName,
                email: formData.email,
                password: formData.password,
                companyName: formData.companyName,
                phone: formData.phone,
                taxId: formData.taxId,
            });
            setLoading(false);
            setModalConfig({
                visible: true,
                title: '✅ Registration Submitted',
                message: response.message || 'Your account has been created and is pending admin approval. You will be notified once approved.',
                type: 'success',
                onClose: () => navigation.reset({ index: 0, routes: [{ name: 'index' }] })
            });
        } catch (error: any) {
            setLoading(false);

            // Handle specific field validation errors from backend
            if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
                const serverFieldErrors: FormErrors = {};
                error.response.data.errors.forEach((err: any) => {
                    if (err.path && err.msg) {
                        serverFieldErrors[err.path as keyof FormData] = err.msg;
                    }
                });
                if (Object.keys(serverFieldErrors).length > 0) {
                    setErrors(serverFieldErrors);
                    triggerShake();
                    return;
                }
            }

            const message = error.response?.data?.message || 'Registration failed. Please try again.';
            setServerError(message);
            triggerShake();
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={NAVY} />

            <LinearGradient
                colors={[NAVY, '#0D1628', '#111D35']}
                locations={[0, 0.5, 1]}
                style={styles.background}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />
            <View style={styles.goldTopLine} />

            <MessageModal
                visible={modalConfig.visible}
                title={modalConfig.title}
                message={modalConfig.message}
                type={modalConfig.type}
                onClose={() => {
                    setModalConfig(prev => ({ ...prev, visible: false }));
                    if (modalConfig.onClose) modalConfig.onClose();
                }}
                buttonText={modalConfig.type === 'success' ? 'Return to Login' : 'OK'}
            />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Icon name="arrow-back-ios" size={18} color={GOLD} style={{ marginLeft: 5 }} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Icon name="diamond" size={16} color={GOLD} />
                    <Text style={styles.headerTitle}>Partner Registration</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Intro */}
                    <View style={styles.introSection}>
                        <Text style={styles.mainTitle}>Create Your{'\n'}Wholesale Account</Text>
                        <Text style={styles.subTitle}>
                            Apply for exclusive access to SV Gold's wholesale jewelry catalog. All applications are reviewed by our team.
                        </Text>
                    </View>

                    {/* Steps indicator */}
                    <View style={styles.stepsRow}>
                        {['Account Info', 'Business', 'Security'].map((step, i) => (
                            <View key={i} style={styles.stepItem}>
                                <View style={[styles.stepDot, i === 0 ? styles.stepDotActive : null]}>
                                    <Text style={[styles.stepNum, i === 0 ? styles.stepNumActive : null]}>{i + 1}</Text>
                                </View>
                                <Text style={[styles.stepLabel, i === 0 ? styles.stepLabelActive : null]}>{step}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Form card */}
                    <Animated.View style={[styles.card, { transform: [{ translateX: shakeAnim }] }]}>

                        {/* Server error banner */}
                        {serverError ? (
                            <View style={styles.errorBanner}>
                                <Icon name="error-outline" size={16} color={ERROR_COLOR} />
                                <Text style={styles.errorBannerText}>{serverError}</Text>
                            </View>
                        ) : null}

                        {/* Section: Personal */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Icon name="person" size={15} color={GOLD} />
                                <Text style={styles.sectionTitle}>Account Information</Text>
                            </View>
                            <View style={styles.fieldList}>
                                <Field
                                    label="Full Name"
                                    placeholder="John Doe"
                                    iconName="person"
                                    value={formData.fullName}
                                    onChangeText={(v) => handleChange('fullName', v)}
                                    error={errors.fullName}
                                    returnKeyType="next"
                                />
                                <Field
                                    label="Business Email"
                                    placeholder="contact@company.com"
                                    iconName="alternate-email"
                                    value={formData.email}
                                    onChangeText={(v) => handleChange('email', v)}
                                    error={errors.email}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    returnKeyType="next"
                                />
                                <Field
                                    label="Phone Number"
                                    placeholder="+1 (555) 000-0000"
                                    iconName="smartphone"
                                    value={formData.phone}
                                    onChangeText={(v) => handleChange('phone', v)}
                                    error={errors.phone}
                                    keyboardType="phone-pad"
                                    autoCapitalize="none"
                                    returnKeyType="next"
                                />
                            </View>
                        </View>

                        <View style={styles.sectionDivider} />

                        {/* Section: Business */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Icon name="storefront" size={15} color={GOLD} />
                                <Text style={styles.sectionTitle}>Business Details</Text>
                            </View>
                            <View style={styles.fieldList}>
                                <Field
                                    label="Company Name"
                                    placeholder="Jewelry Co. Ltd."
                                    iconName="storefront"
                                    value={formData.companyName}
                                    onChangeText={(v) => handleChange('companyName', v)}
                                    error={errors.companyName}
                                    returnKeyType="next"
                                />
                                <Field
                                    label="Tax ID / EIN"
                                    placeholder="Registration / Tax Number"
                                    iconName="verified-user"
                                    value={formData.taxId}
                                    onChangeText={(v) => handleChange('taxId', v)}
                                    error={errors.taxId}
                                    autoCapitalize="characters"
                                    badge="REQUIRED"
                                    returnKeyType="next"
                                />
                            </View>
                        </View>

                        <View style={styles.sectionDivider} />

                        {/* Section: Security */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Icon name="lock" size={15} color={GOLD} />
                                <Text style={styles.sectionTitle}>Security</Text>
                            </View>
                            <View style={styles.fieldList}>
                                <Field
                                    label="Password"
                                    placeholder="Minimum 8 characters"
                                    iconName="lock"
                                    value={formData.password}
                                    onChangeText={(v) => handleChange('password', v)}
                                    error={errors.password}
                                    secureTextEntry={!showPassword}
                                    autoCapitalize="none"
                                    returnKeyType="next"
                                    rightElement={
                                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                                            <Icon name={showPassword ? 'visibility' : 'visibility-off'} size={20} color={TEXT_MUTED} />
                                        </TouchableOpacity>
                                    }
                                />

                                {/* Password strength indicator */}
                                {formData.password.length > 0 && (
                                    <View style={styles.strengthRow}>
                                        {[1, 2, 3, 4].map((level) => {
                                            const strength = formData.password.length >= 12 ? 4
                                                : formData.password.length >= 10 ? 3
                                                    : formData.password.length >= 8 ? 2
                                                        : 1;
                                            const active = level <= strength;
                                            const color = strength === 1 ? ERROR_COLOR : strength === 2 ? GOLD : strength === 3 ? GOLD_LIGHT : SUCCESS_COLOR;
                                            return <View key={level} style={[styles.strengthBar, active ? { backgroundColor: color } : null]} />;
                                        })}
                                        <Text style={styles.strengthLabel}>
                                            {formData.password.length >= 12 ? 'Strong'
                                                : formData.password.length >= 10 ? 'Good'
                                                    : formData.password.length >= 8 ? 'Fair' : 'Weak'}
                                        </Text>
                                    </View>
                                )}

                                <Field
                                    label="Confirm Password"
                                    placeholder="Re-enter your password"
                                    iconName="lock"
                                    value={formData.repassword}
                                    onChangeText={(v) => handleChange('repassword', v)}
                                    error={errors.repassword}
                                    secureTextEntry={!showConfirmPassword}
                                    autoCapitalize="none"
                                    returnKeyType="done"
                                    onSubmitEditing={handleRegister}
                                    rightElement={
                                        <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeBtn}>
                                            <Icon name={showConfirmPassword ? 'visibility' : 'visibility-off'} size={20} color={TEXT_MUTED} />
                                        </TouchableOpacity>
                                    }
                                />
                            </View>
                        </View>

                        {/* Notice */}
                        <View style={styles.notice}>
                            <Icon name="info-outline" size={14} color={GOLD} />
                            <Text style={styles.noticeText}>
                                After submitting, your application will be reviewed by our team. You'll receive an email once your account is approved.
                            </Text>
                        </View>

                        {/* Submit Button */}
                        <TouchableOpacity onPress={handleRegister} disabled={loading} activeOpacity={0.85}>
                            <LinearGradient
                                colors={[GOLD, GOLD_LIGHT, GOLD]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.submitBtn}
                            >
                                {loading ? (
                                    <ActivityIndicator color={NAVY} />
                                ) : (
                                    <>
                                        <Icon name="verified-user" size={20} color={NAVY} />
                                        <Text style={styles.submitBtnText}>Create Business Account</Text>
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

                    </Animated.View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Already a partner? </Text>
                        <TouchableOpacity onPress={() => navigation.reset({ index: 0, routes: [{ name: 'index' }] })}>
                            <Text style={styles.footerLink}>Sign In</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.bottomBar} />
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: NAVY },
    background: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
    goldTopLine: { height: 3, backgroundColor: GOLD, width: '100%' },

    // Header
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingBottom: 12,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 20,
        borderWidth: 1, borderColor: NAVY_BORDER,
        backgroundColor: NAVY_CARD,
        justifyContent: 'center', alignItems: 'center',
    },
    headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerTitle: { fontSize: 14, fontWeight: '700', color: TEXT_PRIMARY, letterSpacing: 0.5 },

    // Scroll
    scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 48 },

    // Intro
    introSection: { marginBottom: 24 },
    mainTitle: { fontSize: 28, fontWeight: '800', color: TEXT_PRIMARY, letterSpacing: -0.5, lineHeight: 36, marginBottom: 10 },
    subTitle: { fontSize: 13, color: TEXT_MUTED, lineHeight: 20, fontWeight: '500' },

    // Steps
    stepsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, paddingHorizontal: 8 },
    stepItem: { alignItems: 'center', gap: 6 },
    stepDot: {
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: NAVY_CARD, borderWidth: 1.5, borderColor: NAVY_BORDER,
        justifyContent: 'center', alignItems: 'center',
    },
    stepDotActive: { borderColor: GOLD, backgroundColor: 'rgba(201,168,76,0.15)' },
    stepNum: { fontSize: 11, fontWeight: '700', color: TEXT_MUTED },
    stepNumActive: { color: GOLD },
    stepLabel: { fontSize: 10, fontWeight: '600', color: TEXT_MUTED, letterSpacing: 0.5 },
    stepLabelActive: { color: GOLD },

    // Card
    card: {
        backgroundColor: NAVY_CARD,
        borderRadius: 20, borderWidth: 1, borderColor: NAVY_BORDER,
        padding: 24, gap: 0,
        shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.35, shadowRadius: 24, elevation: 10,
    },

    // Error banner
    errorBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: 'rgba(248,113,113,0.1)',
        borderWidth: 1, borderColor: 'rgba(248,113,113,0.3)',
        borderRadius: 10, padding: 12, marginBottom: 20,
    },
    errorBannerText: { color: ERROR_COLOR, fontSize: 13, fontWeight: '600', flex: 1 },

    // Sections
    section: { gap: 16 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    sectionTitle: { fontSize: 12, fontWeight: '800', color: GOLD, letterSpacing: 1, textTransform: 'uppercase' },
    fieldList: { gap: 14 },
    sectionDivider: { height: 1, backgroundColor: NAVY_BORDER, marginVertical: 20, opacity: 0.5 },

    eyeBtn: { paddingHorizontal: 14, height: '100%', justifyContent: 'center' },

    // Password strength
    strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: -4 },
    strengthBar: { flex: 1, height: 3, borderRadius: 2, backgroundColor: NAVY_BORDER },
    strengthLabel: { fontSize: 10, fontWeight: '700', color: TEXT_MUTED, marginLeft: 4, minWidth: 36 },

    // Notice
    notice: {
        flexDirection: 'row', gap: 10, alignItems: 'flex-start',
        backgroundColor: 'rgba(201,168,76,0.07)',
        borderWidth: 1, borderColor: 'rgba(201,168,76,0.2)',
        borderRadius: 10, padding: 12, marginTop: 20, marginBottom: 20,
    },
    noticeText: { color: TEXT_MUTED, fontSize: 12, fontWeight: '500', lineHeight: 18, flex: 1 },

    // Submit
    submitBtn: {
        height: 54, borderRadius: 12,
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10,
        shadowColor: GOLD, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8,
    },
    submitBtnText: { color: NAVY, fontWeight: '800', fontSize: 15, letterSpacing: 0.5 },

    // Footer
    footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 28 },
    footerText: { color: TEXT_MUTED, fontSize: 13, fontWeight: '500' },
    footerLink: { color: GOLD, fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' },
    bottomBar: { height: 4, width: 80, backgroundColor: NAVY_BORDER, borderRadius: 2, alignSelf: 'center', marginTop: 40, opacity: 0.4 },
});
