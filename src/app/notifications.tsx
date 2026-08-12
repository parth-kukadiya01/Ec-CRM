import React, { useEffect, useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Alert,
    StatusBar
} from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import Icon from '../components/Icon';
import MessageModal from '../components/MessageModal';
import { useNavigation } from '@react-navigation/native';
import { B2B } from '../constants/Colors';
import ScreenHeader from '../components/ScreenHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../services/api';

const { GOLD, GOLD_LIGHT, GOLD_DARK, NAVY, NAVY_CARD, NAVY_BORDER, NAVY_INPUT, TEXT_PRIMARY, TEXT_MUTED, NAVY_MID } = B2B;

interface Notification {
    _id: string;
    title: string;
    message: string;
    type: string;
    createdAt: string;
    isRead: boolean;
}

export default function NotificationsScreen() {
    const insets = useSafeAreaInsets();
    const [notifications, setNotifications] = useState<Notification[]>([]);
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

    const fetchNotifications = async () => {
        try {
            const response = await api.get('/notifications');
            setNotifications(response.data.data.notifications);
        } catch (error: any) {
            console.error('Error fetching notifications:', error);
            const msg = error.response?.data?.message || 'Failed to load notifications';
            setModalConfig({ visible: true, title: 'Error', message: msg, type: 'error' });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { fetchNotifications(); }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchNotifications();
    };

    const handleMarkAsRead = async (id: string) => {
        try {
            await api.patch(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
        } catch (error: any) {
            console.error('Error marking as read:', error);
            const msg = error.response?.data?.message || 'Failed to update notification';
            setModalConfig({ visible: true, title: 'Error', message: msg, type: 'error' });
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'ORDER': return 'local-shipping';
            case 'PROMOTION': return 'local-offer';
            case 'SYSTEM': return 'info';
            default: return 'notifications';
        }
    };

    const getColor = (type: string) => {
        switch (type) {
            case 'ORDER': return '#10b981';
            case 'PROMOTION': return GOLD;
            case 'SYSTEM': return GOLD_LIGHT;
            default: return GOLD;
        }
    };

    const getTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = (now.getTime() - date.getTime()) / 1000;
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
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
            />

            <ScreenHeader
                showBack
                title="Notifications"
                rightElement={
                    <TouchableOpacity style={styles.refreshBtn} onPress={fetchNotifications}>
                        <Icon name="refresh" size={20} color={GOLD} />
                    </TouchableOpacity>
                }
            />

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} />}
            >
                {loading ? (
                    <ActivityIndicator size="large" color={GOLD} style={{ marginTop: 40 }} />
                ) : notifications.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconCircle}>
                            <Icon name="notifications-none" size={48} color={GOLD_DARK} opacity={0.5} />
                        </View>
                        <Text style={styles.emptyText}>All caught up!</Text>
                        <Text style={styles.emptySubtext}>Your notifications will appear here</Text>
                    </View>
                ) : (
                    notifications.map((item) => (
                        <TouchableOpacity
                            key={item._id}
                            onPress={() => !item.isRead && handleMarkAsRead(item._id)}
                            activeOpacity={0.8}
                            style={[styles.card, !item.isRead && styles.unreadCard]}
                        >
                            <View style={[styles.iconContainer, { backgroundColor: `${getColor(item.type)}15` }]}>
                                <Icon name={getIcon(item.type) as any} size={22} color={getColor(item.type)} />
                            </View>
                            <View style={styles.textContainer}>
                                <View style={styles.row}>
                                    <Text style={[styles.title, !item.isRead && styles.unreadTitle]}>{item.title}</Text>
                                    <Text style={styles.time}>{getTimeAgo(item.createdAt)}</Text>
                                </View>
                                <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
                            </View>
                            {!item.isRead && <View style={styles.unreadDot} />}
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: NAVY },
    background: { ...StyleSheet.absoluteFillObject },
    refreshBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: NAVY_INPUT, borderWidth: 1, borderColor: NAVY_BORDER },
    content: { paddingVertical: 16, paddingHorizontal: 16, paddingBottom: 60 },
    card: { flexDirection: 'row', padding: 16, borderRadius: 20, backgroundColor: NAVY_CARD, borderWidth: 1, borderColor: NAVY_BORDER, alignItems: 'center', gap: 14, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 4 },
    unreadCard: { borderColor: 'rgba(201,168,76,0.2)', backgroundColor: 'rgba(201,168,76,0.03)' },
    iconContainer: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    textContainer: { flex: 1, gap: 4 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: 13, fontWeight: '700', color: TEXT_MUTED },
    unreadTitle: { color: TEXT_PRIMARY, fontWeight: '800' },
    time: { fontSize: 10, fontWeight: '600', color: TEXT_MUTED },
    message: { fontSize: 13, fontWeight: '500', color: TEXT_MUTED, lineHeight: 18 },
    unreadDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: GOLD, marginLeft: 8 },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 120, gap: 12 },
    emptyIconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: NAVY_INPUT, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    emptyText: { fontSize: 18, color: TEXT_PRIMARY, fontWeight: '800', letterSpacing: -0.5 },
    emptySubtext: { fontSize: 13, color: TEXT_MUTED, fontWeight: '500' },
});
