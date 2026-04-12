import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, SHADOWS, RADIUS } from '../theme';
import { API_URL } from '../config';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

export default function SignupScreen({ navigate, setUser }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [agreed, setAgreed] = useState(false);
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1);
  const [userId, setUserId] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    setErrorMsg(null);
    if (!name || !email || !password || !confirmPassword) { setErrorMsg('Please fill all fields.'); return; }
    if (password !== confirmPassword) { setErrorMsg('Passwords do not match.'); return; }
    if (!agreed) { setErrorMsg('You must agree to the Terms of Service.'); return; }
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: name, email, password }),
      });
      const data = await response.json();
      if (response.ok) { setUserId(data.user_id); setStep(2); }
      else { setErrorMsg(data.detail || 'Signup failed'); }
    } catch (err) {
      setErrorMsg('Connection error. Please check your backend.');
    } finally { setLoading(false); }
  };

  const handleVerifyOtp = async () => {
    if (!otp) { setErrorMsg('Please enter the 6-digit code'); return; }
    setLoading(true);
    setErrorMsg(null);
    try {
      const response = await fetch(`${API_URL}api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, otp }),
      });
      const data = await response.json();
      if (response.ok) { setUser(data.user); navigate('DASHBOARD'); }
      else { setErrorMsg(data.detail || 'Invalid verification code'); }
    } catch (err) {
      setErrorMsg('Verification failed. Try again.');
    } finally { setLoading(false); }
  };

  const inputStyle = (field) => [
    styles.inputWrapper,
    focusedField === field && styles.inputFocused,
  ];

  const heroSubtitle = step === 1
    ? 'Join 14,200+ users managing their health smarter'
    : `We've sent a 6-digit code to ${email}`;

  const heroTitle = step === 1 ? 'Create account' : 'Verify your email';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.midnight} />

      {/* Dark hero */}
      <LinearGradient colors={GRADIENTS.hero} style={styles.heroSection}>
        <View style={styles.bgDeco1} />
        <View style={styles.bgDeco2} />

        <TouchableOpacity
          onPress={() => step === 2 ? setStep(1) : navigate('LANDING')}
          style={styles.backBtn}
        >
          <Feather name="arrow-left" size={20} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>

        <View style={styles.heroContent}>
          <LinearGradient colors={GRADIENTS.teal} style={styles.logoIcon}>
            <MaterialCommunityIcons name="pill" size={26} color="#fff" />
          </LinearGradient>

          {/* Step indicator */}
          <View style={styles.stepRow}>
            {[1, 2].map(s => (
              <View key={s} style={[styles.stepDot, step === s && styles.stepDotActive, step > s && styles.stepDotDone]}>
                {step > s
                  ? <Feather name="check" size={11} color="#fff" />
                  : <Text style={[styles.stepNum, step === s && { color: '#fff' }]}>{s}</Text>
                }
              </View>
            ))}
            <View style={styles.stepLine} />
          </View>

          <Text style={styles.heroTitle}>{heroTitle}</Text>
          <Text style={styles.heroSubtitle}>{heroSubtitle}</Text>
        </View>
      </LinearGradient>

      {/* Form card */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          style={styles.formCard}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formHandle} />

          {step === 1 ? (
            <>
              <Text style={styles.label}>Full name</Text>
              <View style={inputStyle('name')}>
                <Feather name="user" size={17} color={focusedField === 'name' ? COLORS.primary : COLORS.textMuted} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="Riya Sharma" placeholderTextColor={COLORS.textMuted}
                  onChangeText={setName} value={name}
                  onFocus={() => setFocusedField('name')} onBlur={() => setFocusedField(null)} />
              </View>

              <Text style={[styles.label, { marginTop: 16 }]}>Email address</Text>
              <View style={inputStyle('email')}>
                <Feather name="mail" size={17} color={focusedField === 'email' ? COLORS.primary : COLORS.textMuted} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="you@example.com" placeholderTextColor={COLORS.textMuted}
                  onChangeText={setEmail} value={email} autoCapitalize="none" keyboardType="email-address"
                  onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField(null)} />
              </View>

              <Text style={[styles.label, { marginTop: 16 }]}>Password</Text>
              <View style={inputStyle('password')}>
                <Feather name="lock" size={17} color={focusedField === 'password' ? COLORS.primary : COLORS.textMuted} style={styles.inputIcon} />
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Minimum 8 characters" placeholderTextColor={COLORS.textMuted}
                  secureTextEntry={!showPassword} onChangeText={setPassword} value={password}
                  onFocus={() => setFocusedField('password')} onBlur={() => setFocusedField(null)} />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                  <Feather name={showPassword ? 'eye-off' : 'eye'} size={17} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Password strength bar */}
              {password.length > 0 && (
                <View style={styles.strengthRow}>
                  {[...Array(4)].map((_, i) => {
                    const score = Math.min(4, Math.floor(password.length / 3));
                    return (
                      <View key={i} style={[styles.strengthSeg, i < score && styles.strengthSegActive(score)]} />
                    );
                  })}
                  <Text style={styles.strengthLabel}>
                    {password.length < 6 ? 'Weak' : password.length < 10 ? 'Fair' : password.length < 14 ? 'Good' : 'Strong'}
                  </Text>
                </View>
              )}

              <Text style={[styles.label, { marginTop: 16 }]}>Confirm password</Text>
              <View style={inputStyle('confirmPassword')}>
                <Feather name="lock" size={17} color={focusedField === 'confirmPassword' ? COLORS.primary : COLORS.textMuted} style={styles.inputIcon} />
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Repeat password" placeholderTextColor={COLORS.textMuted}
                  secureTextEntry={!showPassword} onChangeText={setConfirmPassword} value={confirmPassword}
                  onFocus={() => setFocusedField('confirmPassword')} onBlur={() => setFocusedField(null)} />
                {confirmPassword.length > 0 && (
                  <Feather
                    name={confirmPassword === password ? 'check-circle' : 'x-circle'}
                    size={17}
                    color={confirmPassword === password ? COLORS.primary : COLORS.dangerText}
                  />
                )}
              </View>

              <TouchableOpacity style={styles.termsRow} onPress={() => setAgreed(!agreed)} activeOpacity={0.7}>
                <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                  {agreed && <Feather name="check" size={11} color="#fff" />}
                </View>
                <Text style={styles.termsText}>
                  I agree to the <Text style={styles.termsLink}>Terms of Service</Text> and <Text style={styles.termsLink}>Privacy Policy</Text>
                </Text>
              </TouchableOpacity>

              {errorMsg && <View style={styles.errorBox}><Feather name="alert-circle" size={14} color={COLORS.dangerText} /><Text style={styles.errorText}>{errorMsg}</Text></View>}

              <TouchableOpacity
                style={[styles.primaryBtn, (!agreed || loading) && { opacity: 0.5 }]}
                onPress={handleSignup} activeOpacity={0.85} disabled={loading || !agreed}
              >
                <LinearGradient colors={GRADIENTS.teal} style={styles.primaryBtnGradient}>
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <><Text style={styles.primaryBtnText}>Create Account</Text><Feather name="arrow-right" size={17} color="#fff" /></>
                  }
                </LinearGradient>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.otpHint}>Enter the 6-digit code sent to your email</Text>

              <View style={inputStyle('otp')}>
                <Feather name="shield" size={17} color={focusedField === 'otp' ? COLORS.primary : COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { letterSpacing: 10, fontSize: 22, fontWeight: '800' }]}
                  placeholder="000000" placeholderTextColor={COLORS.textMuted + '50'}
                  onChangeText={setOtp} value={otp} keyboardType="number-pad" maxLength={6}
                  onFocus={() => setFocusedField('otp')} onBlur={() => setFocusedField(null)}
                />
              </View>

              {errorMsg && <View style={styles.errorBox}><Feather name="alert-circle" size={14} color={COLORS.dangerText} /><Text style={styles.errorText}>{errorMsg}</Text></View>}

              <TouchableOpacity
                style={[styles.primaryBtn, loading && { opacity: 0.5 }]}
                onPress={handleVerifyOtp} activeOpacity={0.85} disabled={loading}
              >
                <LinearGradient colors={GRADIENTS.teal} style={styles.primaryBtnGradient}>
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <><Text style={styles.primaryBtnText}>Verify & Finish</Text><Feather name="check" size={17} color="#fff" /></>
                  }
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={{ alignItems: 'center', marginTop: 16 }} onPress={() => setStep(1)}>
                <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: 14 }}>← Change Email</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigate('LOGIN')}>
            <Text style={styles.footerLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.midnight },

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
    backgroundColor: 'rgba(124,58,237,0.07)', bottom: -20, left: -40,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', marginBottom: 24,
  },
  heroContent: { alignItems: 'center', gap: 10 },
  logoIcon: {
    width: 60, height: 60, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center', marginBottom: 4, ...SHADOWS.colored,
  },

  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 0, position: 'relative', marginBottom: 4 },
  stepLine: {
    position: 'absolute', left: 20, right: 20, height: 2,
    backgroundColor: 'rgba(255,255,255,0.15)', zIndex: 0, top: 14,
  },
  stepDot: {
    width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)',
    zIndex: 1, marginHorizontal: 16,
  },
  stepDotActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primaryLight },
  stepDotDone: { backgroundColor: COLORS.primaryDark, borderColor: COLORS.primary },
  stepNum: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.5)' },

  heroTitle: { fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  heroSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.55)', textAlign: 'center', paddingHorizontal: 16 },

  formCard: {
    flex: 1, backgroundColor: COLORS.background,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 16,
    marginTop: -20,
  },
  formHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 24,
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

  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  strengthSeg: { flex: 1, height: 3, borderRadius: 2, backgroundColor: COLORS.border },
  strengthSegActive: (score) => ({
    backgroundColor: score <= 1 ? COLORS.dangerText : score <= 2 ? COLORS.warningText : COLORS.primary,
  }),
  strengthLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, minWidth: 36 },

  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 20 },
  checkbox: {
    width: 22, height: 22, borderRadius: 7, borderWidth: 2, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center', marginTop: 1, flexShrink: 0,
  },
  checkboxChecked: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  termsText: { flex: 1, fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
  termsLink: { color: COLORS.primary, fontWeight: '700' },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12,
    backgroundColor: COLORS.dangerBg, borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: COLORS.dangerBorder,
  },
  errorText: { color: COLORS.dangerText, fontSize: 13, flex: 1 },

  primaryBtn: { marginTop: 24, borderRadius: 14, overflow: 'hidden', ...SHADOWS.colored },
  primaryBtnGradient: {
    height: 54, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  otpHint: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 20, textAlign: 'center' },

  footer: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    backgroundColor: COLORS.background, paddingBottom: Platform.OS === 'ios' ? 36 : 24, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  footerText: { color: COLORS.textSecondary, fontSize: 15 },
  footerLink: { color: COLORS.primary, fontSize: 15, fontWeight: '800' },
});
