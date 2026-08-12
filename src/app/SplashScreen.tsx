import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ViewStyle,
  TextStyle,
  StatusBar,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'react-native-linear-gradient';
import { B2B } from '../constants/Colors';

const { GOLD, NAVY, NAVY_MID } = B2B;

const SplashScreen: React.FC = () => {
  const insets = useSafeAreaInsets();

  // Animation values for fading in, scaling, and sliding up
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim, slideAnim]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <LinearGradient
        colors={[NAVY, NAVY_MID, '#09101d']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <Animated.View
        style={[
          styles.contentContainer,
          {
            paddingBottom: insets.bottom,
            opacity: fadeAnim,
            transform: [
              { scale: scaleAnim },
              { translateY: slideAnim }
            ],
          } as ViewStyle,
        ]}
      >
        <View style={styles.logoWrapper}>
          <View style={styles.logoContainer}>
            <Text style={styles.svText}>SV</Text>
            <Text style={styles.goldText}>GOLD</Text>
          </View>
          <Text style={styles.subtitle}>JO JO KADALI</Text>

          <View style={styles.decorativeLine} />
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NAVY,
  } as ViewStyle,
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  logoWrapper: {
    alignItems: 'center',
  } as ViewStyle,
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  } as ViewStyle,
  svText: {
    fontSize: 52,
    fontWeight: '800',
    color: GOLD, // Elegant gold color
    letterSpacing: 2,
    marginRight: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  } as TextStyle,
  goldText: {
    fontSize: 52,
    fontWeight: '300',
    color: '#FFFFFF',
    letterSpacing: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  } as TextStyle,
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E2C275', // Lighter gold/champagne for subtitle
    letterSpacing: 8,
    marginTop: 4,
  } as TextStyle,
  decorativeLine: {
    width: 60,
    height: 2,
    marginTop: 40,
    borderRadius: 1,
    backgroundColor: GOLD,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  } as ViewStyle,
});

export default SplashScreen;
