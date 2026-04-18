import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  SafeAreaView, KeyboardAvoidingView, Platform, StatusBar, ActivityIndicator, ScrollView,
  Dimensions, Animated, PanResponder
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { API_URL } from '../config';

const { width, height } = Dimensions.get('window');

const THEME = {
  background: ['#E0F2FE', '#CCFBF1', '#D1FAE5'],
  glass: 'rgba(255, 255, 255, 0.6)',
  primary: '#14B8A6', 
  primaryDark: '#0D9488',
  secondary: '#60A5FA', 
  text: '#111827',
  textLight: '#6B7280',
  error: '#F43F5E',
  border: '#E5E7EB',
  focusedBorder: '#14B8A6',
  white: '#FFFFFF',
  shadowGlow: 'rgba(20, 184, 166, 0.15)',
};

const BackgroundShapes = ({ mouseX, mouseY }) => {
  // 1. Create autonomous "floating" animations
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 4000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // 2. Interpolate the floating values
  const floatX = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 20] });
  const floatY = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [10, -10] });

  // 3. Combine Floating + Mouse position for the Top Layer
  const layer1Transform = {
    transform: [
      { translateX: Animated.add(Animated.divide(mouseX, 15), floatX) },
      { translateY: Animated.add(Animated.divide(mouseY, 15), floatY) },
      { scale: floatAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] }) }
    ]
  };

  // 4. Combine Floating + Mouse for the Bottom Layer (moving opposite)
  const layer2Transform = {
    transform: [
      { translateX: Animated.add(Animated.divide(mouseX, -10), Animated.multiply(floatX, -1)) },
      { translateY: Animated.add(Animated.divide(mouseY, -10), Animated.multiply(floatY, -1)) }
    ]
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[styles.bgGlowTop, layer1Transform]}>
        <LinearGradient colors={['#A7F3D0', '#BFDBFE', 'transparent']} style={{ flex: 1, borderRadius: 1000 }} />
      </Animated.View>
      
      <Animated.View style={[styles.bgGlowBottom, layer2Transform]}>
        <LinearGradient colors={['transparent', '#BFDBFE', '#A7F3D0']} style={{ flex: 1, borderRadius: 1000 }} />
      </Animated.View>
    </View>
  );
};

export default function LoginScreen({ navigate, setUser }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(false);

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

  const handleLogin = async () => {
    if (!email || !password) { setErrorMsg('Credentials required'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: email, password })
      });
      const data = await res.json();
      if (res.ok) {
        if (setUser) setUser(data.user);
        navigate('DASHBOARD');
      } else {
        setErrorMsg(data.detail || 'Login failed');
      }
    } catch (err) {
      setErrorMsg('Network Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={THEME.background} style={styles.container}>
      <StatusBar barStyle="dark-content" transparent backgroundColor="transparent" />
      
      <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers}>
        <BackgroundShapes mouseX={mouseX} mouseY={mouseY} />
      </View>

      <SafeAreaView style={{ flex: 1 }} pointerEvents="box-none">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} pointerEvents="box-none">
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} pointerEvents="box-none">
            
            <View style={styles.header}>
              <TouchableOpacity onPress={() => navigate('LANDING')} style={styles.backButton}>
                <Feather name="chevron-left" size={26} color={THEME.textLight} />
              </TouchableOpacity>
            </View>

            <View style={styles.introSection}>
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Log in to continue your care journey.</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardHeader}>Login</Text>
              
              <View style={styles.inputWrapper}>
                <Text style={styles.label}>Email</Text>
                <View style={[styles.inputContainer, focusedField === 'email' && styles.inputActive]}>
                  <TextInput
                    style={styles.input}
                    placeholder="anya@clinic.io"
                    placeholderTextColor="#A1A1AA"
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    onChangeText={setEmail}
                    value={email}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={[styles.inputWrapper, { marginTop: 20 }]}>
                <Text style={styles.label}>Password</Text>
                <View style={[styles.inputContainer, focusedField === 'password' && styles.inputActive]}>
                  <TextInput
                    style={styles.input}
                    secureTextEntry={!showPassword}
                    placeholder="Enter password"
                    placeholderTextColor="#A1A1AA"
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    onChangeText={setPassword}
                    value={password}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color={THEME.textLight} />
                  </TouchableOpacity>
                </View>
              </View>

              {errorMsg && <View style={styles.errorContainer}><Text style={styles.errorText}>{errorMsg}</Text></View>}

              <TouchableOpacity style={styles.mainButton} onPress={handleLogin} disabled={loading}>
                <LinearGradient colors={[THEME.primary, THEME.primaryDark]} style={styles.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Log In</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <View style={styles.divider}>
              <View style={styles.line} /><Text style={styles.dividerText}>OR</Text><View style={styles.line} />
            </View>

            <TouchableOpacity style={styles.socialButton}>
              <Ionicons name="logo-google" size={20} color={THEME.text} />
              <Text style={styles.socialButtonText}>Google Identity</Text>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>New here? </Text>
              <TouchableOpacity onPress={() => navigate('SIGNUP')}><Text style={styles.footerLink}>Create Account</Text></TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bgGlowTop: { position: 'absolute', top: -height * 0.1, right: -width * 0.1, width: width * 0.9, height: width * 0.9, opacity: 0.15 },
  bgGlowBottom: { position: 'absolute', bottom: -height * 0.1, left: -width * 0.2, width: width * 1.1, height: width * 1.1, opacity: 0.12 },
  scrollContent: { paddingHorizontal: 28, paddingBottom: 40, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 10 },
  header: { marginBottom: 20 },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  introSection: { marginBottom: 32 },
  title: { fontSize: 32, fontWeight: '700', color: THEME.text, letterSpacing: -0.8 },
  subtitle: { fontSize: 16, color: THEME.textLight, marginTop: 8 },
  card: { backgroundColor: THEME.glass, borderRadius: 32, padding: 24, shadowColor: THEME.shadowGlow, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 30, elevation: 8 },
  cardHeader: { fontSize: 18, fontWeight: '600', color: THEME.text, marginBottom: 24 },
  inputWrapper: { marginBottom: 4 },
  label: { fontSize: 13, fontWeight: '600', color: THEME.text, marginBottom: 8, paddingLeft: 4 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', height: 48, borderBottomWidth: 1.5, borderColor: THEME.border },
  inputActive: { borderColor: THEME.focusedBorder },
  input: { flex: 1, fontSize: 16, color: THEME.text, paddingLeft: 4 },
  errorContainer: { marginTop: 16 },
  errorText: { color: THEME.error, fontSize: 13 },
  mainButton: { marginTop: 28, height: 56, borderRadius: 18, overflow: 'hidden' },
  gradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: '#FFF', fontSize: 17, fontWeight: '600' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 30 },
  line: { flex: 1, height: 1, backgroundColor: THEME.border },
  dividerText: { marginHorizontal: 12, fontSize: 12, color: THEME.textLight, fontWeight: '600' },
  socialButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 56, borderRadius: 18, backgroundColor: '#FFF', borderWidth: 1, borderColor: THEME.border },
  socialButtonText: { fontSize: 15, fontWeight: '600', color: THEME.text },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 35 },
  footerText: { fontSize: 15, color: THEME.textLight },
  footerLink: { fontSize: 15, color: THEME.primary, fontWeight: '600' },
});