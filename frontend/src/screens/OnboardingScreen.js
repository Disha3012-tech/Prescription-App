import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  StatusBar, SafeAreaView, ScrollView, Animated,
  Platform, useWindowDimensions, PanResponder,
} from 'react-native';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const THEME = {
  background: ['#F0FDFA', '#E0F2FE', '#F0F9FF'],
  surface: '#FFFFFF',
  primary: '#0D9488',
  primaryDark: '#0F766E',
  primaryLight: '#5EEAD4',
  accent: '#0EA5E9',
  accentLight: '#E0F2FE',
  tealLight: '#CCFBF1',
  textMain: '#0D1F2D',
  textMuted: '#5A7384',
  border: '#E2E8F0',
};

/* ─── Floating Background Glows (matches LandingScreen) ─── */
const BackgroundShapes = ({ windowWidth, mouseX, mouseY }) => {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: 1, duration: 8000, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 8000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const floatX = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [-40, 40] });
  const floatY = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [30, -30] });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[
        styles.bgGlowTop,
        { width: windowWidth, height: windowWidth },
        { transform: [{ translateX: Animated.add(Animated.divide(mouseX, 25), floatX) }, { translateY: Animated.add(Animated.divide(mouseY, 25), floatY) }] }
      ]}>
        <LinearGradient colors={['#5EEAD4', 'transparent']} style={{ flex: 1, borderRadius: 9999 }} />
      </Animated.View>
      <Animated.View style={[
        styles.bgGlowBottom,
        { width: windowWidth * 1.3, height: windowWidth * 1.3 },
        { transform: [{ translateX: Animated.add(Animated.multiply(Animated.divide(mouseX, 20), -1), Animated.multiply(floatX, -0.6)) }, { translateY: Animated.add(Animated.multiply(Animated.divide(mouseY, 20), -1), Animated.multiply(floatY, -0.6)) }] }
      ]}>
        <LinearGradient colors={['transparent', '#BAE6FD60']} style={{ flex: 1, borderRadius: 9999 }} />
      </Animated.View>
      <Animated.View style={[
        styles.bgGlowMid,
        { width: windowWidth * 0.55, height: windowWidth * 0.55 },
        { transform: [{ translateX: Animated.multiply(floatY, 0.3) }, { translateY: Animated.multiply(floatX, -0.25) }] }
      ]}>
        <LinearGradient colors={['#0EA5E918', 'transparent']} style={{ flex: 1, borderRadius: 9999 }} />
      </Animated.View>
    </View>
  );
};

/* ─── Pulsing Ring Animation ─── */
const PulseRings = ({ color, size }) => {
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = (anim, delay) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(anim, { toValue: 1, duration: 2000, useNativeDriver: true }),
          ]),
          Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      ).start();
    };
    pulse(ring1, 0);
    pulse(ring2, 800);
  }, []);

  const ringStyle = (anim) => ({
    position: 'absolute',
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: 1.5,
    borderColor: color,
    opacity: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.6, 0.2, 0] }),
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] }) }],
  });

  return (
    <>
      <Animated.View style={ringStyle(ring1)} />
      <Animated.View style={ringStyle(ring2)} />
    </>
  );
};

/* ─── Feature Row ─── */
const FeatureItem = ({ icon, label, sub }) => (
  <View style={styles.featureItem}>
    <LinearGradient colors={[THEME.primary + '25', THEME.accent + '15']} style={styles.featureIconWrap}>
      <MaterialCommunityIcons name={icon} size={20} color={THEME.primary} />
    </LinearGradient>
    <View style={styles.featureText}>
      <Text style={styles.featureLabel}>{label}</Text>
      <Text style={styles.featureSub}>{sub}</Text>
    </View>
    <MaterialCommunityIcons name="check-circle" size={18} color={THEME.primary} style={{ opacity: 0.7 }} />
  </View>
);

/* ─── Main Screen ─── */
export default function OnboardingScreen({ navigate }) {
  const { width: W, height: H } = useWindowDimensions();
  const isTablet = W >= 768;
  const isLaptop = W >= 1024;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const cardSlide = useRef(new Animated.Value(60)).current;
  const iconScale = useRef(new Animated.Value(0.8)).current;
  const mouseX = useRef(new Animated.Value(0)).current;
  const mouseY = useRef(new Animated.Value(0)).current;
  const screenDims = useRef({ width: W, height: H });
  useEffect(() => { screenDims.current = { width: W, height: H }; }, [W, H]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 18, friction: 9, useNativeDriver: true }),
      Animated.spring(cardSlide, { toValue: 0, tension: 14, friction: 8, delay: 300, useNativeDriver: true }),
      Animated.spring(iconScale, { toValue: 1, tension: 20, friction: 6, delay: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, g) => {
      mouseX.setValue(g.moveX - screenDims.current.width / 2);
      mouseY.setValue(g.moveY - screenDims.current.height / 2);
    },
    onPanResponderRelease: () => {
      Animated.spring(mouseX, { toValue: 0, useNativeDriver: true, friction: 10 }).start();
      Animated.spring(mouseY, { toValue: 0, useNativeDriver: true, friction: 10 }).start();
    },
  })).current;

  const features = [
    { icon: 'text-recognition', label: 'Prescription OCR', sub: 'Handwriting decoded instantly' },
    { icon: 'shield-alert-outline', label: 'Drug Interaction Check', sub: 'Zero conflicts missed' },
    { icon: 'brain', label: 'AI Health Insights', sub: 'Personalized to your profile' },
  ];

  return (
    <LinearGradient colors={THEME.background} style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* Background */}
      <View style={StyleSheet.absoluteFill} {...pan.panHandlers}>
        <BackgroundShapes windowWidth={W} mouseX={mouseX} mouseY={mouseY} />
      </View>

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { alignItems: 'center' }]}
        >
          <View style={[styles.pageContent, { maxWidth: isLaptop ? 980 : 560, width: '100%' }]}>

            {/* ── Header ── */}
            <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              <View style={styles.brandRow}>
                <LinearGradient colors={[THEME.primary, THEME.accent]} style={styles.logoGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <MaterialCommunityIcons name="pill" size={16} color="#FFF" />
                </LinearGradient>
                <View>
                  <Text style={styles.brandText}>AiLyze</Text>
                  <Text style={styles.brandSub}>AI</Text>
                </View>
              </View>

              <LinearGradient colors={[THEME.primary + '20', THEME.accent + '15']} style={styles.secBadge} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Ionicons name="shield-checkmark" size={12} color={THEME.primary} />
                <Text style={styles.secBadgeText}>CLINICAL GRADE SECURITY</Text>
              </LinearGradient>
            </Animated.View>

            {/* ── Hero ── */}
            <Animated.View style={[
              styles.heroSection,
              isLaptop && styles.heroSectionLaptop,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
            ]}>
              <View style={[styles.heroBadgeRow, isLaptop && { justifyContent: 'center' }]}>
                <LinearGradient colors={[THEME.primary + '20', THEME.accent + '15']} style={styles.heroBadge} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <View style={styles.heroBadgeDot} />
                  <Text style={styles.heroBadgeText}>SECURE TERMINAL — INITIALIZE</Text>
                </LinearGradient>
              </View>

              <Text style={[styles.heroTitle, isTablet && styles.heroTitleTablet, isLaptop && styles.heroTitleLaptop]}>
                {'Prescriptions,\n'}
                <Text style={styles.heroAccent}>Understood.</Text>
              </Text>
              <Text style={[styles.heroSub, isTablet && styles.heroSubTablet, isLaptop && { textAlign: 'center', maxWidth: 520 }]}>
                Begin your journey to smarter, safer medication management — powered by AI that never misses a detail.
              </Text>

              {/* Trust chips */}
              <View style={[styles.trustRow, isLaptop && { justifyContent: 'center' }]}>
                {['99.8% Accuracy', 'Instant Scan', 'Zero Risk Missed'].map((t, i) => (
                  <View key={i} style={styles.trustChip}>
                    <MaterialCommunityIcons name="check-circle" size={12} color={THEME.primary} />
                    <Text style={styles.trustChipText}>{t}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>

            {/* ── Main Card (or side-by-side on laptop) ── */}
            <Animated.View style={[
              styles.mainArea,
              isLaptop && styles.mainAreaLaptop,
              { opacity: fadeAnim, transform: [{ translateY: cardSlide }] }
            ]}>

              {/* Icon + features column */}
              {isLaptop && (
                <View style={styles.featuresCol}>
                  {/* Large animated icon */}
                  <View style={styles.iconDisplay}>
                    <PulseRings color={THEME.primary} size={160} />
                    <LinearGradient colors={[THEME.primary + '18', THEME.accent + '12']} style={styles.iconDisplayCircle}>
                      <LinearGradient colors={[THEME.primary, THEME.accent]} style={styles.iconDisplayInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                        <MaterialCommunityIcons name="pill" size={44} color="#FFF" />
                      </LinearGradient>
                    </LinearGradient>
                  </View>
                  <Text style={styles.featuresColTitle}>Why AiLyze?</Text>
                  <View style={styles.featuresList}>
                    {features.map((f, i) => <FeatureItem key={i} {...f} />)}
                  </View>
                </View>
              )}

              {/* CTA Card */}
              <View style={[styles.card, isLaptop && styles.cardLaptop]}>
                {/* Card header gradient strip */}
                <LinearGradient colors={[THEME.primary + '12', THEME.accent + '08', 'transparent']} style={styles.cardTopStrip} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

                {/* Icon (phone/tablet only) */}
                {!isLaptop && (
                  <Animated.View style={[styles.cardIconArea, { transform: [{ scale: iconScale }] }]}>
                    <PulseRings color={THEME.primary} size={110} />
                    <LinearGradient colors={[THEME.primary + '18', THEME.accent + '12']} style={styles.cardIconOuter}>
                      <LinearGradient colors={[THEME.primary, THEME.accent]} style={styles.cardIconInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                        <MaterialCommunityIcons name="pill" size={32} color="#FFF" />
                      </LinearGradient>
                    </LinearGradient>
                  </Animated.View>
                )}

                {/* Card text */}
                <Text style={[styles.cardTitle, isLaptop && { fontSize: 26 }]}>Start Your Journey</Text>
                <Text style={[styles.cardSub, isLaptop && { fontSize: 15 }]}>
                  Create your profile and let AiLyze AI analyze, protect, and personalize your medication plan.
                </Text>

                {/* Features list on phone/tablet */}
                {!isLaptop && (
                  <View style={styles.featuresList}>
                    {features.map((f, i) => <FeatureItem key={i} {...f} />)}
                  </View>
                )}

                

                {/* CTA Button */}
                <TouchableOpacity style={styles.ctaBtn} activeOpacity={0.88} onPress={() => navigate?.('SIGNUP')}>
                  <LinearGradient colors={[THEME.primary, THEME.primaryDark, '#064E3B']} style={styles.ctaBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    <MaterialCommunityIcons name="pill" size={18} color="rgba(255,255,255,0.6)" />
                    <Text style={styles.ctaBtnText}>Start Journey</Text>
                    <Feather name="arrow-right" size={18} color="#FFF" />
                  </LinearGradient>
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Login link */}
                <TouchableOpacity style={styles.loginBtn} onPress={() => navigate?.('LOGIN')} activeOpacity={0.75}>
                  <Text style={styles.loginText}>Already registered?</Text>
                  <Text style={styles.loginBold}> Log In →</Text>
                </TouchableOpacity>

                {/* Bottom trust badges */}
                <View style={styles.cardTrust}>
                  <View style={styles.cardTrustItem}>
                    <Ionicons name="shield-checkmark" size={13} color={THEME.primary} />
                    <Text style={styles.cardTrustText}>HIPAA Compliant</Text>
                  </View>
                  <View style={styles.cardTrustDivider} />
                  <View style={styles.cardTrustItem}>
                    <MaterialCommunityIcons name="lock" size={13} color={THEME.primary} />
                    <Text style={styles.cardTrustText}>End-to-End Encrypted</Text>
                  </View>
                </View>
              </View>
            </Animated.View>

          </View>
          <View style={{ height: 60 }} />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

/* ─────────── STYLES ─────────── */
const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },

  /* Background glows */
  bgGlowTop: { position: 'absolute', top: '-18%', right: '-12%', opacity: 0.42 },
  bgGlowBottom: { position: 'absolute', bottom: '-18%', left: '-22%', opacity: 0.3 },
  bgGlowMid: { position: 'absolute', top: '38%', right: '8%', opacity: 0.5 },

  /* Scroll */
  scrollContent: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 10 : 20 },
  pageContent: { alignSelf: 'center' },

  /* Header */
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, paddingTop: 6 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoGrad: { width: 36, height: 36, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  brandText: { fontSize: 14, fontWeight: '900', letterSpacing: 3, color: THEME.primaryDark, lineHeight: 17 },
  brandSub: { fontSize: 9, fontWeight: '800', letterSpacing: 4, color: THEME.accent, lineHeight: 12 },
  secBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 30 },
  secBadgeText: { color: THEME.primaryDark, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },

  /* Hero */
  heroSection: { marginBottom: 32 },
  heroSectionLaptop: { alignItems: 'center', marginBottom: 40 },
  heroBadgeRow: { flexDirection: 'row', marginBottom: 16 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 30 },
  heroBadgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: THEME.primary },
  heroBadgeText: { fontSize: 10, fontWeight: '900', color: THEME.primary, letterSpacing: 2 },
  heroTitle: { fontSize: 40, fontWeight: '900', color: THEME.primaryDark, lineHeight: 48, letterSpacing: -1.5 },
  heroTitleTablet: { fontSize: 52, lineHeight: 62 },
  heroTitleLaptop: { fontSize: 64, lineHeight: 76, textAlign: 'center' },
  heroAccent: { color: THEME.accent },
  heroSub: { fontSize: 15, color: THEME.textMuted, lineHeight: 25, marginTop: 14, fontWeight: '500' },
  heroSubTablet: { fontSize: 17, lineHeight: 27 },
  trustRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 20 },
  trustChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#CCFBF1', paddingHorizontal: 11, paddingVertical: 6, borderRadius: 20 },
  trustChipText: { fontSize: 11, fontWeight: '700', color: THEME.primaryDark },

  /* Main area */
  mainArea: { width: '100%' },
  mainAreaLaptop: { flexDirection: 'row', gap: 32, alignItems: 'flex-start' },

  /* Features column (laptop) */
  featuresCol: { flex: 1, paddingTop: 8 },
  iconDisplay: { width: 180, height: 180, justifyContent: 'center', alignItems: 'center', marginBottom: 28, alignSelf: 'center' },
  iconDisplayCircle: { width: 130, height: 130, borderRadius: 65, justifyContent: 'center', alignItems: 'center' },
  iconDisplayInner: { width: 84, height: 84, borderRadius: 42, justifyContent: 'center', alignItems: 'center' },
  featuresColTitle: { fontSize: 22, fontWeight: '900', color: THEME.primaryDark, marginBottom: 20, letterSpacing: -0.5 },

  /* Card */
  card: {
    backgroundColor: THEME.surface,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 6,
    overflow: 'hidden',
  },
  cardLaptop: { flex: 1.1, borderRadius: 32, padding: 36 },
  cardTopStrip: { position: 'absolute', top: 0, left: 0, right: 0, height: 80 },

  /* Card icon (phone/tablet) */
  cardIconArea: { alignItems: 'center', marginBottom: 22, height: 140, justifyContent: 'center' },
  cardIconOuter: { width: 110, height: 110, borderRadius: 55, justifyContent: 'center', alignItems: 'center' },
  cardIconInner: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center' },

  /* Card text */
  cardTitle: { fontSize: 24, fontWeight: '900', color: THEME.primaryDark, marginBottom: 8, letterSpacing: -0.5 },
  cardSub: { fontSize: 14, color: THEME.textMuted, lineHeight: 22, marginBottom: 24, fontWeight: '500' },

  /* Features list */
  featuresList: { gap: 0, marginBottom: 24 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: THEME.border + '80' },
  featureIconWrap: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  featureText: { flex: 1 },
  featureLabel: { fontSize: 14, fontWeight: '800', color: THEME.primaryDark },
  featureSub: { fontSize: 12, color: THEME.textMuted, marginTop: 2 },

  /* Progress */
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  progressBar: { flex: 1, height: 4, backgroundColor: THEME.border, borderRadius: 4, overflow: 'hidden' },
  progressFill: { width: '33%', height: '100%', borderRadius: 4 },
  progressLabel: { fontSize: 11, fontWeight: '700', color: THEME.textMuted },

  /* CTA Button */
  ctaBtn: { borderRadius: 100, overflow: 'hidden', shadowColor: THEME.primaryDark, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 8 },
  ctaBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18, borderRadius: 100 },
  ctaBtnText: { color: '#FFF', fontSize: 15, fontWeight: '900', letterSpacing: 1 },

  /* Divider */
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: THEME.border },
  dividerText: { fontSize: 13, color: THEME.textMuted, fontWeight: '600' },

  /* Login */
  loginBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 4 },
  loginText: { fontSize: 14, color: THEME.textMuted },
  loginBold: { fontSize: 14, color: THEME.primaryDark, fontWeight: '900' },

  /* Card trust row */
  cardTrust: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20, paddingTop: 18, borderTopWidth: 1, borderTopColor: THEME.border },
  cardTrustItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardTrustText: { fontSize: 11, fontWeight: '700', color: THEME.textMuted },
  cardTrustDivider: { width: 1, height: 14, backgroundColor: THEME.border, marginHorizontal: 14 },
});