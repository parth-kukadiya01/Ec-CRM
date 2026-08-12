import React from 'react';
import {
    Modal,
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Animated,
} from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import Icon from './Icon';

const GOLD = '#C9A84C';
const GOLD_LIGHT = '#E8C97A';
const GOLD_DARK = '#B09440';
const NAVY = '#0B1220';
const NAVY_CARD = '#162040';
const NAVY_BORDER = '#2A3F6A';
const TEXT_PRIMARY = '#F0EAD6';
const TEXT_MUTED = '#8899BB';

type MessageModalProps = {
    visible: boolean;
    title: string;
    message: string;
    type?: 'success' | 'error' | 'info';
    onClose: () => void;
    buttonText?: string;
};

const MessageModal = ({
    visible,
    title,
    message,
    type = 'success',
    onClose,
    buttonText = 'OK',
}: MessageModalProps) => {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Top Decorative Line */}
                    <View style={styles.topLine} />

                    {/* Icon Circle */}
                    <View style={styles.iconRing}>
                        <LinearGradient
                            colors={[GOLD_DARK, GOLD, GOLD_LIGHT]}
                            style={styles.iconGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <Icon
                                name={type === 'success' ? 'check-circle' : type === 'error' ? 'error-outline' : 'info'}
                                size={32}
                                color={NAVY}
                            />
                        </LinearGradient>
                    </View>

                    {/* Content */}
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.message}>{message}</Text>

                    {/* Action Button */}
                    <TouchableOpacity
                        activeOpacity={0.8}
                        style={styles.buttonContainer}
                        onPress={onClose}
                    >
                        <LinearGradient
                            colors={[GOLD_DARK, GOLD, GOLD_LIGHT]}
                            style={styles.buttonGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <Text style={styles.buttonText}>{buttonText}</Text>
                            <Icon name="arrow-forward" size={16} color={NAVY} style={{ marginLeft: 8 }} />
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(5, 8, 15, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    container: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: NAVY_CARD,
        borderRadius: 32,
        padding: 32,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: NAVY_BORDER,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.5,
        shadowRadius: 40,
        elevation: 15,
        position: 'relative',
        overflow: 'hidden',
    },
    topLine: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        backgroundColor: GOLD,
    },
    iconRing: {
        width: 72,
        height: 72,
        borderRadius: 36,
        padding: 4,
        backgroundColor: 'rgba(201, 168, 76, 0.15)',
        marginBottom: 24,
    },
    iconGradient: {
        flex: 1,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        color: GOLD,
        marginBottom: 12,
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    message: {
        fontSize: 14,
        color: TEXT_MUTED,
        lineHeight: 22,
        textAlign: 'center',
        marginBottom: 32,
        fontWeight: '500',
    },
    buttonContainer: {
        width: '100%',
        height: 56,
        borderRadius: 16,
        overflow: 'hidden',
    },
    buttonGradient: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        fontSize: 15,
        fontWeight: '900',
        color: NAVY,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
});

export default MessageModal;
