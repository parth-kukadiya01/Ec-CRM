import { useState, useEffect } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { useSelector } from 'react-redux';
import { notificationService } from '../services/notificationService';
import type { RootState } from '../store';

export const usePushNotifications = () => {
    const [fcmToken, setFcmToken] = useState<string | null>(null);

    // Only send push token to backend when the user is authenticated
    const authToken = useSelector((state: RootState) => state.auth.token);

    async function requestUserPermission() {
        if (Platform.OS === 'ios') {
            const authStatus = await messaging().requestPermission();
            const enabled =
                authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                authStatus === messaging.AuthorizationStatus.PROVISIONAL;
            return enabled;
        } else if (Platform.OS === 'android') {
            // Android 13+ requires POST_NOTIFICATIONS permission
            if (Platform.Version >= 33) {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
                );
                return granted === PermissionsAndroid.RESULTS.GRANTED;
            }
            return true;
        }
        return false;
    }

    async function registerForPushNotificationsAsync() {
        const hasPermission = await requestUserPermission();
        if (!hasPermission) {
            console.log('Push notification permission denied');
            return null;
        }

        try {
            const token = await messaging().getToken();
            console.log('FCM Token:', token);
            return token;
        } catch (e) {
            console.error('Error fetching FCM token:', e);
            return null;
        }
    }

    // Get the device FCM token once on mount
    useEffect(() => {
        registerForPushNotificationsAsync().then(token => {
            setFcmToken(token);
        });

        // Foreground message handler
        const unsubscribeForeground = messaging().onMessage(async remoteMessage => {
            console.log('Foreground notification:', remoteMessage);
        });

        return () => {
            unsubscribeForeground();
        };
    }, []);

    // Register token with backend ONLY when user is logged in.
    // Re-runs automatically after login (authToken changes from null → value).
    useEffect(() => {
        if (!authToken || !fcmToken) return;

        notificationService.registerPushToken(fcmToken).catch(err => {
            console.log('Failed to register token with backend:', err);
        });
    }, [authToken, fcmToken]);

    return {
        fcmToken,
    };
};
