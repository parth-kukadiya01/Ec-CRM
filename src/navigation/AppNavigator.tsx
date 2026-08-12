import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createNavigationContainerRef } from '@react-navigation/native';

// Screen imports
import LoginScreen from '../app/index';
import HomeScreen from '../app/home';
import RegisterScreen from '../app/register';
import CatalogScreen from '../app/catalog';
import SearchScreen from '../app/search';
import FavoritesScreen from '../app/favorites';
import ProductDetailsScreen from '../app/product-details';
import CartScreen from '../app/cart';
import OrdersScreen from '../app/orders';
import ProfileScreen from '../app/profile';
import NotificationsScreen from '../app/notifications';
import ForgotPasswordScreen from '../app/forgot-password';
import ResetPasswordScreen from '../app/reset-password';

export type RootStackParamList = {
    index: undefined;
    home: undefined;
    register: undefined;
    catalog: { categoryId?: string; categoryName?: string } | undefined;
    search: undefined;
    favorites: undefined;
    'product-details': { productId: string };
    cart: undefined;
    orders: undefined;
    profile: undefined;
    notifications: undefined;
    'forgot-password': undefined;
    'reset-password': { token?: string } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export default function AppNavigator() {
    return (
        <Stack.Navigator initialRouteName='home' screenOptions={{ headerShown: false }}>
            {/* <Stack.Screen name="index" component={LoginScreen} /> */}
            <Stack.Screen name="home" component={HomeScreen} />
            {/* <Stack.Screen name="register" component={RegisterScreen} /> */}
            <Stack.Screen name="catalog" component={CatalogScreen} />
            <Stack.Screen name="search" component={SearchScreen} />
            <Stack.Screen name="favorites" component={FavoritesScreen} />
            <Stack.Screen name="product-details" component={ProductDetailsScreen} />
            <Stack.Screen name="cart" component={CartScreen} />
            <Stack.Screen name="orders" component={OrdersScreen} />
            <Stack.Screen name="profile" component={ProfileScreen} />
            <Stack.Screen name="notifications" component={NotificationsScreen} />
            {/* <Stack.Screen name="forgot-password" component={ForgotPasswordScreen} />
            <Stack.Screen name="reset-password" component={ResetPasswordScreen} /> */}
        </Stack.Navigator>
    );
}
