import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  SafeAreaView, KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, StatusBar, Dimensions, Animated, PanResponder
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';

const { width, height } = Dimensions.get('window');

const THEME = {
  background: ['#E0F2FE', '#CCFBF1', '#D1FAE5'],
  glass: 'rgba(255, 255, 255, 0.6)',
  primary: '#14B8A6',
  secondary: '#60A5FA',
  text: '#111827',
  textLight: '#6B7280',
  border: '#E5E7EB',
  focusedBorder: '#14B8A6',
  white: '#FFFFFF',
  shadowGlow: 'rgba(20, 184, 166, 0.15)',
};

// Background Shapes Component with Autonomous "Floating" + Cursor Tracking
const BackgroundShapes = ({ mouseX, mouseY }) => {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Continuous "breathing" movement
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 5000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 5000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Map the floatAnim to subtle movement ranges
  const floatX = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [-25, 25] });
  const floatY = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [15, -15] });

  // Top shape: Follows cursor + floats + subtle scale pulse
  const topTransform = {
    transform: [
      { translateX: Animated.add(Animated.divide(mouseX, 15), floatX) },
      { translateY: Animated.add(Animated.divide(mouseY, 15), floatY) },
      { scale: floatAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }) }
    ]
  };

  // Bottom shape: Moves opposite to cursor + opposite float
  const bottomTransform = {
    transform: [
      { translateX: Animated.add(Animated.multiply(Animated.divide(mouseX, 10), -1), Animated.multiply(floatX, -1)) },
      { translateY: Animated.add(Animated.multiply(Animated.divide(mouseY, 10), -1), Animated.multiply(floatY, -1)) }
    ]
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[styles.bgGlowTop, topTransform]}>
        <LinearGradient
          colors={['#A7F3D0', '#BFDBFE', 'transparent']}
          style={{ flex: 1, borderRadius: 1000 }}
        />
      </Animated.View>

      <Animated.View style={[styles.bgGlowBottom, bottomTransform]}>
        <LinearGradient
          colors={['transparent', '#BFDBFE', '#A7F3D0']}
          style={{ flex: 1, borderRadius: 1000 }}
        />
      </Animated.View>
    </View>
  );
};

export default function SignupScreen({ navigate, goBack, setUser }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const [errorMsg, setErrorMsg] = useState(null);
  const [pendingUserId, setPendingUserId] = useState(null);
  const [otp, setOtp] = useState('');

  const mouseX = useRef(new Animated.Value(0)).current;
  const mouseY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        mouseX.setValue(gestureState.moveX - width / 2);
        mouseY.setValue(gestureState.moveY - height / 2);
      },
      onPanResponderRelease: () => {
        Animated.spring(mouseX, { toValue: 0, useNativeDriver: true, friction: 8 }).start();
        Animated.spring(mouseY, { toValue: 0, useNativeDriver: true, friction: 8 }).start();
      },
    })
  ).current;

  const getStrength = () => {
    if (password.length === 0) return 0;
    if (password.length < 8) return 1;
    if (/[A-Z]/.test(password) && /\d/.test(password)) return 3;
    return 2;
  };

  const handleSignup = async () => {
    if (!name || !email || !password || !confirmPassword || !agreed) return;
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match");
      return;
    }
    setErrorMsg(null);
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: name, email, password })
      });
      const data = await response.json();

      if (response.ok) {
        setPendingUserId(data.user_id);
        setStep(2);
      } else {
        setErrorMsg(data.detail || "Registration failed");
      }
    } catch (err) {
      setErrorMsg("Network error connecting to server");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!otp) return;
    setErrorMsg(null);
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: pendingUserId, otp })
      });
      const data = await response.json();

      if (response.ok) {
        if (setUser) {
          setUser({ ...data.user, name: data.user.full_name, token: data.access_token });
        }
        navigate('DASHBOARD');
      } else {
        setErrorMsg(data.detail || "Invalid code");
      }
    } catch (err) {
      setErrorMsg("Network error connecting to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={THEME.background} style={styles.container}>
      <StatusBar barStyle="dark-content" transparent backgroundColor="transparent" />

      {/* Interactive Layer */}
      <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers}>
        <BackgroundShapes mouseX={mouseX} mouseY={mouseY} />
      </View>

      <SafeAreaView style={{ flex: 1 }} pointerEvents="box-none">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          pointerEvents="box-none"
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            pointerEvents="box-none"
          >
            <View style={styles.header}>
              <TouchableOpacity onPress={goBack} style={styles.backButton}>
                <Feather name="chevron-left" size={26} color={THEME.textLight} />
              </TouchableOpacity>
              <Text style={styles.headerIndicator}>Step {step} of 2</Text>
            </View>

            <View style={styles.introSection}>
              <Text style={styles.title}>{step === 1 ? 'Start Your Care' : 'Verify Email'}</Text>
              <Text style={styles.subtitle}>
                {step === 1
                  ? 'Join PrescribePal for intelligent healthcare support.'
                  : `Please check your Email (${email}) for the code.`}
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardHeader}>{step === 1 ? 'Personal Details' : 'Identity Verification'}</Text>

              {errorMsg && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ color: THEME.error || '#F43F5E', fontSize: 13 }}>{errorMsg}</Text>
                </View>
              )}

              {step === 1 ? (
                <>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.label}>Full Name</Text>
                    <View style={[styles.inputContainer, focusedField === 'name' && styles.inputActive]}>
                      <TextInput
                        style={styles.input}
                        placeholder="E.g. Dr. Anya Sharma"
                        placeholderTextColor="#A1A1AA"
                        onFocus={() => setFocusedField('name')}
                        onBlur={() => setFocusedField(null)}
                        onChangeText={setName}
                        value={name}
                      />
                    </View>
                  </View>

                  <View style={[styles.inputWrapper, { marginTop: 16 }]}>
                    <Text style={styles.label}>Work Email</Text>
                    <View style={[styles.inputContainer, focusedField === 'email' && styles.inputActive]}>
                      <TextInput
                        style={styles.input}
                        placeholder="anya@clinic.io"
                        autoCapitalize="none"
                        keyboardType="email-address"
                        placeholderTextColor="#A1A1AA"
                        onFocus={() => setFocusedField('email')}
                        onBlur={() => setFocusedField(null)}
                        onChangeText={setEmail}
                        value={email}
                      />
                    </View>
                  </View>

                  <View style={[styles.inputWrapper, { marginTop: 16 }]}>
                    <Text style={styles.label}>Password</Text>
                    <View style={[styles.inputContainer, focusedField === 'password' && styles.inputActive]}>
                      <TextInput
                        style={styles.input}
                        secureTextEntry={!showPassword}
                        placeholder="At least 8 characters"
                        placeholderTextColor="#A1A1AA"
                        onFocus={() => setFocusedField('password')}
                        onBlur={() => setFocusedField(null)}
                        onChangeText={setPassword}
                        value={password}
                      />
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                        <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color={THEME.textLight} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {password.length > 0 && (
                    <View style={styles.strengthCont}>
                      {[1, 2, 3].map((i) => (
                        <View key={i} style={[styles.strengthBar, i <= getStrength() && { backgroundColor: getStrength() === 3 ? THEME.primary : '#FBBF24' }]} />
                      ))}
                      <Text style={styles.strengthText}>
                        {getStrength() === 1 ? 'Weak' : getStrength() === 2 ? 'Good' : 'Strong'}
                      </Text>
                    </View>
                  )}

                  <View style={[styles.inputWrapper, { marginTop: 16 }]}>
                    <Text style={styles.label}>Confirm Password</Text>
                    <View style={[styles.inputContainer, focusedField === 'confirm' && styles.inputActive]}>
                      <TextInput
                        style={styles.input}
                        secureTextEntry={!showPassword}
                        placeholder="Repeat your password"
                        placeholderTextColor="#A1A1AA"
                        onFocus={() => setFocusedField('confirm')}
                        onBlur={() => setFocusedField(null)}
                        onChangeText={setConfirmPassword}
                        value={confirmPassword}
                      />
                    </View>
                  </View>

                  <TouchableOpacity style={styles.termsRow} onPress={() => setAgreed(!agreed)}>
                    <View style={[styles.checkbox, agreed && styles.checkboxActive]}>
                      {agreed && <Feather name="check" size={12} color="#FFF" />}
                    </View>
                    <Text style={styles.termsText}>I agree to the <Text style={styles.linkText}>Terms & Privacy</Text></Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={[styles.inputWrapper, { marginTop: 16 }]}>
                  <Text style={styles.label}>Verification Code (OTP)</Text>
                  <View style={[styles.inputContainer, focusedField === 'otp' && styles.inputActive]}>
                    <TextInput
                      style={styles.input}
                      placeholder="6-digit code"
                      placeholderTextColor="#A1A1AA"
                      keyboardType="number-pad"
                      onFocus={() => setFocusedField('otp')}
                      onBlur={() => setFocusedField(null)}
                      onChangeText={setOtp}
                      value={otp}
                    />
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={[styles.mainButton, (!agreed && step === 1) && { opacity: 0.5 }]}
                onPress={step === 1 ? handleSignup : handleVerify}
                disabled={loading}
              >
                <LinearGradient
                  colors={[THEME.primary, '#0D9488']}
                  style={styles.gradient}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                >
                  {loading ? (
                    <ActivityIndicator color={THEME.white} />
                  ) : (
                    <Text style={styles.buttonText}>{step === 1 ? 'Register Now' : 'Complete Setup'}</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already part of PrescribePal? </Text>
              <TouchableOpacity onPress={() => navigate('LOGIN')}>
                <Text style={styles.footerLink}>Log In</Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bgGlowTop: {
    position: 'absolute',
    top: -height * 0.1,
    right: -width * 0.1,
    width: width * 0.9,
    height: width * 0.9,
    opacity: 0.2
  },
  bgGlowBottom: {
    position: 'absolute',
    bottom: -height * 0.1,
    left: -width * 0.2,
    width: width * 1.1,
    height: width * 1.1,
    opacity: 0.15
  },
  scrollContent: { paddingHorizontal: 28, paddingBottom: 40, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 10 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, paddingVertical: 10 },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerIndicator: { fontSize: 13, color: THEME.textLight, fontWeight: '500', backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  introSection: { marginBottom: 30 },
  title: { fontSize: 32, fontWeight: '700', color: THEME.text, marginBottom: 10, letterSpacing: -0.8 },
  subtitle: { fontSize: 16, color: THEME.textLight, lineHeight: 24, fontWeight: '400', paddingRight: 30 },
  card: {
    backgroundColor: THEME.glass, borderRadius: 32, padding: 24,
    shadowColor: THEME.shadowGlow, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 30,
    elevation: 8,
  },
  cardHeader: { fontSize: 18, fontWeight: '600', color: THEME.text, marginBottom: 24 },
  inputWrapper: { marginBottom: 4 },
  label: { fontSize: 13, fontWeight: '600', color: THEME.text, marginBottom: 8, paddingLeft: 4 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', height: 48, borderBottomWidth: 1.5, borderColor: THEME.border },
  inputActive: { borderColor: THEME.focusedBorder },
  input: { flex: 1, fontSize: 16, color: THEME.text, fontWeight: '400', paddingLeft: 4 },
  eyeBtn: { padding: 4 },
  strengthCont: { flexDirection: 'row', gap: 6, marginTop: 10, alignItems: 'center', paddingHorizontal: 4 },
  strengthBar: { height: 3, flex: 1, backgroundColor: THEME.border, borderRadius: 1.5 },
  strengthText: { fontSize: 11, fontWeight: '600', color: THEME.textLight, marginLeft: 8 },
  termsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 28 },
  checkbox: { width: 22, height: 22, borderRadius: 8, borderWidth: 1.5, borderColor: THEME.border, marginRight: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: THEME.white },
  checkboxActive: { backgroundColor: THEME.primary, borderColor: THEME.primary },
  termsText: { fontSize: 14, color: THEME.textLight, fontWeight: '400' },
  linkText: { color: THEME.primary, fontWeight: '500' },
  mainButton: { marginTop: 28, height: 56, borderRadius: 18, overflow: 'hidden', shadowColor: THEME.shadowGlow, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 15 },
  gradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: THEME.white, fontSize: 17, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 35, paddingVertical: 10 },
  footerText: { fontSize: 15, color: THEME.textLight, fontWeight: '400' },
  footerLink: { fontSize: 15, color: THEME.primary, fontWeight: '600' },
});
