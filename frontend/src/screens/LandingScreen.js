import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, Animated, StatusBar, Dimensions, Platform, PanResponder
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const THEME = {
  background: ['#F0FDFA', '#E0F2FE', '#F0F9FF'], 
  surface: 'rgba(255, 255, 255, 0.85)',
  primary: '#0D9488', 
  primaryDark: '#0F766E',
  primaryLight: '#5EEAD4',
  accent: '#0EA5E9', 
  accentLight: '#F0F9FF',
  textMain: '#0D1F2D',
  textMuted: '#5A7384',
  border: '#D4EEE9',
};

const BackgroundShapes = ({ mouseX, mouseY }) => {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: 1, duration: 6000, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 6000, useNativeDriver: true }),
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
        <LinearGradient colors={['#99F6E4', 'transparent']} style={{ flex: 1, borderRadius: 1000 }} />
      </Animated.View>
      <Animated.View style={[styles.bgGlowBottom, bottomTransform]}>
        <LinearGradient colors={['transparent', '#BAE6FD']} style={{ flex: 1, borderRadius: 1000 }} />
      </Animated.View>
    </View>
  );
};

const InfrastructureTile = ({ icon, title, value, unit }) => {
  const [isHovered, setIsHovered] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;

  const handleHoverIn = () => {
    setIsHovered(true);
    Animated.spring(scale, { toValue: 1.02, useNativeDriver: true }).start();
  };

  const handleHoverOut = () => {
    setIsHovered(false);
    Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
  };

  return (
    <Animated.View 
      style={[
        styles.tileWrapper, 
        { transform: [{ scale }] }
      ]}
      onMouseEnter={handleHoverIn}
      onMouseLeave={handleHoverOut}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        style={[
          styles.tile,
          isHovered && { 
            borderColor: THEME.primary, 
            shadowColor: THEME.primary,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.3,
            shadowRadius: 15,
            elevation: 10,
            backgroundColor: '#FFFFFF'
          }
        ]}
      >
        <View style={[styles.tileIcon, isHovered && { backgroundColor: THEME.accentLight }]}>
          <MaterialCommunityIcons name={icon} size={22} color={isHovered ? THEME.primary : THEME.accent} />
        </View>
        <View style={styles.tileData}>
          <Text style={[styles.tileValue, { color: THEME.primary }]}>{value}</Text>
          <Text style={[styles.tileUnit, { color: THEME.textMuted }]}>{unit}</Text>
        </View>
        <Text style={[styles.tileTitle, { color: THEME.textMuted }]}>{title}</Text>
      </TouchableOpacity>
    </Animated.View>
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

  return (
    <LinearGradient colors={THEME.background} style={styles.container}>
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

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
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

          <TouchableOpacity activeOpacity={0.9} style={styles.actionCard} onPress={() => navigate('ONBOARDING')}>
            <LinearGradient colors={['#042F2E', '#083344', '#020617']} style={styles.actionGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <View style={styles.actionMeta}>
                <Text style={styles.actionKicker}>SYSTEM ENGINE V2.4</Text>
                <Text style={styles.actionTitle}>Initialize Neural Scan</Text>
                <Text style={styles.actionDesc}>Upload RX labels for real-time molecular audit and scheduling.</Text>
              </View>
              <View style={styles.actionFooter}>
                <View style={[styles.actionBtn, { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)', borderWidth: 1 }]}>
                  <Text style={[styles.actionBtnText, { color: '#FFF' }]}>START PROTOCOL</Text>
                  <Feather name="chevron-right" size={16} color="#FFF" />
                </View>
                <MaterialCommunityIcons name="molecule" size={80} color="rgba(255, 255, 255, 0.1)" style={styles.bgIcon} />
              </View>
            </LinearGradient>
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
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* FIXED FOOTER */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerBtn} activeOpacity={0.8} onPress={() => navigate('ONBOARDING')}>
          <LinearGradient colors={['#0D9488', '#064E3B']} style={styles.footerBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={styles.footerBtnText}>INITIALIZE INTERFACE</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bgGlowTop: { position: 'absolute', top: -height * 0.1, right: -width * 0.1, width: width * 0.9, height: width * 0.9, opacity: 0.4 },
  bgGlowBottom: { position: 'absolute', bottom: -height * 0.1, left: -width * 0.2, width: width * 1.1, height: width * 1.1, opacity: 0.35 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 20, zIndex: 10 },
  brandCont: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandBox: { width: 14, height: 14, backgroundColor: THEME.primary, borderRadius: 3, transform: [{rotate: '45deg'}] },
  brandText: { fontSize: 13, fontWeight: '900', letterSpacing: 4, color: THEME.primary },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: THEME.accentLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  pulse: { width: 6, height: 6, borderRadius: 3, backgroundColor: THEME.accent },
  statusText: { fontSize: 9, fontWeight: '900', color: THEME.primary, letterSpacing: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 10 },
  heroSection: { marginTop: 20, marginBottom: 40 },
  preTitle: { color: THEME.accent, fontSize: 10, fontWeight: '900', letterSpacing: 3, marginBottom: 12 },
  mainTitle: { fontSize: 46, fontWeight: '800', color: THEME.primary, lineHeight: 52, letterSpacing: -2 },
  mainSub: { fontSize: 16, color: THEME.textMuted, lineHeight: 24, marginTop: 15 },
  sectionLabel: { fontSize: 10, fontWeight: '900', color: THEME.textMuted, letterSpacing: 3, marginBottom: 20 },
  bentoGrid: { gap: 12, marginBottom: 40 },
  bentoRow: { flexDirection: 'row', gap: 12 },
  tileWrapper: { flex: 1 },
  tile: { backgroundColor: THEME.surface, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: THEME.border, minHeight: 140 },
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
  actionBtnText: { color: '#FFF', fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  bgIcon: { position: 'absolute', right: -20, bottom: -20 },
  protocolList: { marginBottom: 40 },
  protocolRow: { flexDirection: 'row', gap: 20, marginBottom: 30 },
  protocolId: { fontSize: 12, fontWeight: '900', color: THEME.accent, marginTop: 4 },
  protocolText: { flex: 1 },
  protocolTitle: { fontSize: 18, fontWeight: '800', color: THEME.primary, marginBottom: 5 },
  protocolDesc: { fontSize: 14, color: THEME.textMuted, lineHeight: 20 },
  footer: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    paddingHorizontal: 24, 
    paddingBottom: Platform.OS === 'ios' ? 40 : 20, 
    paddingTop: 20, 
  },
  footerBtn: { 
    width: '100%', 
    borderRadius: 24, 
    overflow: 'hidden', 
    shadowColor: THEME.primary, 
    shadowOffset: { width: 0, height: 10 }, 
    shadowOpacity: 0.25, 
    shadowRadius: 15, 
    elevation: 8 
  },
  footerBtnGradient: { 
    width: '100%', 
    paddingVertical: 18, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  footerBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', letterSpacing: 1.5, textAlign: 'center' },
});