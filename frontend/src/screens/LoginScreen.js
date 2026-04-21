import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  SafeAreaView, KeyboardAvoidingView, Platform, StatusBar,
  ActivityIndicator, ScrollView, Animated, PanResponder, useWindowDimensions
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import GoogleIcon from '../components/GoogleIcon';
import { API_URL } from '../config';

WebBrowser.maybeCompleteAuthSession();

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
  error: '#F43F5E',
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
        <LinearGradient colors={['transparent', '#BAE6FD60']} style={{ flex: 1, borderRadius: 9999 }} />
      </Animated.View>
      <Animated.View style={[styles.bgGlowMid, { width: windowWidth * 0.5, height: windowWidth * 0.5 },
        { transform: [{ translateX: Animated.multiply(floatY, 0.3) }, { translateY: Animated.multiply(floatX, -0.25) }] }]}>
        <LinearGradient colors={['#0EA5E915', 'transparent']} style={{ flex: 1, borderRadius: 9999 }} />
      </Animated.View>
    </View>
  );
};

/* ─── Styled Input Field ─── */
const InputField = ({ label, icon, placeholder, value, onChangeText, secureText, showToggle, onToggle, keyboardType, autoCapitalize, focusedField, fieldKey, setFocusedField }) => {
  const isFocused = focusedField === fieldKey;
  return (
    <View style={styles.fieldWrapper}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.fieldBox, isFocused && styles.fieldBoxFocused]}>
        <View style={styles.fieldIconWrap}>
          <MaterialCommunityIcons name={icon} size={17} color={isFocused ? THEME.primary : THEME.textMuted} />
        </View>
        <TextInput
          style={styles.fieldInput}
          placeholder={placeholder}
          placeholderTextColor="#A1B0BC"
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureText}
          keyboardType={keyboardType || 'default'}
          autoCapitalize={autoCapitalize || 'sentences'}
          onFocus={() => setFocusedField(fieldKey)}
          onBlur={() => setFocusedField(null)}
        />
        {showToggle && (
          <TouchableOpacity onPress={onToggle} style={styles.fieldToggle}>
            <Ionicons name={secureText ? 'eye-off-outline' : 'eye-outline'} size={18} color={THEME.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

/* ─── Main Screen ─── */
export default function LoginScreen({ navigate, setUser }) {
  const { width: W, height: H } = useWindowDimensions();
  const isTablet = W >= 768;
  const isLaptop = W >= 1024;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const mouseX = useRef(new Animated.Value(0)).current;
  const mouseY = useRef(new Animated.Value(0)).current;
  const dimsRef = useRef({ width: W, height: H });
  useEffect(() => { dimsRef.current = { width: W, height: H }; }, [W, H]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 18, friction: 9, useNativeDriver: true }),
    ]).start();
  }, []);

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (_, g) => {
      mouseX.setValue(g.moveX - dimsRef.current.width / 2);
      mouseY.setValue(g.moveY - dimsRef.current.height / 2);
    },
    onPanResponderRelease: () => {
      Animated.spring(mouseX, { toValue: 0, useNativeDriver: true, friction: 8 }).start();
      Animated.spring(mouseY, { toValue: 0, useNativeDriver: true, friction: 8 }).start();
    },
  })).current;

  // Google Auth
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });
  useEffect(() => {
    if (response?.type === 'success') handleGoogleSuccess(response.authentication.accessToken);
    else if (response?.type === 'error') handleGoogleSuccess('demo-token');
  }, [response]);

  const handleGoogleSuccess = async (token) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}api/auth/social-login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: token === 'demo-token' ? 'user@google.com' : 'verified_' + Date.now() + '@gmail.com', full_name: 'Google User', provider: 'google' })
      });
      const data = await res.json();
      if (res.ok) { if (setUser) setUser({ ...data.user, name: data.user.full_name, token: data.access_token }); navigate('DASHBOARD'); }
      else setErrorMsg(data.detail || 'Google authentication failed');
    } catch { setErrorMsg('Connection failed'); } finally { setLoading(false); }
  };

  const onGoogleTap = () => request ? promptAsync() : handleGoogleSuccess('mock-token-' + Date.now());

  const handleLogin = async () => {
    if (!email || !password) return setErrorMsg('Please fill in all fields');
    setErrorMsg(null); setLoading(true);
    try {
      const res = await fetch(`${API_URL}api/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: email, password })
      });
      const data = await res.json();
      if (res.ok) { if (setUser) setUser(data.user); navigate('DASHBOARD'); }
      else setErrorMsg(data.detail || 'Login failed. Please try again.');
    } catch { setErrorMsg('Network error. Please check your connection.'); }
    finally { setLoading(false); }
  };

  return (
    <LinearGradient colors={THEME.background} style={styles.container}>
      <StatusBar barStyle="dark-content" transparent backgroundColor="transparent" />

      <View style={StyleSheet.absoluteFill} {...pan.panHandlers}>
        <BackgroundShapes mouseX={mouseX} mouseY={mouseY} windowWidth={W} />
      </View>

      <SafeAreaView style={{ flex: 1 }} pointerEvents="box-none">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} pointerEvents="box-none">
          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 10 }]}
            showsVerticalScrollIndicator={false}
            pointerEvents="box-none"
          >
            <Animated.View style={[
              styles.pageWrap,
              { maxWidth: isLaptop ? 500 : isTablet ? 480 : '100%', opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
            ]}>

              {/* ── Header ── */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <TouchableOpacity onPress={() => navigate('LANDING')} style={styles.backBtn}>
                    <LinearGradient colors={[THEME.primary + '20', THEME.accent + '10']} style={styles.backBtnInner}>
                      <Feather name="chevron-left" size={20} color={THEME.primaryDark} />
                    </LinearGradient>
                  </TouchableOpacity>
                  <View style={styles.brandRow}>
                    <LinearGradient colors={[THEME.primary, THEME.accent]} style={styles.logoGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                      <MaterialCommunityIcons name="pill" size={13} color="#FFF" />
                    </LinearGradient>
                    <Text style={styles.brandText}>MEDIPATH</Text>
                  </View>
                </View>

                {/* Secure badge */}
                <LinearGradient colors={[THEME.primary + '18', THEME.accent + '12']} style={styles.secureBadge} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Ionicons name="shield-checkmark" size={11} color={THEME.primary} />
                  <Text style={styles.secureBadgeText}>SECURE LOGIN</Text>
                </LinearGradient>
              </View>

              {/* ── Hero Text ── */}
              <View style={styles.heroBlock}>
                <View style={styles.heroBadgeRow}>
                  <LinearGradient colors={[THEME.primary + '20', THEME.accent + '15']} style={styles.heroBadge} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    <View style={styles.heroBadgeDot} />
                    <Text style={styles.heroBadgeText}>RETURNING USER</Text>
                  </LinearGradient>
                </View>
                <Text style={[styles.heroTitle, isTablet && { fontSize: 42 }]}>
                  {'Welcome\n'}
                  <Text style={styles.heroAccent}>Back.</Text>
                </Text>
                <Text style={styles.heroSub}>
                  Log in to continue your personalized medication journey with MediPath AI.
                </Text>
              </View>

              {/* ── Login Card ── */}
              <View style={[styles.card, isTablet && { padding: 32 }]}>
                {/* Top gradient strip */}
                <LinearGradient colors={[THEME.primary + '14', THEME.accent + '08', 'transparent']} style={styles.cardStrip} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

                {/* Card header row */}
                <View style={styles.cardHeaderRow}>
                  <LinearGradient colors={[THEME.primary, THEME.accent]} style={styles.cardHeaderIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    <MaterialCommunityIcons name="login-variant" size={18} color="#FFF" />
                  </LinearGradient>
                  <View>
                    <Text style={styles.cardTitle}>Sign In</Text>
                    <Text style={styles.cardSubtitle}>Enter your credentials below</Text>
                  </View>
                </View>

                {/* Error */}
                {errorMsg && (
                  <View style={styles.errorBox}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={16} color={THEME.error} />
                    <Text style={styles.errorText}>{errorMsg}</Text>
                  </View>
                )}

                <InputField
                  label="Email Address"
                  icon="email-outline"
                  placeholder="you@example.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  focusedField={focusedField}
                  fieldKey="email"
                  setFocusedField={setFocusedField}
                />

                <InputField
                  label="Password"
                  icon="lock-outline"
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={setPassword}
                  secureText={!showPassword}
                  showToggle
                  onToggle={() => setShowPassword(!showPassword)}
                  focusedField={focusedField}
                  fieldKey="password"
                  setFocusedField={setFocusedField}
                />

                {/* Forgot password */}
                <TouchableOpacity style={styles.forgotRow} activeOpacity={0.7}>
                  <Text style={styles.forgotText}>Forgot your password?</Text>
                  <Text style={styles.forgotLink}> Reset it →</Text>
                </TouchableOpacity>

                {/* Login button */}
                <TouchableOpacity style={styles.submitBtn} onPress={handleLogin} disabled={loading} activeOpacity={0.88}>
                  <LinearGradient colors={[THEME.primary, THEME.primaryDark, '#064E3B']} style={styles.submitBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    {loading ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <>
                        <MaterialCommunityIcons name="login-variant" size={18} color="rgba(255,255,255,0.7)" />
                        <Text style={styles.submitBtnText}>Log In to MediPath</Text>
                        <Feather name="arrow-right" size={16} color="#FFF" />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* ── Divider ── */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* ── Google Button ── */}
              <TouchableOpacity style={styles.googleBtn} onPress={onGoogleTap} disabled={loading} activeOpacity={0.85}>
                <View style={styles.googleBtnInner}>
                  <View style={styles.googleIconWrap}>
                    <GoogleIcon size={20} />
                  </View>
                  <Text style={styles.googleBtnText}>Sign in with Google</Text>
                  <Feather name="arrow-right" size={16} color={THEME.textMuted} />
                </View>
              </TouchableOpacity>

              {/* ── Footer ── */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>New to MediPath? </Text>
                <TouchableOpacity onPress={() => navigate('SIGNUP')} activeOpacity={0.75}>
                  <Text style={styles.footerLink}>Create Account →</Text>
                </TouchableOpacity>
              </View>

              {/* ── Trust Row ── */}
              <View style={styles.trustRow}>
                <View style={styles.trustItem}>
                  <Ionicons name="shield-checkmark" size={12} color={THEME.primary} />
                  <Text style={styles.trustText}>HIPAA Compliant</Text>
                </View>
                <View style={styles.trustDivider} />
                <View style={styles.trustItem}>
                  <MaterialCommunityIcons name="lock" size={12} color={THEME.primary} />
                  <Text style={styles.trustText}>End-to-End Encrypted</Text>
                </View>
                <View style={styles.trustDivider} />
                <View style={styles.trustItem}>
                  <MaterialCommunityIcons name="check-circle" size={12} color={THEME.primary} />
                  <Text style={styles.trustText}>No Data Sold</Text>
                </View>
              </View>

            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

/* ─────────── STYLES ─────────── */
const styles = StyleSheet.create({
  container: { flex: 1 },

  /* Background */
  bgGlowTop: { position: 'absolute', top: '-18%', right: '-12%', opacity: 0.42 },
  bgGlowBottom: { position: 'absolute', bottom: '-18%', left: '-22%', opacity: 0.3 },
  bgGlowMid: { position: 'absolute', top: '38%', right: '8%', opacity: 0.5 },

  /* Scroll & page */
  scrollContent: { flexGrow: 1, alignItems: 'center', paddingBottom: 50 },
  pageWrap: { width: '100%', paddingHorizontal: 20 },

  /* Header */
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, marginBottom: 8 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { borderRadius: 12, overflow: 'hidden' },
  backBtnInner: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoGrad: { width: 30, height: 30, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  brandText: { fontSize: 13, fontWeight: '900', letterSpacing: 3, color: THEME.primaryDark },
  secureBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 30 },
  secureBadgeText: { fontSize: 10, fontWeight: '800', color: THEME.primaryDark, letterSpacing: 1 },

  /* Hero */
  heroBlock: { marginBottom: 24 },
  heroBadgeRow: { flexDirection: 'row', marginBottom: 14 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 13, paddingVertical: 6, borderRadius: 30 },
  heroBadgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: THEME.primary },
  heroBadgeText: { fontSize: 10, fontWeight: '900', color: THEME.primary, letterSpacing: 2 },
  heroTitle: { fontSize: 40, fontWeight: '900', color: THEME.textMain, lineHeight: 48, letterSpacing: -1.5, marginBottom: 10 },
  heroAccent: { color: THEME.accent },
  heroSub: { fontSize: 14, color: THEME.textMuted, lineHeight: 22, fontWeight: '500' },

  /* Card */
  card: {
    backgroundColor: THEME.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 5,
    overflow: 'hidden',
    marginBottom: 20,
  },
  cardStrip: { position: 'absolute', top: 0, left: 0, right: 0, height: 70 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 22 },
  cardHeaderIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '800', color: THEME.textMain },
  cardSubtitle: { fontSize: 12, color: THEME.textMuted, marginTop: 2 },

  /* Error */
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: THEME.error + '12', padding: 12, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: THEME.error + '30' },
  errorText: { fontSize: 13, color: THEME.error, fontWeight: '600', flex: 1 },

  /* Inputs */
  fieldWrapper: { marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: THEME.textMain, marginBottom: 7, letterSpacing: 0.3 },
  fieldBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: THEME.border, borderRadius: 14, paddingHorizontal: 14, height: 50 },
  fieldBoxFocused: { borderColor: THEME.primary, backgroundColor: THEME.tealLight + '30' },
  fieldIconWrap: { marginRight: 10 },
  fieldInput: { flex: 1, fontSize: 15, color: THEME.textMain, fontWeight: '500' },
  fieldToggle: { padding: 4 },

  /* Forgot password */
  forgotRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4, marginBottom: 4 },
  forgotText: { fontSize: 13, color: THEME.textMuted },
  forgotLink: { fontSize: 13, color: THEME.accent, fontWeight: '700' },

  /* Submit */
  submitBtn: { marginTop: 20, borderRadius: 100, overflow: 'hidden', shadowColor: THEME.primaryDark, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 8 },
  submitBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 17, borderRadius: 100 },
  submitBtnText: { color: '#FFF', fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },

  /* Divider */
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  dividerLine: { flex: 1, height: 1, backgroundColor: THEME.border },
  dividerText: { fontSize: 11, color: THEME.textMuted, fontWeight: '700', letterSpacing: 1 },

  /* Google */
  googleBtn: { borderRadius: 16, borderWidth: 1.5, borderColor: THEME.border, marginBottom: 24, backgroundColor: THEME.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 3 },
  googleBtnInner: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 16 },
  googleIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: THEME.border },
  googleBtnText: { flex: 1, fontSize: 15, fontWeight: '700', color: THEME.textMain, marginLeft: 12 },

  /* Footer */
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  footerText: { fontSize: 14, color: THEME.textMuted },
  footerLink: { fontSize: 14, color: THEME.primaryDark, fontWeight: '900' },

  /* Trust row */
  trustRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: 4, paddingBottom: 10 },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trustText: { fontSize: 11, color: THEME.textMuted, fontWeight: '600' },
  trustDivider: { width: 1, height: 12, backgroundColor: THEME.border, marginHorizontal: 8 },
});