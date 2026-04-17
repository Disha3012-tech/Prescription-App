import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, Animated, StatusBar, Dimensions, Platform, PanResponder
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

<<<<<<< HEAD
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
    label: 'Medicine Tracker',
    sub: 'Never miss a dose again',
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

// const STATS = [
//   { value: '14K+', label: 'Prescriptions' },
//   { value: '98%', label: 'Accuracy' },
//   { value: '60+', label: 'Countries' },
// ];

export default function LandingScreen({ navigate }) {
=======
// THEME: "Obsidian Health & Liquid Mint"
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

const BackgroundShapes = ({ mouseX, mouseY }) => {
>>>>>>> af8ded5 (modified landingscreen,onboarding,login and signup screens)
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 6000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 6000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const floatX = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [-30, 30] });
  const floatY = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [20, -20] });

  const topTransform = {
    transform: [
      { translateX: Animated.add(Animated.divide(mouseX, 20), floatX) },
      { translateY: Animated.add(Animated.divide(mouseY, 20), floatY) },
      { scale: floatAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] }) }
    ]
  };

  const bottomTransform = {
    transform: [
      { translateX: Animated.add(Animated.multiply(Animated.divide(mouseX, 15), -1), Animated.multiply(floatX, -0.5)) },
      { translateY: Animated.add(Animated.multiply(Animated.divide(mouseY, 15), -1), Animated.multiply(floatY, -0.5)) }
    ]
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[styles.bgGlowTop, topTransform]}>
        <LinearGradient colors={[THEME.accent, 'transparent']} style={{ flex: 1, borderRadius: 1000 }} />
      </Animated.View>
      
      <Animated.View style={[styles.bgGlowBottom, bottomTransform]}>
        <LinearGradient colors={['transparent', THEME.primary]} style={{ flex: 1, borderRadius: 1000 }} />
      </Animated.View>
    </View>
  );
};

export default function LandingScreen({ navigate }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const mouseX = useRef(new Animated.Value(0)).current;
  const mouseY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 15, friction: 9, useNativeDriver: true }),
    ]).start();
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        mouseX.setValue(gestureState.moveX - width / 2);
        mouseY.setValue(gestureState.moveY - height / 2);
      },
      onPanResponderRelease: () => {
        Animated.spring(mouseX, { toValue: 0, useNativeDriver: true, friction: 10 }).start();
        Animated.spring(mouseY, { toValue: 0, useNativeDriver: true, friction: 10 }).start();
      },
    })
  ).current;

  const InfrastructureTile = ({ icon, title, value, unit }) => {
    const [isPressed, setIsPressed] = useState(false);
    const scale = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
      setIsPressed(true);
      Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start();
    };

    const handlePressOut = () => {
      setIsPressed(false);
      Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
    };

    return (
      <Animated.View style={[styles.tileWrapper, { transform: [{ scale }] }]}>
        <TouchableOpacity
          activeOpacity={1}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[
            styles.tile,
            isPressed && { backgroundColor: THEME.primary, borderColor: THEME.primary }
          ]}
        >
          <View style={[styles.tileIcon, isPressed && { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
            <MaterialCommunityIcons 
              name={icon} 
              size={22} 
              color={isPressed ? THEME.accent : THEME.accent} 
            />
          </View>
          <View style={styles.tileData}>
            <Text style={[styles.tileValue, isPressed && { color: '#FFF' }]}>{value}</Text>
            <Text style={[styles.tileUnit, isPressed && { color: THEME.accent }]}>{unit}</Text>
          </View>
          <Text style={[styles.tileTitle, isPressed && { color: 'rgba(255,255,255,0.6)' }]}>{title}</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" transparent backgroundColor="transparent" />
      
      <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers}>
        <BackgroundShapes mouseX={mouseX} mouseY={mouseY} />
      </View>

      <View style={styles.header}>
        <View style={styles.brandCont}>
          <View style={styles.brandBox} />
          <Text style={styles.brandText}>PATH-MED</Text>
        </View>
        <TouchableOpacity style={styles.statusPill} onPress={() => navigate('LOGIN')}>
          <View style={styles.pulse} />
          <Text style={styles.statusText}>VERIFIED: 2026</Text>
        </TouchableOpacity>
      </View>

      <Animated.ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        pointerEvents="box-none"
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          
          <View style={styles.heroSection}>
            <Text style={styles.preTitle}>BIO-METRIC PROTOCOLS</Text>
            <Text style={styles.mainTitle}>Quantified{'\n'}Care <Text style={{ color: THEME.accent }}>Logic.</Text></Text>
            <Text style={styles.mainSub}>Deploying aerospace-grade AI to synchronize medication cycles and eliminate toxic interactions.</Text>
          </View>

          <Text style={styles.sectionLabel}>CORE INFRASTRUCTURE</Text>
          <View style={styles.bentoGrid}>
            <View style={styles.bentoRow}>
              <InfrastructureTile icon="shield-check" title="Interaction Safety" value="100" unit="%" />
              <InfrastructureTile icon="eye-refresh" title="Scan Precision" value="99.8" unit="ACC" />
            </View>
            <View style={styles.bentoRow}>
              <InfrastructureTile icon="dna" title="Bio-Markers" value="Active" unit="STATUS" />
              <InfrastructureTile icon="currency-indian" title="Cost Efficiency" value="42" unit="% SAV" />
            </View>
          </View>

<<<<<<< HEAD
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

        {/* Stats
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
        </Animated.View>*/}
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
        {/* <View style={styles.proofCard}>
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
          </View> */}
        {/* <Text style={styles.proofText}>
            <Text style={styles.proofBold}>14,200+ people</Text> trust PrescribePal with their prescriptions
          </Text> */}
        {/* <View style={styles.proofStars}>
            {[1, 2, 3, 4, 5].map(i => (
              <Ionicons key={i} name="star" size={14} color={COLORS.gold} />
            ))}
            <Text style={styles.proofRating}>4.9</Text>
          </View> */}
        {/* </View> */}

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
=======
          <TouchableOpacity activeOpacity={0.9} style={styles.actionCard} onPress={() => navigate('ONBOARDING')}>
            <LinearGradient colors={[THEME.primary, '#152A24']} style={styles.actionGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <View style={styles.actionMeta}>
                <Text style={styles.actionKicker}>SYSTEM ENGINE V2.4</Text>
                <Text style={styles.actionTitle}>Initialize Neural Scan</Text>
                <Text style={styles.actionDesc}>Upload RX labels for real-time molecular audit and scheduling.</Text>
              </View>
              <View style={styles.actionFooter}>
                <View style={styles.actionBtn}>
                  <Text style={styles.actionBtnText}>START PROTOCOL</Text>
                  <Feather name="chevron-right" size={16} color={THEME.primary} />
                </View>
                <MaterialCommunityIcons name="molecule" size={80} color="rgba(16, 185, 129, 0.1)" style={styles.bgIcon} />
              </View>
            </LinearGradient>
>>>>>>> af8ded5 (modified landingscreen,onboarding,login and signup screens)
          </TouchableOpacity>

          <View style={styles.protocolList}>
            <Text style={styles.sectionLabel}>OPERATIONAL PIPELINE</Text>
            {[
              { id: '01', t: 'Data Ingestion', d: 'OCR engine decodes handwritten scripts.' },
              { id: '02', t: 'Risk Synthesis', d: 'Automated auditing against HIPAA safety standards.' },
              { id: '03', t: 'Cycle Execution', d: 'Smart-logic reminders aligned to your metabolic window.' },
            ].map((item, idx) => (
              <View key={idx} style={styles.protocolRow}>
                <Text style={styles.protocolId}>{item.id}</Text>
                <View style={styles.protocolText}>
                  <Text style={styles.protocolTitle}>{item.t}</Text>
                  <Text style={styles.protocolDesc}>{item.d}</Text>
                </View>
              </View>
            ))}
          </View>

        </Animated.View>
        <View style={{ height: 140 }} />
      </Animated.ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerBtn} activeOpacity={0.8} onPress={() => navigate('ONBOARDING')}>
          <Text style={styles.footerBtnText}>INITIALIZE INTERFACE</Text>
        </TouchableOpacity>
        <Text style={styles.footerTag}>SECURE END-TO-END ENCRYPTION ACTIVE</Text>
      </View>
    </SafeAreaView >
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  bgGlowTop: { position: 'absolute', top: -height * 0.15, right: -width * 0.2, width: width, height: width, opacity: 0.1 },
  bgGlowBottom: { position: 'absolute', bottom: -height * 0.2, left: -width * 0.2, width: width * 1.2, height: width * 1.2, opacity: 0.08 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 20, zIndex: 10 },
  brandCont: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandBox: { width: 14, height: 14, backgroundColor: THEME.primary, borderRadius: 3, transform: [{rotate: '45deg'}] },
  brandText: { fontSize: 13, fontWeight: '900', letterSpacing: 4, color: THEME.primary },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: THEME.accentLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  pulse: { width: 6, height: 6, borderRadius: 3, backgroundColor: THEME.accent },
  statusText: { fontSize: 9, fontWeight: '900', color: THEME.primary, letterSpacing: 1 },
  scrollContent: { paddingHorizontal: 24 },
  heroSection: { marginTop: 30, marginBottom: 40 },
  preTitle: { color: THEME.accent, fontSize: 10, fontWeight: '900', letterSpacing: 3, marginBottom: 12 },
  mainTitle: { fontSize: 46, fontWeight: '800', color: THEME.primary, lineHeight: 52, letterSpacing: -2 },
  mainSub: { fontSize: 16, color: THEME.textMuted, lineHeight: 24, marginTop: 15 },
  sectionLabel: { fontSize: 10, fontWeight: '900', color: THEME.textMuted, letterSpacing: 3, marginBottom: 20 },
  bentoGrid: { gap: 12, marginBottom: 40 },
  bentoRow: { flexDirection: 'row', gap: 12 },
  tileWrapper: { flex: 1 },
  tile: { backgroundColor: THEME.surface, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: THEME.border, minHeight: 140, transition: 'all 0.3s ease' },
  tileIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: THEME.background, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  tileData: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  tileValue: { fontSize: 24, fontWeight: '800', color: THEME.primary },
  tileUnit: { fontSize: 10, fontWeight: '800', color: THEME.textMuted },
  tileTitle: { fontSize: 12, fontWeight: '700', color: THEME.textMuted, marginTop: 4 },
  actionCard: { borderRadius: 32, overflow: 'hidden', marginBottom: 40 },
  actionGradient: { padding: 32, minHeight: 280, justifyContent: 'space-between' },
  actionKicker: { color: THEME.accent, fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  actionTitle: { color: '#FFF', fontSize: 32, fontWeight: '800', letterSpacing: -1, marginTop: 10 },
  actionDesc: { color: 'rgba(255,255,255,0.5)', fontSize: 15, lineHeight: 22, marginTop: 10 },
  actionFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  actionBtn: { backgroundColor: THEME.accent, paddingHorizontal: 22, paddingVertical: 14, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionBtnText: { color: THEME.primary, fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  bgIcon: { position: 'absolute', right: -20, bottom: -20 },
  protocolList: { marginBottom: 40 },
  protocolRow: { flexDirection: 'row', gap: 20, marginBottom: 30 },
  protocolId: { fontSize: 12, fontWeight: '900', color: THEME.accent, marginTop: 4 },
  protocolText: { flex: 1 },
  protocolTitle: { fontSize: 18, fontWeight: '800', color: THEME.primary, marginBottom: 5 },
  protocolDesc: { fontSize: 14, color: THEME.textMuted, lineHeight: 20 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(249, 251, 249, 0.95)', paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 25, paddingTop: 20, borderTopWidth: 1, borderTopColor: THEME.border },
  footerBtn: { backgroundColor: THEME.primary, paddingVertical: 22, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: THEME.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20 },
  footerBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  footerTag: { textAlign: 'center', fontSize: 9, color: THEME.textMuted, marginTop: 16, fontWeight: '800', letterSpacing: 1 },
});