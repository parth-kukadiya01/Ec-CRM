import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createNavigationContainerRef } from '@react-navigation/native';

// Screen imports
import LoginScreen from '../app/index';
import RegisterScreen from '../app/register';
import ForgotPasswordScreen from '../app/forgot-password';
import ResetPasswordScreen from '../app/reset-password';

export type RootStackParamList = {
    index: undefined;
    register: undefined;
    'forgot-password': undefined;
    'reset-password': { token?: string } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export default function AppNavigator() {
    return (
        <Stack.Navigator initialRouteName='index' screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" component={LoginScreen} />
            <Stack.Screen name="register" component={RegisterScreen} />
            <Stack.Screen name="forgot-password" component={ForgotPasswordScreen} />
            <Stack.Screen name="reset-password" component={ResetPasswordScreen} />
        </Stack.Navigator>
    );
}
