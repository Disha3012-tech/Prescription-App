import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, Animated, StatusBar, Platform, PanResponder, useWindowDimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';

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
  cardShadow: '#0D948820',
};

/* ─── Background Glows ─── */
const BackgroundShapes = ({ mouseX, mouseY, windowWidth }) => {
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
      <Animated.View style={[styles.bgGlowTop, { width: windowWidth, height: windowWidth },
      { transform: [{ translateX: Animated.add(Animated.divide(mouseX, 25), floatX) }, { translateY: Animated.add(Animated.divide(mouseY, 25), floatY) }] }]}>
        <LinearGradient colors={['#5EEAD4', 'transparent']} style={{ flex: 1, borderRadius: 9999 }} />
      </Animated.View>
      <Animated.View style={[styles.bgGlowBottom, { width: windowWidth * 1.3, height: windowWidth * 1.3 },
      { transform: [{ translateX: Animated.add(Animated.multiply(Animated.divide(mouseX, 20), -1), Animated.multiply(floatX, -0.6)) }, { translateY: Animated.add(Animated.multiply(Animated.divide(mouseY, 20), -1), Animated.multiply(floatY, -0.6)) }] }]}>
        <LinearGradient colors={['transparent', '#BAE6FD80']} style={{ flex: 1, borderRadius: 9999 }} />
      </Animated.View>
      {/* Extra decorative orb */}
      <Animated.View style={[styles.bgGlowMid, { width: windowWidth * 0.6, height: windowWidth * 0.6 },
      { transform: [{ translateX: Animated.multiply(floatY, 0.4) }, { translateY: Animated.multiply(floatX, -0.3) }] }]}>
        <LinearGradient colors={['#0EA5E920', 'transparent']} style={{ flex: 1, borderRadius: 9999 }} />
      </Animated.View>
    </View>
  );
};

/* ─── Stat Tile ─── */
const StatTile = ({ icon, title, value, unit, isTablet, accentColor }) => {
  const [hovered, setHovered] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;
  const onIn = () => { setHovered(true); Animated.spring(scale, { toValue: 1.04, useNativeDriver: true }).start(); };
  const onOut = () => { setHovered(false); Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }).start(); };
  const color = accentColor || THEME.accent;

  return (
    <Animated.View style={[styles.tileWrapper, { transform: [{ scale }] }]} onMouseEnter={onIn} onMouseLeave={onOut}>
      <TouchableOpacity activeOpacity={0.92} style={[styles.tile, isTablet && styles.tileTablet, hovered && styles.tileHovered]}>
        {/* Top colored bar */}
        <LinearGradient colors={[color + '30', color + '08']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.tileTopBar} />
        <View style={styles.tileHeader}>
          <LinearGradient colors={[color + '25', color + '10']} style={styles.tileIconWrap}>
            <MaterialCommunityIcons name={icon} size={isTablet ? 24 : 20} color={color} />
          </LinearGradient>
          <MaterialCommunityIcons name="arrow-top-right" size={15} color={hovered ? color : THEME.border} style={{ opacity: hovered ? 1 : 0.4 }} />
        </View>
        <View style={styles.tileContent}>
          <View style={styles.tileData}>
            <Text style={[styles.tileValue, { fontSize: isTablet ? 30 : 24, color: THEME.primaryDark }]}>{value}</Text>
            <Text style={[styles.tileUnit, { color }]}>{unit}</Text>
          </View>
          <Text style={[styles.tileTitle, { fontSize: isTablet ? 13 : 11 }]}>{title}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

/* ─── Pipeline Card (Phone) ─── */
const PhonePipelineCard = ({ item, idx, total }) => {
  const isLast = idx === total - 1;
  const gradColors = [
    ['#0D9488', '#0EA5E9'],
    ['#0EA5E9', '#06B6D4'],
    ['#0D9488', '#14B8A6'],
    ['#0F766E', '#0D9488'],
    ['#0EA5E9', '#0D9488'],
  ];
  const [g1, g2] = gradColors[idx % gradColors.length];

  return (
    <View style={styles.phonePipeRow}>
      {/* Timeline */}
      <View style={styles.phonePipeRail}>
        <LinearGradient colors={[g1, g2]} style={styles.phonePipeDot} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Text style={styles.phonePipeDotNum}>{idx + 1}</Text>
        </LinearGradient>
        {!isLast && <View style={styles.phonePipeLine} />}
      </View>

      {/* Card */}
      <View style={[styles.phonePipeCard, isLast && { marginBottom: 0 }]}>
        {/* Big watermark number */}
        <Text style={styles.phonePipeWatermark}>{item.id}</Text>
        <View style={styles.phonePipeCardTop}>
          <LinearGradient colors={[g1, g2]} style={styles.phonePipeIconBadge} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <MaterialCommunityIcons name={item.icon} size={15} color="#FFF" />
          </LinearGradient>
          <Text style={[styles.phonePipeIdLabel, { color: g1 }]}>{item.id}</Text>
        </View>
        <Text style={styles.phonePipeTitle}>{item.t}</Text>
        <Text style={styles.phonePipeDesc}>{item.d}</Text>
      </View>
    </View>
  );
};

/* ─── Pipeline Card (Tablet/Laptop) ─── */
const TabletPipelineCard = ({ item, idx, isFull, isLaptop }) => {
  const [hovered, setHovered] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;
  const onIn = () => { setHovered(true); Animated.spring(scale, { toValue: 1.02, useNativeDriver: true }).start(); };
  const onOut = () => { setHovered(false); Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }).start(); };

  const gradColors = [
    ['#0D9488', '#0EA5E9'],
    ['#0EA5E9', '#06B6D4'],
    ['#0D9488', '#14B8A6'],
    ['#0F766E', '#0D9488'],
    ['#0EA5E9', '#0D9488'],
  ];
  const [g1, g2] = gradColors[idx % gradColors.length];

  return (
    <Animated.View
      style={[styles.tabPipeCard, isFull && styles.tabPipeCardFull, isLaptop && styles.tabPipeCardLaptop,
      hovered && styles.tabPipeCardHovered, { transform: [{ scale }] }]}
      onMouseEnter={onIn} onMouseLeave={onOut}
    >
      {/* Left gradient accent bar */}
      <LinearGradient colors={[g1, g2]} style={styles.tabPipeAccentBar} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />

      {/* Content */}
      <View style={styles.tabPipeContent}>
        {/* Step badge + number */}
        <View style={styles.tabPipeTopRow}>
          <LinearGradient colors={[g1 + '20', g2 + '10']} style={styles.tabPipeIconWrap}>
            <MaterialCommunityIcons name={item.icon} size={isLaptop ? 20 : 18} color={g1} />
          </LinearGradient>
          {/* Watermark big number */}
          <Text style={[styles.tabPipeWaterNum, { color: g1 + '12' }]}>{item.id}</Text>
        </View>
        <Text style={[styles.tabPipeStepLabel, { color: g1 }]}>{item.id}</Text>
        <Text style={[styles.tabPipeTitle, isLaptop && { fontSize: 19 }]}>{item.t}</Text>
        <Text style={[styles.tabPipeDesc, isLaptop && { fontSize: 14 }]}>{item.d}</Text>
        {/* Bottom chip */}
        <LinearGradient colors={[g1 + '18', g2 + '10']} style={styles.tabPipeChip} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <View style={[styles.tabPipeChipDot, { backgroundColor: g1 }]} />
          <Text style={[styles.tabPipeChipText, { color: g1 }]}>Stage {idx + 1} of 5</Text>
        </LinearGradient>
      </View>
    </Animated.View>
  );
};

/* ─── Main Screen ─── */
export default function LandingScreen({ navigate }) {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768;
  const isLaptop = width >= 1024;
  const contentMaxWidth = 1100;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const mouseX = useRef(new Animated.Value(0)).current;
  const mouseY = useRef(new Animated.Value(0)).current;
  const screenDims = useRef({ width, height });
  useEffect(() => { screenDims.current = { width, height }; }, [width, height]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 18, friction: 9, useNativeDriver: true }),
    ]).start();
  }, []);
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
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

  const pipelineData = [
    { id: '01', t: 'Intelligent Data Ingestion', d: 'Hybrid OCR and vision models decode handwritten prescriptions with confidence scoring and duplicate detection.', icon: 'file-document-edit-outline' },
    { id: '02', t: 'Adaptive Extraction Engine', d: 'Based on input quality, the system dynamically switches between OCR and vision AI to ensure accurate data capture.', icon: 'swap-horizontal-bold' },
    { id: '03', t: 'AI Structuring & Correction', d: 'Medicines are identified, OCR errors are corrected, and key details like dosage, frequency, and duration are structured.', icon: 'text-recognition' },
    { id: '04', t: 'Safety & Risk Analysis', d: 'Drug interactions, side effects, and potential risks are evaluated using clinical data and AI reasoning.', icon: 'shield-alert-outline' },
    { id: '05', t: 'Personalized Medication Intelligence', d: 'Clear explanations, optimized schedules, and cost-effective alternatives are generated for the user.', icon: 'brain' },
  ];

  const tileColors = [THEME.primary, THEME.accent, '#14B8A6', '#6366F1'];

  return (
    <LinearGradient colors={THEME.background} style={styles.container}>
      <StatusBar barStyle="dark-content" transparent backgroundColor="transparent" />

      <View style={StyleSheet.absoluteFill} {...pan.panHandlers}>
        <BackgroundShapes mouseX={mouseX} mouseY={mouseY} windowWidth={width} windowHeight={height} />
      </View>

      <SafeAreaView style={styles.safeArea}>
        {/* ── Header ── */}
        <View style={{ alignItems: 'center', width: '100%' }}>
          <View style={[styles.header, { maxWidth: contentMaxWidth, width: '100%' }]}>
            <View style={styles.brandCont}>
              <LinearGradient colors={[THEME.primary, THEME.accent]} style={styles.logoGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <MaterialCommunityIcons name="pill" size={16} color="#FFF" />
              </LinearGradient>
              <View>
                <Text style={styles.brandText}>AiLyze</Text>
                <Text style={styles.brandSub}>AI</Text>
              </View>
            </View>
            
              <LinearGradient colors={[THEME.primary + '20', THEME.accent + '15']} style={styles.statusPillInner}>
                <View style={styles.pulse} />
                <Text style={styles.statusText}>VERIFIED: 2026</Text>
              </LinearGradient>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 220, alignItems: 'center' }}
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
        >
          <View style={[styles.scrollContent, { maxWidth: contentMaxWidth, width: '100%' }]}>
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

              {/* ── Hero Section ── */}
              <View style={[styles.heroSection, isLaptop && styles.heroSectionLaptop]}>
                {/* Pill badge */}
                <View style={[styles.heroBadgeRow, isLaptop && { justifyContent: 'center' }]}>
                  <LinearGradient colors={[THEME.primary + '20', THEME.accent + '15']} style={styles.heroBadge} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    <View style={styles.heroBadgeDot} />
                    <Text style={styles.heroBadgeText}>AI-POWERED PRESCRIPTION INTELLIGENCE</Text>
                  </LinearGradient>
                </View>

                {/* Main headline */}
                <Text style={[styles.heroTitle, isTablet && styles.heroTitleTablet, isLaptop && styles.heroTitleLaptop]}>
                  {isLaptop ? 'Prescriptions, ' : 'Prescriptions,\n'}
                  <Text style={styles.heroTitleAccent}>Decoded{'\n'}</Text>
                  {isLaptop ? 'by AI.' : 'by AI.'}
                </Text>

                {/* Tagline */}
                <Text style={[styles.heroSub, isTablet && styles.heroSubTablet, isLaptop && styles.heroSubLaptop]}>
                  Scan any prescription. Detect drug conflicts.{'\n'}Get personalized schedules — powered by hybrid AI{isTablet ? ' ' : '\n'}that reads what even pharmacists miss.
                </Text>

                {/* Inline trust chips */}
                <View style={[styles.trustRow, isLaptop && { justifyContent: 'center' }]}>
                  {['99.8% Accuracy', 'Zero Interactions Missed', 'Instant Analysis'].map((label, i) => (
                    <View key={i} style={styles.trustChip}>
                      <MaterialCommunityIcons name="check-circle" size={13} color={THEME.primary} />
                      <Text style={styles.trustChipText}>{label}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* ── Stats Grid ── */}
              <Text style={[styles.sectionLabel, isTablet && { fontSize: 12 }]}>CORE INFRASTRUCTURE</Text>
              <View style={[styles.bentoGrid, isTablet && styles.bentoGridTablet]}>
                <View style={[styles.bentoRow, isTablet && { flex: 1 }]}>
                  <StatTile icon="shield-check" title="Interaction Safety" value="100" unit="%" isTablet={isTablet} accentColor={THEME.primary} />
                  <StatTile icon="eye-refresh-outline" title="Scan Precision" value="99.8" unit="ACC" isTablet={isTablet} accentColor={THEME.accent} />
                </View>
                <View style={[styles.bentoRow, isTablet && { flex: 1 }]}>
                  <StatTile icon="dna" title="Bio-Markers" value="Active" unit="STATUS" isTablet={isTablet} accentColor="#14B8A6" />
                  <StatTile icon="currency-inr" title="Cost Efficiency" value="42" unit="% SAV" isTablet={isTablet} accentColor="#6366F1" />
                </View>
              </View>

              {/* ── CTA Card ── */}
              <TouchableOpacity activeOpacity={0.9} style={styles.ctaWrapper} onPress={() => navigate && navigate('ONBOARDING')}>
                <LinearGradient colors={['#042F2E', '#064E3B', '#0C1A3A']} style={[styles.ctaGradient, isTablet && styles.ctaGradientTablet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  {/* Decorative circles */}
                  <View style={styles.ctaCircle1} />
                  <View style={styles.ctaCircle2} />

                  <View style={[styles.ctaMeta, isTablet && { maxWidth: '72%' }]}>
                    <LinearGradient colors={[THEME.primaryLight + '30', THEME.accent + '20']} style={styles.ctaKickerBadge} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                      <Text style={[styles.ctaKicker, isTablet && { fontSize: 11 }]}>SYSTEM ENGINE V2.4</Text>
                    </LinearGradient>
                    <Text style={[styles.ctaTitle, isTablet && { fontSize: 38 }]}>Initialize{'\n'}Neural Scan</Text>
                    <Text style={[styles.ctaDesc, isTablet && { fontSize: 16, lineHeight: 26 }]}>
                      Upload RX labels for real-time molecular audit and intelligent scheduling protocols.
                    </Text>
                  </View>

                  <View style={styles.ctaFooter}>
                    <LinearGradient colors={[THEME.primary, THEME.accent]} style={styles.ctaBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                      <Text style={[styles.ctaBtnText, isTablet && { fontSize: 13 }]}>START PROTOCOL</Text>
                      <Feather name="arrow-right" size={isTablet ? 17 : 14} color="#FFF" />
                    </LinearGradient>
                    <MaterialCommunityIcons name="molecule" size={isTablet ? 140 : 100} color="rgba(255,255,255,0.04)" style={styles.ctaBgIcon} />
                  </View>
                </LinearGradient>
              </TouchableOpacity>

              {/* ── Operational Pipeline ── */}
              <View style={styles.pipelineSection}>
                {/* Section header with decorative line */}
                <View style={styles.pipelineHeaderRow}>
                  <View style={styles.pipelineHeaderLeft}>
                    <Text style={[styles.sectionLabel, { marginBottom: 6, marginTop: 0 }]}>OPERATIONAL PIPELINE</Text>
                    <Text style={[styles.pipelineSectionTitle, isTablet && { fontSize: isLaptop ? 32 : 26 }]}>
                      How AiLyze{'\n'}processes your Rx
                    </Text>
                    <Text style={[styles.pipelineSubtitle, isTablet && { fontSize: 15 }]}>
                      Five intelligent stages — from raw scan to personalized care.
                    </Text>
                  </View>
                  {/* Decorative badge on tablet */}
                  {isTablet && (
                    <LinearGradient colors={[THEME.primary + '15', THEME.accent + '10']} style={styles.pipelineHeaderBadge} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                      <MaterialCommunityIcons name="lightning-bolt" size={28} color={THEME.primary} />
                      <Text style={styles.pipelineHeaderBadgeNum}>5</Text>
                      <Text style={styles.pipelineHeaderBadgeLabel}>Stages</Text>
                    </LinearGradient>
                  )}
                </View>

                {/* Horizontal progress bar */}
                <View style={styles.pipelineProgressBar}>
                  <LinearGradient colors={[THEME.primary, THEME.accent, THEME.primary]} style={styles.pipelineProgressFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
                </View>

                {/* Cards */}
                {!isTablet ? (
                  <View style={{ marginTop: 24 }}>
                    {pipelineData.map((item, idx) => (
                      <PhonePipelineCard key={idx} item={item} idx={idx} total={pipelineData.length} />
                    ))}
                  </View>
                ) : (
                  <View style={[styles.tabPipeGrid, isLaptop && { gap: 20 }]}>
                    {pipelineData.map((item, idx) => {
                      const isOdd = pipelineData.length % 2 !== 0;
                      const isFull = isOdd && idx === pipelineData.length - 1;
                      return (
                        <TabletPipelineCard key={idx} item={item} idx={idx} isFull={isFull} isLaptop={isLaptop} />
                      );
                    })}
                  </View>
                )}
              </View>

            </Animated.View>
            <View style={{ height: 170 }} />
          </View>
        </ScrollView>

        {/* ── Footer ── */}
        <View style={styles.footerContainer}>
          <LinearGradient colors={['rgba(240,253,250,0)', 'rgba(240,253,250,0.97)', '#F0FDFA']} style={styles.footerFade} pointerEvents="none" />
          <View style={[styles.footerInner, { maxWidth: contentMaxWidth, width: '100%' }]}>
            <TouchableOpacity style={styles.footerBtn} activeOpacity={0.85} onPress={() => navigate && navigate('ONBOARDING')}>
              <LinearGradient colors={[THEME.primary, THEME.primaryDark, '#064E3B']} style={[styles.footerBtnGrad, isTablet && { paddingVertical: 22 }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <MaterialCommunityIcons name="pill" size={18} color="rgba(255,255,255,0.6)" style={{ marginRight: 10 }} />
                <Text style={[styles.footerBtnText, isTablet && { fontSize: 15 }]}>INITIALIZE INTERFACE</Text>
                <Feather name="arrow-right" size={16} color="rgba(255,255,255,0.7)" style={{ marginLeft: 10 }} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

/* ─────────── STYLES ─────────── */
const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },

  /* Background */
  bgGlowTop: { position: 'absolute', top: '-20%', right: '-15%', opacity: 0.4 },
  bgGlowBottom: { position: 'absolute', bottom: '-20%', left: '-25%', opacity: 0.3 },
  bgGlowMid: { position: 'absolute', top: '35%', right: '5%', opacity: 0.5 },

  /* Header */
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 44 : 16, paddingBottom: 16, zIndex: 10 },
  brandCont: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoGrad: { width: 36, height: 36, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  brandText: { fontSize: 15, fontWeight: '900', letterSpacing: 3, color: THEME.primaryDark, lineHeight: 18 },
  brandSub: { fontSize: 9, fontWeight: '800', letterSpacing: 4, color: THEME.accent, lineHeight: 12 },
  statusPill: { borderRadius: 30, overflow: 'hidden', },
  statusPillInner: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 30 },
  pulse: { width: 7, height: 7, borderRadius: 4, backgroundColor: THEME.accent },
  statusText: { fontSize: 10, fontWeight: '800', color: THEME.primaryDark, letterSpacing: 1, },

  /* Scroll */
  scrollContent: { paddingHorizontal: 16, paddingTop: 4, alignItems: 'center' },

  /* Hero */
  heroSection: { marginTop: 20, marginBottom: 40, alignItems: 'center' },
  heroSectionLaptop: { marginTop: 60, marginBottom: 60, alignItems: 'center' },
  heroBadgeRow: { flexDirection: 'row', marginBottom: 18, justifyContent: 'center' },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 30 },
  heroBadgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: THEME.primary },
  heroBadgeText: { fontSize: 10, fontWeight: '900', color: THEME.primary, letterSpacing: 2.5 },
  heroTitle: { fontSize: 42, fontWeight: '900', color: THEME.primaryDark, lineHeight: 50, letterSpacing: -2, textAlign: 'center' },
  heroTitleTablet: { fontSize: 58, lineHeight: 68 },
  heroTitleLaptop: { fontSize: 76, lineHeight: 88, textAlign: 'center' },
  heroTitleAccent: { color: THEME.accent },
  heroSub: { fontSize: 15, color: THEME.textMuted, lineHeight: 25, marginTop: 16, fontWeight: '500', textAlign: 'center' },
  heroSubTablet: { fontSize: 17, lineHeight: 28 },
  heroSubLaptop: { fontSize: 18, lineHeight: 30, textAlign: 'center', maxWidth: 580 },
  trustRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 22, justifyContent: 'center' },
  trustChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: THEME.tealLight, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 20 },
  trustChipText: { fontSize: 12, fontWeight: '700', color: THEME.primaryDark },

  /* Section label */
  sectionLabel: { fontSize: 11, fontWeight: '800', color: THEME.textMuted, letterSpacing: 3, marginBottom: 16, marginTop: 6 },

  /* Stat Tiles */
  bentoGrid: { gap: 12, marginBottom: 36 },
  bentoGridTablet: { flexDirection: 'row' },
  bentoRow: { flexDirection: 'row', gap: 12 },
  tileWrapper: { flex: 1 },
  tile: { backgroundColor: THEME.surface, borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: THEME.border, minHeight: 140, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 3, justifyContent: 'space-between' },
  tileHovered: { borderColor: THEME.primaryLight, shadowOpacity: 0.12, shadowRadius: 20, elevation: 10 },
  tileTablet: { minHeight: 165 },
  tileTopBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 56 },
  tileHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 16, paddingBottom: 0 },
  tileIconWrap: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  tileContent: { padding: 16, paddingTop: 10 },
  tileData: { flexDirection: 'row', alignItems: 'baseline', gap: 5 },
  tileValue: { fontWeight: '900' },
  tileUnit: { fontSize: 11, fontWeight: '800' },
  tileTitle: { fontWeight: '600', color: THEME.textMuted, marginTop: 4 },

  /* CTA Card */
  ctaWrapper: { marginBottom: 48, borderRadius: 30, overflow: 'hidden', shadowColor: '#042F2E', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.28, shadowRadius: 32, elevation: 16 },
  ctaGradient: { borderRadius: 30, padding: 30, minHeight: 270, justifyContent: 'space-between', overflow: 'hidden' },
  ctaGradientTablet: { padding: 44, minHeight: 300 },
  ctaCircle1: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: THEME.primary + '08', top: -60, right: 60 },
  ctaCircle2: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: THEME.accent + '08', bottom: 20, right: -30 },
  ctaMeta: { zIndex: 2 },
  ctaKickerBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginBottom: 14 },
  ctaKicker: { color: THEME.primaryLight, fontSize: 10, fontWeight: '900', letterSpacing: 2.5 },
  ctaTitle: { color: '#FFF', fontSize: 32, fontWeight: '900', letterSpacing: -1.2, lineHeight: 42 },
  ctaDesc: { color: 'rgba(255,255,255,0.65)', fontSize: 14, lineHeight: 23, marginTop: 12 },
  ctaFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 28, zIndex: 2 },
  ctaBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 22, paddingVertical: 14, borderRadius: 100 },
  ctaBtnText: { color: '#FFF', fontWeight: '900', fontSize: 12, letterSpacing: 1.5 },
  ctaBgIcon: { position: 'absolute', right: -24, bottom: -24 },

  /* Pipeline Section */
  pipelineSection: { marginBottom: 20 },
  pipelineHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  pipelineHeaderLeft: { flex: 1, paddingRight: 16 },
  pipelineSectionTitle: { fontSize: 26, fontWeight: '900', color: THEME.primaryDark, lineHeight: 34, letterSpacing: -0.8, marginBottom: 8 },
  pipelineSubtitle: { fontSize: 14, color: THEME.textMuted, lineHeight: 22, fontWeight: '500' },
  pipelineHeaderBadge: { width: 90, height: 90, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  pipelineHeaderBadgeNum: { fontSize: 28, fontWeight: '900', color: THEME.primaryDark, lineHeight: 32 },
  pipelineHeaderBadgeLabel: { fontSize: 11, fontWeight: '700', color: THEME.textMuted, letterSpacing: 1 },
  pipelineProgressBar: { height: 3, backgroundColor: THEME.border, borderRadius: 4, marginBottom: 4, overflow: 'hidden' },
  pipelineProgressFill: { height: '100%', width: '100%', borderRadius: 4 },

  /* Phone Pipeline */
  phonePipeRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 0 },
  phonePipeRail: { width: 38, alignItems: 'center', paddingTop: 16 },
  phonePipeDot: { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center', zIndex: 2 },
  phonePipeDotNum: { fontSize: 10, fontWeight: '900', color: '#FFF' },
  phonePipeLine: { width: 2, flex: 1, backgroundColor: THEME.border, marginTop: 4, minHeight: 30, zIndex: 1 },
  phonePipeCard: { flex: 1, backgroundColor: THEME.surface, borderRadius: 20, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: THEME.border, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 3, overflow: 'hidden' },
  phonePipeWatermark: { position: 'absolute', right: 12, top: 4, fontSize: 64, fontWeight: '900', color: THEME.primary + '06', lineHeight: 72 },
  phonePipeCardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  phonePipeIconBadge: { width: 30, height: 30, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  phonePipeIdLabel: { fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  phonePipeTitle: { fontSize: 15, fontWeight: '800', color: THEME.primaryDark, marginBottom: 7, lineHeight: 22 },
  phonePipeDesc: { fontSize: 13, color: THEME.textMuted, lineHeight: 20, fontWeight: '500' },

  /* Tablet Pipeline Grid */
  tabPipeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 24 },
  tabPipeCard: { width: '47.5%', backgroundColor: THEME.surface, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: THEME.border, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 14, elevation: 4, flexDirection: 'row' },
  tabPipeCardLaptop: { borderRadius: 26 },
  tabPipeCardFull: { width: '47.5%' },
  tabPipeCardHovered: { shadowOpacity: 0.14, shadowRadius: 24, elevation: 12, borderColor: THEME.primaryLight + '80' },
  tabPipeAccentBar: { width: 5, borderTopLeftRadius: 24, borderBottomLeftRadius: 24 },
  tabPipeContent: { flex: 1, padding: 22, overflow: 'hidden' },
  tabPipeTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  tabPipeIconWrap: { width: 42, height: 42, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  tabPipeWaterNum: { fontSize: 72, fontWeight: '900', lineHeight: 72, position: 'absolute', right: -4, top: -12 },
  tabPipeStepLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5, marginBottom: 8 },
  tabPipeTitle: { fontSize: 17, fontWeight: '800', color: THEME.primaryDark, marginBottom: 8, lineHeight: 24 },
  tabPipeDesc: { fontSize: 13, color: THEME.textMuted, lineHeight: 21, fontWeight: '500', marginBottom: 16 },
  tabPipeChip: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  tabPipeChipDot: { width: 6, height: 6, borderRadius: 3 },
  tabPipeChipText: { fontSize: 11, fontWeight: '700' },

  /* Footer */
  footerContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center' },
  footerFade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 140 },
  footerInner: { paddingHorizontal: 16, paddingBottom: Platform.OS === 'ios' ? 48 : Platform.OS === 'android' ? 37 : 40, paddingTop: 16 },
  footerBtn: { width: '100%', borderRadius: 100, overflow: 'hidden', shadowColor: THEME.primaryDark, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  footerBtnGrad: { width: '100%', paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  footerBtnText: { color: '#FFF', fontSize: 14, fontWeight: '900', letterSpacing: 2.5 },
});
