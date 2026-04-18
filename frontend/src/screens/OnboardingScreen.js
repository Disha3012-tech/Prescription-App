import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  StatusBar, Dimensions, SafeAreaView, ScrollView, Animated, Platform
} from 'react-native';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const THEME = {
  background: '#F9FBF9',
  surface: '#FFFFFF',
  primary: '#08120F',
  accent: '#10B981',
  accentLight: '#ECFDF5',
  textMain: '#08120F',
  textMuted: '#64748B',
  border: '#E5E9E7',
};

// --- ANIMATED BLURRY BACKGROUND COMPONENT ---
const MovingBackground = () => {
  const moveAnim1 = useRef(new Animated.Value(0)).current;
  const moveAnim2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createLoop = (anim, duration) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration, useNativeDriver: true }),
        ])
      ).start();
    };

    createLoop(moveAnim1, 8000);
    createLoop(moveAnim2, 11000);
  }, []);

  const drift1 = {
    transform: [
      { translateX: moveAnim1.interpolate({ inputRange: [0, 1], outputRange: [-50, 50] }) },
      { translateY: moveAnim1.interpolate({ inputRange: [0, 1], outputRange: [-20, 60] }) },
      { scale: moveAnim1.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] }) }
    ]
  };

  const drift2 = {
    transform: [
      { translateX: moveAnim2.interpolate({ inputRange: [0, 1], outputRange: [40, -60] }) },
      { translateY: moveAnim2.interpolate({ inputRange: [0, 1], outputRange: [50, -30] }) },
      { scale: moveAnim2.interpolate({ inputRange: [0, 1], outputRange: [1.2, 0.9] }) }
    ]
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient colors={[THEME.background, '#E8F5E9']} style={StyleSheet.absoluteFill} />

      {/* Orb 1: Mint Glow */}
      <Animated.View
        style={[styles.blurOrb, drift1, { top: '10%', left: '10%', backgroundColor: '#C6F6D5' }]}
        blurRadius={Platform.OS === 'ios' ? 80 : 40}
      />

      {/* Orb 2: Deep Obsidian Glow */}
      <Animated.View
        style={[styles.blurOrb, drift2, { bottom: '15%', right: '5%', backgroundColor: '#1A202C', opacity: 0.08 }]}
        blurRadius={Platform.OS === 'ios' ? 100 : 50}
      />

      {/* Orb 3: Accent Center */}
      <Animated.View
        style={[styles.blurOrb, drift1, { bottom: '40%', left: '-10%', backgroundColor: THEME.accent, opacity: 0.12 }]}
        blurRadius={Platform.OS === 'ios' ? 90 : 45}
      />
    </View>
  );
};

export default function OnboardingScreen({ navigate }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      <MovingBackground />

      <ScrollView
        showsVerticalScrollIndicator={false}
        snapToInterval={height}
        decelerationRate="fast"
        pagingEnabled
        contentContainerStyle={{ width }}
      >
        {/* PAGE 1 */}
        <View style={styles.screen}>
          <SafeAreaView style={styles.safeArea}>
            <Animated.View style={[styles.mainContent, { opacity: fadeAnim }]}>
              <View style={styles.header}>
                <View style={styles.badge}>
                  <Ionicons name="shield-checkmark" size={12} color={THEME.accent} />
                  <Text style={styles.badgeText}>CLINICAL GRADE SECURITY</Text>
                </View>
                <Text style={styles.brandTitle}>PATH<Text style={{ fontWeight: '300' }}>-MED</Text></Text>
              </View>

              <View style={styles.heroCenter}>
                <Text style={styles.kicker}>SECURE TERMINAL</Text>
                <Text style={styles.h1}>Precision{"\n"}Care Logic.</Text>
                <View style={styles.accentBar} />
              </View>

              <View style={styles.footerHint}>
                <Text style={styles.hintText}>SCROLL TO INITIALIZE</Text>
                <Feather name="chevron-down" size={20} color={THEME.accent} />
              </View>
            </Animated.View>
          </SafeAreaView>
        </View>

        {/* PAGE 2 */}
        <View style={styles.screen}>
          <View style={styles.glassCard}>
            <View style={styles.cardInner}>
              <View style={styles.visualContainer}>
                <Animated.View style={[styles.ring, { transform: [{ scale: pulseAnim }] }]} />
                <View style={styles.iconCircle}>
                  <MaterialCommunityIcons name="molecule" size={44} color={THEME.accent} />
                </View>
              </View>

              <Text style={styles.cardTitle}>Neural Sync</Text>
              <Text style={styles.cardSub}>Deploying molecular audits to synchronize your health cycles.</Text>

              <View style={styles.ctaGroup}>
                <TouchableOpacity style={styles.primaryBtn} onPress={() => navigate?.('SIGNUP')}>
                  <LinearGradient colors={[THEME.primary, '#152A24']} style={styles.btnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    <Text style={styles.btnText}>Start Journey</Text>
                    <Feather name="arrow-right" size={20} color={THEME.accent} />
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity style={styles.loginLink} onPress={() => navigate?.('LOGIN')}>
                  <Text style={styles.loginText}>Already registered? <Text style={styles.loginBold}>Log In</Text></Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  screen: { height, width, justifyContent: 'center', alignItems: 'center' },
  safeArea: { flex: 1, width: '100%' },
  mainContent: { flex: 1, justifyContent: 'space-between', alignItems: 'center', paddingVertical: 60 },

  // BLUR EFFECT STYLES
  blurOrb: {
    position: 'absolute',
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: (width * 0.7) / 2,
    opacity: 0.4,
  },

  header: { alignItems: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: THEME.accentLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.1)' },
  badgeText: { color: THEME.accent, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  brandTitle: { fontSize: 24, fontWeight: '800', color: THEME.primary, marginTop: 15, letterSpacing: 2 },

  heroCenter: { alignItems: 'center' },
  kicker: { color: THEME.accent, fontSize: 12, fontWeight: '900', letterSpacing: 4, marginBottom: 12 },
  h1: { fontSize: 48, fontWeight: '800', textAlign: 'center', color: THEME.primary, lineHeight: 54 },
  accentBar: { width: 40, height: 4, backgroundColor: THEME.accent, borderRadius: 2, marginTop: 24 },

  footerHint: { alignItems: 'center', gap: 8 },
  hintText: { fontSize: 10, fontWeight: '800', color: THEME.textMuted, letterSpacing: 2 },

  glassCard: { width: width * 0.9, height: height * 0.7, backgroundColor: THEME.surface, borderRadius: 40, borderWidth: 1, borderColor: THEME.border, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 5, overflow: 'hidden' },
  cardInner: { flex: 1, padding: 32, alignItems: 'center' },
  visualContainer: { width: 150, height: 150, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: THEME.background, justifyContent: 'center', alignItems: 'center', zIndex: 2 },
  ring: { position: 'absolute', width: 130, height: 130, borderRadius: 65, borderWidth: 2, borderColor: THEME.accent, opacity: 0.2 },
  cardTitle: { fontSize: 28, fontWeight: '900', color: THEME.primary },
  cardSub: { fontSize: 16, color: THEME.textMuted, textAlign: 'center', marginTop: 12, lineHeight: 22 },

  ctaGroup: { marginTop: 'auto', width: '100%', alignItems: 'center' },
  primaryBtn: { width: '100%', height: 70, borderRadius: 20, overflow: 'hidden' },
  btnGradient: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  btnText: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  loginLink: { marginTop: 20 },
  loginText: { color: THEME.textMuted, fontSize: 14 },
  loginBold: { color: THEME.primary, fontWeight: '800' }
});
