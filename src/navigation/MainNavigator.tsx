import { StyleSheet } from 'react-native';
import React, { useEffect } from 'react';
import SplashScreen from '../app/SplashScreen';
import AuthNavigator from './AuthNavigator';
import AppNavigator from './AppNavigator';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { hydrateAuth } from '../store/slices/authSlice';

const MainNavigation: React.FC = () => {
    const dispatch = useAppDispatch();
    const { token, isLoading } = useAppSelector((state) => state.auth);

    useEffect(() => {
        // Read token + user from AsyncStorage once on mount
        dispatch(hydrateAuth());
    }, [dispatch]);

    if (isLoading) {
        return <SplashScreen />;
    }

    return token ? <AppNavigator /> : <AuthNavigator />;
};

export default MainNavigation;

const styles = StyleSheet.create({});