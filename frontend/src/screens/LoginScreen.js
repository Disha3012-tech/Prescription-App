import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  SafeAreaView, KeyboardAvoidingView, Platform, StatusBar, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, SHADOWS, RADIUS } from '../theme';
import { API_URL } from '../config';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

export default function LoginScreen({ navigate, setUser }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { setErrorMsg('Please enter email and password'); return; }
    setLoading(true);
    setErrorMsg(null);
    try {
      const response = await fetch(`${API_URL}api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: email, password }),
      });
      const data = await response.json();
      if (response.ok) { setUser(data.user); navigate('DASHBOARD'); }
      else { setErrorMsg(data.detail || 'Login failed'); }
    } catch (err) {
      setErrorMsg('Connection error. Please check your backend.');
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.midnight} />

      {/* Dark hero top section */}
      <LinearGradient colors={GRADIENTS.hero} style={styles.heroSection}>
        <View style={styles.bgDeco1} />
        <View style={styles.bgDeco2} />

        <TouchableOpacity onPress={() => navigate('LANDING')} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>

        <View style={styles.heroContent}>
          <LinearGradient colors={GRADIENTS.teal} style={styles.logoIcon}>
            <MaterialCommunityIcons name="pill" size={26} color="#fff" />
          </LinearGradient>
          <Text style={styles.heroTitle}>Welcome back</Text>
          <Text style={styles.heroSubtitle}>Sign in to your PrescribePal account</Text>
        </View>
      </LinearGradient>

      {/* Form card */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.formCard}>
          <View style={styles.formHandle} />

          {/* Email */}
          <Text style={styles.label}>Email address</Text>
          <View style={[styles.inputWrapper, focusedField === 'email' && styles.inputFocused]}>
            <Feather name="mail" size={17} color={focusedField === 'email' ? COLORS.primary : COLORS.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={COLORS.textMuted}
              onChangeText={setEmail}
              value={email}
              autoCapitalize="none"
              keyboardType="email-address"
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          {/* Password */}
          <Text style={[styles.label, { marginTop: 16 }]}>Password</Text>
          <View style={[styles.inputWrapper, focusedField === 'password' && styles.inputFocused]}>
            <Feather name="lock" size={17} color={focusedField === 'password' ? COLORS.primary : COLORS.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Enter your password"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry={!showPassword}
              onChangeText={setPassword}
              value={password}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
              <Feather name={showPassword ? 'eye-off' : 'eye'} size={17} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          {errorMsg && (
            <View style={styles.errorBox}>
              <Feather name="alert-circle" size={14} color={COLORS.dangerText} />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          <TouchableOpacity style={{ alignSelf: 'flex-end', marginTop: 10 }}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
            onPress={handleLogin}
            activeOpacity={0.85}
            disabled={loading}
          >
            <LinearGradient colors={GRADIENTS.teal} style={styles.primaryBtnGradient}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <>
                  <Text style={styles.primaryBtnText}>Sign In</Text>
                  <Feather name="arrow-right" size={17} color="#fff" />
                </>
              }
            </LinearGradient>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google */}
          <TouchableOpacity style={styles.googleBtn} onPress={handleLogin} activeOpacity={0.8}>
            <Text style={styles.googleIcon}>G</Text>
            <Text style={styles.googleText}>Continue with Google</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigate('SIGNUP')}>
            <Text style={styles.footerLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.midnight },

  // Hero
  heroSection: {
    paddingTop: 20, paddingBottom: 40, paddingHorizontal: 24,
    position: 'relative', overflow: 'hidden',
  },
  bgDeco1: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(13,148,136,0.1)', top: -60, right: -60,
  },
  bgDeco2: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(8,145,178,0.07)', bottom: -20, left: -40,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', marginBottom: 28,
  },
  heroContent: { alignItems: 'center', gap: 12 },
  logoIcon: {
    width: 60, height: 60, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center', marginBottom: 4, ...SHADOWS.colored,
  },
  heroTitle: { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  heroSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.55)', fontWeight: '500' },

  // Form Card (slides up over hero)
  formCard: {
    flex: 1, backgroundColor: COLORS.background,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 20, paddingBottom: 8,
    marginTop: -20,
  },
  formHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 28,
  },

  label: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8, letterSpacing: 0.2 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: 14, paddingHorizontal: 14, height: 52, ...SHADOWS.sm,
  },
  inputFocused: { borderColor: COLORS.primary, backgroundColor: COLORS.successBg },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: COLORS.textPrimary },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12,
    backgroundColor: COLORS.dangerBg, borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: COLORS.dangerBorder,
  },
  errorText: { color: COLORS.dangerText, fontSize: 13, flex: 1 },

  forgotText: { fontSize: 13, fontWeight: '700', color: COLORS.primary, marginBottom: 4 },

  primaryBtn: { marginTop: 20, borderRadius: 14, overflow: 'hidden', ...SHADOWS.colored },
  primaryBtnGradient: {
    height: 54, flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', gap: 8,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },

  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, height: 52, borderRadius: 14, marginTop: 12,
    borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.white, ...SHADOWS.sm,
  },
  googleIcon: { fontSize: 17, fontWeight: '900', color: '#4285F4' },
  googleText: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },

  footer: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    backgroundColor: COLORS.background, paddingBottom: Platform.OS === 'ios' ? 36 : 24, paddingTop: 12,
  },
  footerText: { color: COLORS.textSecondary, fontSize: 15 },
  footerLink: { color: COLORS.primary, fontSize: 15, fontWeight: '800' },
});
