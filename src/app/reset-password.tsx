import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    Alert,
    ActivityIndicator,
    ScrollView,
    StatusBar,
} from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from '../components/Icon';
import { B2B } from '../constants/Colors';
import { authService } from '../services/authService';
import MessageModal from '../components/MessageModal';

const { GOLD, GOLD_LIGHT, GOLD_DARK, NAVY, NAVY_CARD, NAVY_BORDER, NAVY_INPUT, TEXT_PRIMARY, TEXT_MUTED, NAVY_MID } = B2B;

export default function ResetPasswordScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    const route = useRoute();
    const { email } = (route.params as any) || {};

    const [otp, setOtp] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
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

    const handleReset = async () => {
        setFieldErrors({});
        if (!otp || !password || !confirmPassword) {
            setModalConfig({ visible: true, title: 'Error', message: 'Please fill in all fields', type: 'error' });
            return;
        }
        if (otp.length !== 6) {
            setModalConfig({ visible: true, title: 'Error', message: 'Please enter a valid 6-digit code', type: 'error' });
            return;
        }
        if (password !== confirmPassword) {
            setModalConfig({ visible: true, title: 'Error', message: 'Passwords do not match', type: 'error' });
            return;
        }
        if (password.length < 6) {
            setModalConfig({ visible: true, title: 'Error', message: 'Password must be at least 6 characters', type: 'error' });
            return;
        }

        setLoading(true);
        try {
            await authService.resetPassword(otp, password);
            setLoading(false);
            setModalConfig({
                visible: true,
                title: 'Success',
                message: 'Your password has been reset successfully. Please login with your new password.',
                type: 'success',
                onClose: () => navigation.reset({ index: 0, routes: [{ name: 'index' }] })
            });
        } catch (error: any) {
            setLoading(false);

            // Handle field validation errors
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

            const message = error.response?.data?.message || 'Failed to reset password';
            setModalConfig({ visible: true, title: 'Error', message: message, type: 'error' });
        }
    };

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
                buttonText={modalConfig.type === 'success' ? 'Login' : 'OK'}
            />

            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Icon name="arrow-back-ios" size={20} color={GOLD} style={{ marginLeft: 6 }} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>SET NEW CREDENTIALS</Text>
                <View style={{ width: 44 }} />
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.contentContainer}>
                        <View style={styles.iconWrapper}>
                            <Icon name="security" size={56} color={GOLD} />
                        </View>

                        <Text style={styles.title}>Finalize Reset</Text>
                        <Text style={styles.subtitle}>
                            Enter the 6-digit verification code sent to {email} and choose a strong new password.
                        </Text>

                        <View style={styles.panel}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>VERIFICATION CODE</Text>
                                <View style={styles.inputContainer}>
                                    <Icon name="vpn-key" size={20} color={GOLD} style={styles.inputIcon} />
                                    <TextInput
                                        style={[styles.input, { letterSpacing: 8, fontSize: 18, fontWeight: '800' }]}
                                        placeholder="000000"
                                        placeholderTextColor={TEXT_MUTED}
                                        keyboardType="number-pad"
                                        maxLength={6}
                                        value={otp}
                                        onChangeText={(v) => {
                                            setOtp(v);
                                            if (fieldErrors.otp) setFieldErrors(p => ({ ...p, otp: '' }));
                                        }}
                                    />
                                </View>
                                {fieldErrors.otp ? (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
                                        <Icon name="error-outline" size={12} color="#F87171" />
                                        <Text style={{ color: '#F87171', fontSize: 12, fontWeight: '600' }}>{fieldErrors.otp}</Text>
                                    </View>
                                ) : null}
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>NEW PASSWORD</Text>
                                <View style={styles.inputContainer}>
                                    <Icon name="lock" size={20} color={GOLD} style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Min. 6 characters"
                                        placeholderTextColor={TEXT_MUTED}
                                        secureTextEntry={!showPassword}
                                        value={password}
                                        onChangeText={(v) => {
                                            setPassword(v);
                                            if (fieldErrors.password) setFieldErrors(p => ({ ...p, password: '' }));
                                        }}
                                    />
                                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                                        <Icon name={showPassword ? "visibility-off" : "visibility"} size={20} color={GOLD} />
                                    </TouchableOpacity>
                                </View>
                                {fieldErrors.password ? (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
                                        <Icon name="error-outline" size={12} color="#F87171" />
                                        <Text style={{ color: '#F87171', fontSize: 12, fontWeight: '600' }}>{fieldErrors.password}</Text>
                                    </View>
                                ) : null}
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>CONFIRM PASSWORD</Text>
                                <View style={styles.inputContainer}>
                                    <Icon name="lock-outline" size={20} color={GOLD} style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Repeat new password"
                                        placeholderTextColor={TEXT_MUTED}
                                        secureTextEntry={!showPassword}
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                    />
                                </View>
                            </View>

                            <TouchableOpacity style={styles.resetButton} onPress={handleReset} disabled={loading}>
                                <LinearGradient colors={[GOLD_DARK, GOLD, GOLD_LIGHT]} style={styles.btnGradient}>
                                    {loading ? <ActivityIndicator color={NAVY} /> : <Text style={styles.resetButtonText}>UPDATE & LOG IN</Text>}
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: NAVY },
    background: { ...StyleSheet.absoluteFillObject },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 10 },
    backButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: NAVY_INPUT, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: NAVY_BORDER },
    headerTitle: { fontSize: 13, fontWeight: '900', color: TEXT_MUTED, letterSpacing: 1.5 },
    scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },
    contentContainer: { alignItems: 'center', width: '100%', maxWidth: 400, alignSelf: 'center' },
    iconWrapper: { width: 110, height: 110, borderRadius: 55, backgroundColor: NAVY_INPUT, justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: NAVY_BORDER, shadowColor: GOLD, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 16 },
    title: { fontSize: 28, fontWeight: '800', color: TEXT_PRIMARY, marginBottom: 8, textAlign: 'center' },
    subtitle: { fontSize: 14, fontWeight: '500', color: TEXT_MUTED, textAlign: 'center', marginBottom: 32, lineHeight: 22, paddingHorizontal: 20 },
    panel: { width: '100%', borderRadius: 32, padding: 24, backgroundColor: NAVY_CARD, borderWidth: 1, borderColor: NAVY_BORDER, gap: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 10 },
    inputGroup: { gap: 10 },
    label: { fontSize: 10, fontWeight: '900', color: GOLD, paddingHorizontal: 4, letterSpacing: 1.5 },
    inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: NAVY_INPUT, borderRadius: 16, height: 60, borderWidth: 1, borderColor: NAVY_BORDER },
    inputIcon: { marginLeft: 16 },
    input: { flex: 1, height: '100%', paddingLeft: 12, paddingRight: 16, fontSize: 15, fontWeight: '600', color: TEXT_PRIMARY },
    eyeIcon: { paddingRight: 16 },
    resetButton: { height: 60, borderRadius: 16, overflow: 'hidden', shadowColor: GOLD, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8, marginTop: 12 },
    btnGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    resetButtonText: { color: NAVY, fontWeight: '900', fontSize: 14, letterSpacing: 1 },
});
