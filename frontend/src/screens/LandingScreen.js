import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, Animated, StatusBar, Dimensions, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SHADOWS, RADIUS } from '../theme';
import { MaterialCommunityIcons, Feather, Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const FEATURES = [
  {
    icon: 'scan-helper',
    iconLib: 'MaterialCommunityIcons',
    label: 'AI Prescription Scan',
    sub: 'Decode any handwriting instantly',
    gradient: ['#0D9488', '#0891B2'],
  },
  {
    icon: 'swap-horizontal',
    iconLib: 'MaterialCommunityIcons',
    label: 'Smart Substitutes',
    sub: 'Save up to 80% with generics',
    gradient: ['#7C3AED', '#6D28D9'],
  },
  {
    icon: 'shield-check-outline',
    iconLib: 'MaterialCommunityIcons',
    label: 'Drug Safety Alerts',
    sub: 'Real-time interaction checks',
    gradient: ['#F43F5E', '#E11D48'],
  },
  {
    icon: 'robot-outline',
    iconLib: 'MaterialCommunityIcons',
    label: '24/7 Health AI',
    sub: 'Ask anything, get clarity',
    gradient: ['#F59E0B', '#D97706'],
  },
];

const STATS = [
  { value: '14K+', label: 'Prescriptions' },
  { value: '98%', label: 'Accuracy' },
  { value: '60+', label: 'Countries' },
];

export default function LandingScreen({ navigate }) {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entry animations
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 12, useNativeDriver: true }),
    ]).start();

    // Float loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -12, duration: 2400, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2400, useNativeDriver: true }),
      ])
    ).start();

    // Pulse loop for CTA
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.midnight} />

      {/* Hero Section */}
      <LinearGradient
        colors={['#0A1628', '#0F2535', '#0A2A3A']}
        style={styles.hero}
      >
        {/* Background decoration circles */}
        <View style={styles.bgCircle1} />
        <View style={styles.bgCircle2} />
        <View style={styles.bgCircle3} />

        {/* Nav */}
        <View style={styles.nav}>
          <View style={styles.logoRow}>
            <LinearGradient colors={['#0D9488', '#0891B2']} style={styles.logoBox}>
              <MaterialCommunityIcons name="pill" size={18} color="#fff" />
            </LinearGradient>
            <Text style={styles.logoText}>PrescribePal</Text>
          </View>
          <View style={styles.freeBadge}>
            <View style={styles.freeDot} />
            <Text style={styles.freeBadgeText}>Free · No Ads</Text>
          </View>
        </View>

        {/* Hero Illustration */}
        <Animated.View style={[styles.heroIllustration, { transform: [{ translateY: floatAnim }] }]}>
          <Animated.View style={[styles.heroRingOuter, { transform: [{ scale: scaleAnim }] }]}>
            <View style={styles.heroRingInner}>
              <LinearGradient colors={['#0D9488', '#0891B2']} style={styles.heroIconBox}>
                <MaterialCommunityIcons name="file-document-edit-outline" size={52} color="#fff" />
              </LinearGradient>
            </View>
          </Animated.View>
          {/* Orbiting pills */}
          <View style={[styles.orbit, styles.orbit1]}>
            <LinearGradient colors={['#7C3AED', '#6D28D9']} style={styles.orbitDot}>
              <MaterialCommunityIcons name="pill" size={14} color="#fff" />
            </LinearGradient>
          </View>
          <View style={[styles.orbit, styles.orbit2]}>
            <LinearGradient colors={['#F43F5E', '#E11D48']} style={styles.orbitDot}>
              <Ionicons name="checkmark" size={14} color="#fff" />
            </LinearGradient>
          </View>
          <View style={[styles.orbit, styles.orbit3]}>
            <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.orbitDot}>
              <Feather name="shield" size={12} color="#fff" />
            </LinearGradient>
          </View>
        </Animated.View>

        {/* Hero Text */}
        <Animated.View style={[styles.heroText, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.heroBadge}>
            <View style={styles.heroBadgeDot} />
            <Text style={styles.heroBadgeLabel}>AI-Powered · Trusted by 14K+</Text>
          </View>
          <Text style={styles.headline}>Your Health,{'\n'}Decoded.</Text>
          <Text style={styles.subheadline}>
            Point your camera at any prescription — we'll explain every medicine in plain English, find cheaper alternatives, and keep you safe.
          </Text>
        </Animated.View>

        {/* Stats */}
        <Animated.View style={[styles.statsRow, { opacity: fadeAnim }]}>
          {STATS.map((s, i) => (
            <React.Fragment key={i}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
              {i < STATS.length - 1 && <View style={styles.statDivider} />}
            </React.Fragment>
          ))}
        </Animated.View>
      </LinearGradient>

      {/* Content Section */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        showsVerticalScrollIndicator={false}
      >
        {/* Feature Grid */}
        <Text style={styles.sectionTitle}>Everything you need</Text>
        <View style={styles.featureGrid}>
          {FEATURES.map((f, i) => (
            <Animated.View
              key={i}
              style={[
                styles.featureCard,
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
              ]}
            >
              <LinearGradient colors={f.gradient} style={styles.featureIcon}>
                <MaterialCommunityIcons name={f.icon} size={22} color="#fff" />
              </LinearGradient>
              <Text style={styles.featureLabel}>{f.label}</Text>
              <Text style={styles.featureSub}>{f.sub}</Text>
            </Animated.View>
          ))}
        </View>

        {/* Social proof */}
        <View style={styles.proofCard}>
          <View style={styles.proofAvatars}>
            {['A', 'R', 'S', 'M', 'K'].map((l, i) => (
              <LinearGradient
                key={i}
                colors={['#0D9488', '#0891B2']}
                style={[styles.proofAvatar, { marginLeft: i === 0 ? 0 : -10, zIndex: 5 - i }]}
              >
                <Text style={styles.proofAvatarText}>{l}</Text>
              </LinearGradient>
            ))}
          </View>
          <Text style={styles.proofText}>
            <Text style={styles.proofBold}>14,200+ people</Text> trust PrescribePal with their prescriptions
          </Text>
          <View style={styles.proofStars}>
            {[1, 2, 3, 4, 5].map(i => (
              <Ionicons key={i} name="star" size={14} color={COLORS.gold} />
            ))}
            <Text style={styles.proofRating}>4.9</Text>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Fixed Footer CTAs */}
      <View style={styles.footer}>
        <LinearGradient colors={['rgba(247,255,253,0)', 'rgba(247,255,253,1)']} style={styles.footerFade} pointerEvents="none" />
        <View style={styles.footerButtons}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity onPress={() => navigate('ONBOARDING')} activeOpacity={0.88}>
              <LinearGradient colors={['#0D9488', '#0891B2']} style={styles.primaryBtn}>
                <Text style={styles.primaryBtnText}>Get Started — It's Free</Text>
                <Feather name="arrow-right" size={18} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigate('LOGIN')}>
            <Text style={styles.secondaryBtnText}>I already have an account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Hero
  hero: { paddingBottom: 28, position: 'relative', overflow: 'hidden' },
  bgCircle1: {
    position: 'absolute', width: 280, height: 280, borderRadius: 140,
    backgroundColor: 'rgba(13,148,136,0.08)', top: -80, right: -80,
  },
  bgCircle2: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(124,58,237,0.06)', bottom: 40, left: -60,
  },
  bgCircle3: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(20,184,166,0.1)', top: 100, left: '40%',
  },

  nav: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  logoText: { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  freeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  freeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#34D399' },
  freeBadgeText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },

  heroIllustration: { alignItems: 'center', paddingVertical: 24, position: 'relative' },
  heroRingOuter: {
    width: 160, height: 160, borderRadius: 80,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  heroRingInner: {
    width: 120, height: 120, borderRadius: 60,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(13,148,136,0.12)',
  },
  heroIconBox: { width: 88, height: 88, borderRadius: 44, justifyContent: 'center', alignItems: 'center' },
  orbit: { position: 'absolute' },
  orbit1: { top: 10, right: 20 },
  orbit2: { bottom: 10, right: 30 },
  orbit3: { top: 30, left: 10 },
  orbitDot: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },

  heroText: { paddingHorizontal: 24, alignItems: 'center', gap: 12 },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(13,148,136,0.2)', paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(94,234,212,0.3)',
  },
  heroBadgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#5EEAD4' },
  heroBadgeLabel: { fontSize: 12, fontWeight: '600', color: '#5EEAD4' },
  headline: {
    fontSize: 38, fontWeight: '900', color: '#fff', textAlign: 'center',
    lineHeight: 46, letterSpacing: -1,
  },
  subheadline: {
    fontSize: 15, color: 'rgba(255,255,255,0.6)', textAlign: 'center',
    lineHeight: 24, paddingHorizontal: 8,
  },

  statsRow: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    marginHorizontal: 24, marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 16,
    paddingVertical: 16, paddingHorizontal: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  statLabel: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.15)' },

  // Content
  content: { flex: 1, backgroundColor: COLORS.background },
  contentInner: { padding: 24, paddingTop: 28 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 16 },

  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  featureCard: {
    width: (width - 60) / 2, backgroundColor: COLORS.white, borderRadius: 18,
    padding: 16, gap: 10, borderWidth: 1, borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  featureIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  featureLabel: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, lineHeight: 20 },
  featureSub: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17 },

  proofCard: {
    backgroundColor: COLORS.white, borderRadius: 18, padding: 20,
    gap: 12, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  proofAvatars: { flexDirection: 'row' },
  proofAvatar: {
    width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff',
  },
  proofAvatarText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  proofText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 21 },
  proofBold: { fontWeight: '700', color: COLORS.textPrimary },
  proofStars: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  proofRating: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, marginLeft: 4 },

  // Footer
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  footerFade: { height: 40, marginBottom: -1 },
  footerButtons: {
    backgroundColor: COLORS.background, paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24, paddingTop: 12, gap: 10,
  },
  primaryBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10,
    paddingVertical: 17, borderRadius: 16,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  secondaryBtn: { alignItems: 'center', paddingVertical: 12 },
  secondaryBtnText: { color: COLORS.textSecondary, fontSize: 15, fontWeight: '600' },
});
