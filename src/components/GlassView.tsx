import React from 'react';
import { View, Platform, StyleSheet, ViewProps, StyleProp, ViewStyle } from 'react-native';
import { BlurView as NativeBlurView, BlurViewProps } from '@react-native-community/blur';

interface GlassViewProps extends ViewProps {
    blurType?: BlurViewProps['blurType'];
    blurAmount?: BlurViewProps['blurAmount'];
    backgroundColor?: string;
    children?: React.ReactNode;
    style?: StyleProp<ViewStyle>;
}

export default function GlassView({
    blurType = 'light',
    blurAmount = 50,
    backgroundColor,
    style,
    children,
    ...props
}: GlassViewProps) {
    const isDark = blurType === 'dark';
    const fallbackBg = backgroundColor ||
        (isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.9)');

    return (
        <View style={[style, { overflow: 'hidden', backgroundColor: Platform.OS === 'android' ? fallbackBg : 'transparent' }]} {...props}>
            {Platform.OS === 'ios' && (
                <NativeBlurView
                    blurType={blurType}
                    blurAmount={blurAmount}
                    style={StyleSheet.absoluteFill}
                />
            )}
            {children}
        </View>
    );
}
