import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolate,
  withSpring,
} from 'react-native-reanimated';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

// Mock data to provide enough scroll height for the animations
const SCROLL_GAP = height * 1.5;

export default function CinematicHero({ navigate }: { navigate: (s: string) => void }) {
  const scrollY = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  // 1. Text Layer Animations (The background text that blurs/fades)
  const heroTextStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [0, height * 0.4], [1, 0], Extrapolate.CLAMP);
    const scale = interpolate(scrollY.value, [0, height * 0.4], [1, 0.8], Extrapolate.CLAMP);
    const blur = interpolate(scrollY.value, [0, height * 0.4], [0, 10], Extrapolate.CLAMP);

    return {
      opacity,
      transform: [{ scale }],
    };
  });

  // 2. The Main Blue Card Animation
  const cardStyle = useAnimatedStyle(() => {
    // Card slides up from bottom
    const translateY = interpolate(
      scrollY.value,
      [0, height * 0.5, height],
      [height, height * 0.2, 0],
      Extrapolate.CLAMP
    );

    // Card expands to fill screen
    const cardWidth = interpolate(scrollY.value, [height, height * 1.5], [width * 0.9, width], Extrapolate.CLAMP);
    const cardHeight = interpolate(scrollY.value, [height, height * 1.5], [height * 0.8, height], Extrapolate.CLAMP);
    const borderRadius = interpolate(scrollY.value, [height, height * 1.5], [40, 0], Extrapolate.CLAMP);

    return {
      width: cardWidth,
      height: cardHeight,
      borderRadius,
      transform: [{ translateY }],
    };
  });

  // 3. iPhone Mockup Floating Animation
  const phoneStyle = useAnimatedStyle(() => {
    const translateY = interpolate(scrollY.value, [height * 0.8, height * 1.5], [100, 0], Extrapolate.CLAMP);
    const opacity = interpolate(scrollY.value, [height * 0.8, height * 1.2], [0, 1], Extrapolate.CLAMP);
    const rotateX = interpolate(scrollY.value, [height * 0.8, height * 1.5], [20, 0], Extrapolate.CLAMP);

    return {
      opacity,
      transform: [{ translateY }, { perspective: 1000 }, { rotateX: `${rotateX}deg` }],
    };
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* BACKGROUND: Static Gradients & Grid */}
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient colors={['#064E3B', '#020617']} style={StyleSheet.absoluteFill} />
        <View style={styles.gridOverlay} />
      </View>

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        pagingEnabled={false}
        contentContainerStyle={{ height: height * 4 }} // Long scroll for timeline
        showsVerticalScrollIndicator={false}
      >
        {/* SECTION 1: HERO TEXT */}
        <Animated.View style={[styles.heroTextSection, heroTextStyle]}>
          <Text style={styles.kicker}>SOBERS</Text>
          <Text style={styles.heroTitle}>Track the journey,</Text>
          <Text style={styles.heroTitleSilver}>not just the days.</Text>
        </Animated.View>

        {/* SECTION 2: THE CARD REVEAL */}
        <View style={styles.cardContainer}>
          <Animated.View style={[styles.mainCard, cardStyle]}>
            <LinearGradient colors={['#162C6D', '#0A101D']} style={StyleSheet.absoluteFill} />
            
            {/* Skeuomorphic Highlight (The Sheen) */}
            <LinearGradient 
              colors={['rgba(255,255,255,0.08)', 'transparent']} 
              start={{x:0, y:0}} end={{x:1, y:1}} 
              style={styles.cardSheen} 
            />

            <View style={styles.cardContent}>
              <Text style={styles.brandTitle}>SOBERS</Text>

              {/* iPhone Mockup */}
              <Animated.View style={[styles.iphoneBezel, phoneStyle]}>
                <View style={styles.iphoneScreen}>
                  <View style={styles.dynamicIsland} />
                  
                  {/* Internal Phone UI */}
                  <View style={styles.phoneInternal}>
                    <Text style={styles.phoneLabel}>SOBER DAYS</Text>
                    <Text style={styles.phoneCounter}>365</Text>
                    
                    <View style={styles.mockWidget}>
                      <View style={styles.mockIcon} />
                      <View style={styles.mockBar} />
                    </View>
                  </View>
                </View>
              </Animated.View>

              <View style={styles.cardFooterText}>
                <Text style={styles.cardH3}>Accountability, redefined.</Text>
                <TouchableOpacity 
                  style={styles.ctaButton}
                  onPress={() => navigate('SIGNUP')}
                >
                  <Text style={styles.ctaButtonText}>Get Started</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  gridOverlay: { ...StyleSheet.absoluteFillObject, opacity: 0.05, borderWidth: 1, borderColor: '#10B981' },
  
  // Hero Section
  heroTextSection: {
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  kicker: { color: '#10B981', fontWeight: '900', letterSpacing: 4, marginBottom: 10 },
  heroTitle: { fontSize: 42, fontWeight: '800', color: '#fff', textAlign: 'center' },
  heroTitleSilver: { fontSize: 42, fontWeight: '800', color: '#A1A1AA', textAlign: 'center' },

  // Card Reveal Section
  cardContainer: { height: height * 2, alignItems: 'center' },
  mainCard: {
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.8,
    shadowRadius: 40,
    elevation: 24,
  },
  cardSheen: { ...StyleSheet.absoluteFillObject, opacity: 0.5 },
  cardContent: { flex: 1, alignItems: 'center', justifyContent: 'space-around', paddingVertical: 40 },
  
  brandTitle: { fontSize: 80, fontWeight: '900', color: 'rgba(255,255,255,0.05)', position: 'absolute', top: 20 },

  // iPhone Mockup
  iphoneBezel: {
    width: 240,
    height: 480,
    backgroundColor: '#000',
    borderRadius: 45,
    borderWidth: 8,
    borderColor: '#111',
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 30 },
    shadowOpacity: 1,
    shadowRadius: 20,
  },
  iphoneScreen: {
    flex: 1,
    backgroundColor: '#050914',
    borderRadius: 35,
    alignItems: 'center',
    paddingTop: 20,
  },
  dynamicIsland: {
    width: 80,
    height: 25,
    backgroundColor: '#000',
    borderRadius: 15,
    marginBottom: 40,
  },
  phoneInternal: { alignItems: 'center', width: '100%' },
  phoneLabel: { color: '#3B82F6', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  phoneCounter: { color: '#fff', fontSize: 60, fontWeight: '900' },
  mockWidget: {
    width: '80%',
    height: 60,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 15,
    marginTop: 40,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  mockIcon: { width: 30, height: 30, borderRadius: 8, backgroundColor: 'rgba(59, 130, 246, 0.2)' },
  mockBar: { height: 8, width: 80, backgroundColor: 'rgba(255,255,255,0.1)', marginLeft: 10, borderRadius: 4 },

  cardFooterText: { alignItems: 'center', paddingHorizontal: 40 },
  cardH3: { color: '#fff', fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 20 },
  
  // CTA
  ctaButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 100,
  },
  ctaButtonText: { color: '#000', fontWeight: '900', fontSize: 16 },
});