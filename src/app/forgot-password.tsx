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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from '../components/Icon';
import { B2B } from '../constants/Colors';
import { authService } from '../services/authService';
import MessageModal from '../components/MessageModal';

const { GOLD, GOLD_LIGHT, GOLD_DARK, NAVY, NAVY_CARD, NAVY_BORDER, NAVY_INPUT, TEXT_PRIMARY, TEXT_MUTED, NAVY_MID } = B2B;

export default function ForgotPasswordScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [fieldError, setFieldError] = useState('');

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

    const handleSendCode = async () => {
        setFieldError('');
        if (!email) {
            setFieldError('Please enter your email address');
            return;
        }

        setLoading(true);
        try {
            await authService.forgotPassword(email);
            setLoading(false);
            setModalConfig({
                visible: true,
                title: 'Code Sent',
                message: `A 6-digit verification code has been sent to ${email}`,
                type: 'success',
                onClose: () => navigation.navigate('reset-password' as any, { email })
            });
        } catch (error: any) {
            setLoading(false);

            // Handle specific field validation errors from backend
            if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
                const emailErr = error.response.data.errors.find((err: any) => err.path === 'email');
                if (emailErr) {
                    setFieldError(emailErr.msg);
                    return;
                }
            }

            const message = error.response?.data?.message || 'Failed to send reset code';
            setModalConfig({
                visible: true,
                title: 'Error',
                message: message,
                type: 'error'
            });
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
                buttonText={modalConfig.type === 'success' ? 'Enter Code' : 'OK'}
            />

            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Icon name="arrow-back-ios" size={20} color={GOLD} style={{ marginLeft: 6 }} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>SECURE RECOVERY</Text>
                <View style={{ width: 44 }} />
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.contentContainer}>
                        <View style={styles.iconWrapper}>
                            <Icon name="lock-reset" size={56} color={GOLD} />
                        </View>

                        <Text style={styles.title}>Reset Password</Text>
                        <Text style={styles.subtitle}>
                            Enter your registered email address to receive a 6-digit verification code.
                        </Text>

                        <View style={styles.panel}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>BUSINESS EMAIL</Text>
                                <View style={styles.inputContainer}>
                                    <Icon name="email" size={20} color={GOLD} style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="email@company.com"
                                        placeholderTextColor={TEXT_MUTED}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        value={email}
                                        onChangeText={(v) => {
                                            setEmail(v);
                                            if (fieldError) setFieldError('');
                                        }}
                                    />
                                </View>
                                {fieldError ? (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4, paddingLeft: 2 }}>
                                        <Icon name="error-outline" size={12} color="#F87171" />
                                        <Text style={{ color: '#F87171', fontSize: 12, fontWeight: '600' }}>{fieldError}</Text>
                                    </View>
                                ) : null}
                            </View>

                            <TouchableOpacity style={styles.sendButton} onPress={handleSendCode} disabled={loading}>
                                <LinearGradient colors={[GOLD_DARK, GOLD, GOLD_LIGHT]} style={styles.btnGradient}>
                                    {loading ? <ActivityIndicator color={NAVY} /> : <Text style={styles.sendButtonText}>SEND VERIFICATION CODE</Text>}
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity style={styles.loginLink} onPress={() => navigation.reset({ index: 0, routes: [{ name: 'index' }] })}>
                            <Text style={styles.loginLinkText}>Remembered? <Text style={{ color: GOLD }}>Back to Login</Text></Text>
                        </TouchableOpacity>
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
    scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 20 },
    contentContainer: { alignItems: 'center', width: '100%', maxWidth: 400, alignSelf: 'center' },
    iconWrapper: { width: 110, height: 110, borderRadius: 55, backgroundColor: NAVY_INPUT, justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: NAVY_BORDER, shadowColor: GOLD, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 16 },
    title: { fontSize: 28, fontWeight: '800', color: TEXT_PRIMARY, marginBottom: 8, textAlign: 'center' },
    subtitle: { fontSize: 14, fontWeight: '500', color: TEXT_MUTED, textAlign: 'center', marginBottom: 32, lineHeight: 22, paddingHorizontal: 20 },
    panel: { width: '100%', borderRadius: 32, padding: 24, backgroundColor: NAVY_CARD, borderWidth: 1, borderColor: NAVY_BORDER, gap: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 10 },
    inputGroup: { gap: 10 },
    label: { fontSize: 10, fontWeight: '900', color: GOLD, paddingHorizontal: 4, letterSpacing: 1.5 },
    inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: NAVY_INPUT, borderRadius: 16, height: 60, borderWidth: 1, borderColor: NAVY_BORDER },
    inputIcon: { marginLeft: 16 },
    input: { flex: 1, height: '100%', paddingLeft: 12, paddingRight: 16, fontSize: 15, fontWeight: '600', color: TEXT_PRIMARY },
    sendButton: { height: 60, borderRadius: 16, overflow: 'hidden', shadowColor: GOLD, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
    btnGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    sendButtonText: { color: NAVY, fontWeight: '900', fontSize: 14, letterSpacing: 1 },
    loginLink: { marginTop: 32, padding: 8 },
    loginLinkText: { fontSize: 14, fontWeight: '600', color: TEXT_MUTED },
});
