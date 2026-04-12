// ─── ScannerScreen.js ──────────────────────────────────────────────────────
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Image,
  ActivityIndicator, Animated, Dimensions, Platform,
  LayoutAnimation, UIManager,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../theme';
import { API_URL, COUNTRIES } from '../config';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');

const MedicineCard = ({ item, index, cardAnim }) => {
  const [expanded, setExpanded] = useState(false);
  const [showSimple, setShowSimple] = useState(true);
  const exp = item.explanation || {};

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  const confidencePct = item.confidence ? Math.round(item.confidence * 100) : null;

  return (
    <Animated.View style={[
      styles.medCard,
      {
        opacity: cardAnim,
        transform: [{ translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
      },
    ]}>
      <TouchableOpacity style={styles.medHeader} onPress={toggle} activeOpacity={0.7}>
        <LinearGradient colors={['#0D9488', '#0891B2']} style={styles.medIndex}>
          <Text style={styles.medIndexText}>{index + 1}</Text>
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={styles.medName}>{item.medicine}</Text>
          <View style={styles.medBriefRow}>
            <Text style={styles.medBrief}>{item.dosage || '—'} · {item.frequency || '—'}</Text>
            {confidencePct && (
              <View style={[styles.confBadge, { backgroundColor: confidencePct > 80 ? COLORS.successBg : COLORS.warningBg }]}>
                <Text style={[styles.confText, { color: confidencePct > 80 ? COLORS.primaryDark : COLORS.warningText }]}>
                  {confidencePct}%
                </Text>
              </View>
            )}
          </View>
        </View>
        <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.textSecondary} />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.medBody}>
          <View style={styles.langToggle}>
            {['Simple', 'Medical'].map((t, i) => (
              <TouchableOpacity
                key={t}
                style={[styles.langBtn, (i === 0 ? showSimple : !showSimple) && styles.langBtnActive]}
                onPress={() => setShowSimple(i === 0)}
              >
                <Text style={[styles.langBtnText, (i === 0 ? showSimple : !showSimple) && styles.langBtnTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {(exp.what_it_does || exp.simple_summary) && (
            <>
              <Text style={styles.sLabel}>WHAT IT DOES</Text>
              <Text style={styles.medDesc}>{showSimple ? exp.what_it_does : exp.simple_summary}</Text>
            </>
          )}

          {exp.generic_name && (
            <Text style={styles.genericText}>Generic: {exp.generic_name}{exp.medicine_class ? ` · ${exp.medicine_class}` : ''}</Text>
          )}

          <View style={styles.detailGrid}>
            {[['DOSAGE', item.dosage], ['FREQUENCY', item.frequency], ['DURATION', item.duration]].map(([l, v], i) => (
              <View key={i} style={[styles.detailBox, i < 2 && styles.detailBoxBorder]}>
                <Text style={styles.detailLabel}>{l}</Text>
                <Text style={styles.detailValue}>{v || '—'}</Text>
              </View>
            ))}
          </View>

          {exp.how_to_take && (
            <>
              <Text style={styles.sLabel}>HOW TO TAKE</Text>
              <Text style={styles.medDesc}>{exp.how_to_take}</Text>
            </>
          )}

          {(exp.common_side_effects || []).length > 0 && (
            <>
              <View style={styles.badgeHeader}>
                <Ionicons name="warning-outline" size={13} color={COLORS.dangerText} />
                <Text style={styles.badgeHeaderText}>SIDE EFFECTS</Text>
              </View>
              <View style={styles.badgeRow}>
                {exp.common_side_effects.map((e, i) => (
                  <View key={i} style={styles.dangerBadge}>
                    <Text style={styles.dangerBadgeText}>{e}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {exp.important_warning && (
            <View style={styles.warningBanner}>
              <Ionicons name="warning" size={15} color={COLORS.dangerText} />
              <Text style={styles.warningText}>{exp.important_warning}</Text>
            </View>
          )}

          {exp.approximate_price && (
            <View style={styles.priceRow}>
              <MaterialCommunityIcons name="cash" size={16} color="#059669" />
              <Text style={styles.priceText}>Approx: {exp.approximate_price}</Text>
            </View>
          )}

          {(exp.alternatives || []).length > 0 && (
            <>
              <View style={[styles.badgeHeader, { marginTop: 14 }]}>
                <MaterialCommunityIcons name="swap-horizontal" size={15} color={COLORS.primary} />
                <Text style={[styles.badgeHeaderText, { color: COLORS.primary }]}>CHEAPER ALTERNATIVES</Text>
              </View>
              {exp.alternatives.map((alt, i) => (
                <View key={i} style={styles.altCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.altName}>{alt.name}</Text>
                    <Text style={styles.altType}>{alt.type}</Text>
                  </View>
                  {alt.approximate_price && (
                    <Text style={styles.altPrice}>{alt.approximate_price}</Text>
                  )}
                </View>
              ))}
            </>
          )}
        </View>
      )}
    </Animated.View>
  );
};

export default function ScannerScreen({ navigate, user, route }) {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(route?.params?.analysisResult || null);
  const [error, setError] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const cardAnims = useRef([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    if (route?.params?.analysisResult) {
      setResult(route.params.analysisResult);
      animateCards(route.params.analysisResult.results?.length || 0);
    }
  }, [route?.params?.analysisResult]);

  const startScanLine = () => {
    scanLineAnim.setValue(0);
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(scanLineAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    ).start();
  };

  const animateCards = (count) => {
    cardAnims.current = Array.from({ length: count }, () => new Animated.Value(0));
    Animated.stagger(100, cardAnims.current.map(a =>
      Animated.spring(a, { toValue: 1, useNativeDriver: true, tension: 60, friction: 10 })
    )).start();
  };

  const analyzeImage = async (uri) => {
    setLoading(true); setError(null);
    startScanLine();
    try {
      const formData = new FormData();
      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        const blob = await response.blob();
        formData.append('file', blob, 'prescription.jpg');
      } else {
        formData.append('file', { uri, name: 'prescription.jpg', type: 'image/jpeg' });
      }
      formData.append('country', selectedCountry.value);
      formData.append('currency', selectedCountry.currency);
      if (user?.id) formData.append('user_id', user.id);

      const response = await fetch(`${API_URL}analyze-prescription`, { method: 'POST', body: formData });
      const data = await response.json();
      if (data.status === 'error') throw new Error(data.message || 'Analysis failed');

      scanLineAnim.stopAnimation();

      if (data.is_duplicate) {
        // Format for PrescriptionDetailScreen
        const existingRecord = {
          id: data.existing_id,
          date: new Date().toISOString(),
          condition: data.results?.[0]?.explanation?.medicine_class || 'General Checkup',
          doctor: data.results?.[0]?.explanation?.brand_name || 'Prescription Scan',
          medicines: data.results ? data.results.map(r => r.medicine) : [],
          fullResults: data.results,
          notes: data.results?.[0]?.explanation?.what_it_does || data.raw_text?.substring(0, 100),
          image_url: data.image_url ? (data.image_url.startsWith('http') ? data.image_url : `${API_URL.replace(/\/$/, '')}${data.image_url}`) : null,
          raw_text: data.raw_text,
          avg_confidence: data.avg_confidence,
          country: data.country,
          currency: data.currency,
        };
        navigate('PRESCRIPTION_DETAIL', { record: existingRecord });
        return;
      }

      navigate('CONFIRM_MEDICINES', {
        imageUri: uri, medicineHighlights: data.medicine_highlights,
        rawResult: data, country: selectedCountry.value,
        currency: selectedCountry.currency, userId: user?.id, 
        image_url: data.image_url, image_hash: data.image_hash,
      });
    } catch (err) {
      scanLineAnim.stopAnimation();
      setError('Could not analyze prescription. Please ensure the image is clear and try again.');
    } finally {
      setLoading(false);
    }
  };

  const pickCamera = async () => {
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.9 });
    if (!res.canceled) { setImage(res.assets[0].uri); analyzeImage(res.assets[0].uri); }
  };

  const pickGallery = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.9 });
    if (!res.canceled) { setImage(res.assets[0].uri); analyzeImage(res.assets[0].uri); }
  };

  const reset = () => { setImage(null); setResult(null); setError(null); };

  // ── Loading Screen ──
  if (loading) {
    const scanY = scanLineAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 300] });
    return (
      <View style={styles.loadingContainer}>
        {image && <Image source={{ uri: image }} style={styles.loadingBg} blurRadius={6} />}
        <LinearGradient colors={['rgba(10,22,40,0.7)', 'rgba(10,22,40,0.9)']} style={StyleSheet.absoluteFillObject} />
        <View style={styles.loadingContent}>
          <View style={styles.scanFrame}>
            {['tl', 'tr', 'bl', 'br'].map(c => (
              <View key={c} style={[styles.corner, styles[c]]} />
            ))}
            <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanY }] }]} />
          </View>
          <View style={styles.loadingCard}>
            <View style={styles.loadingIconRow}>
              <LinearGradient colors={['#0D9488', '#0891B2']} style={styles.loadingIcon}>
                <MaterialCommunityIcons name="eye-scan" size={28} color="#fff" />
              </LinearGradient>
            </View>
            <Text style={styles.loadingTitle}>Reading Prescription...</Text>
            {['🔤 Extracting text via OCR', '💊 Identifying medicines', '🔍 Finding alternatives'].map((step, i) => (
              <View key={i} style={styles.loadingStep}>
                <ActivityIndicator size="small" color={COLORS.primaryLight} />
                <Text style={styles.loadingStepText}>{step}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  }

  // ── Results Screen ──
  if (result) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0A1628', '#0F2535']} style={styles.resultsHeader}>
          <View style={styles.resultsHeaderTop}>
            <View>
              <Text style={styles.resultsTitle}>Analysis Complete ✅</Text>
              <Text style={styles.resultsMeta}>
                {result.results?.length || 0} medicines · {result.avg_confidence}% accuracy · {result.country}
              </Text>
            </View>
            <TouchableOpacity onPress={reset} style={styles.rescanBtn}>
              <Feather name="camera" size={15} color="#fff" />
              <Text style={styles.rescanText}>Rescan</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
          {(result.results || []).map((med, i) => (
            <MedicineCard
              key={i} item={med} index={i}
              cardAnim={cardAnims.current[i] || new Animated.Value(1)}
            />
          ))}
          <View style={styles.disclaimer}>
            <Ionicons name="warning-outline" size={13} color={COLORS.warningText} />
            <Text style={styles.disclaimerText}>Informational only. Consult your doctor before changing medication.</Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── Upload Screen ──
  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0A1628', '#0F2535']} style={styles.uploadHeader}>
        <View style={styles.bgCircle} />
        <MaterialCommunityIcons name="scan-helper" size={48} color="rgba(13,148,136,0.4)" style={{ marginBottom: 12 }} />
        <Text style={styles.uploadTitle}>Scan Prescription</Text>
        <Text style={styles.uploadSub}>AI reads any handwriting — printed or scrawled</Text>
        <View style={styles.featureChips}>
          {['OCR + AI', 'Drug Alerts', 'Local Prices'].map((f, i) => (
            <View key={i} style={styles.featureChip}>
              <Text style={styles.featureChipText}>{f}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.uploadContent}>
        {/* Country */}
        <View style={styles.countryCard}>
          <Text style={styles.countryCardLabel}>🌍 Your Country</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 8 }}>
            {COUNTRIES.map(c => (
              <TouchableOpacity
                key={c.value}
                onPress={() => setSelectedCountry(c)}
                style={[styles.countryPill, selectedCountry.value === c.value && styles.countryPillActive]}
              >
                <Text style={[styles.countryPillText, selectedCountry.value === c.value && styles.countryPillTextActive]}>
                  {c.label.split(' ')[0]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={styles.countryHint}>Prices shown in {selectedCountry.currency}</Text>
        </View>

        <TouchableOpacity onPress={pickCamera} activeOpacity={0.88}>
          <LinearGradient colors={['#0D9488', '#0891B2']} style={styles.primaryBtn}>
            <Feather name="camera" size={20} color="#fff" />
            <Text style={styles.primaryBtnText}>Open Camera</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={pickGallery} activeOpacity={0.85}>
          <Feather name="image" size={20} color={COLORS.primary} />
          <Text style={styles.secondaryBtnText}>Choose from Gallery</Text>
        </TouchableOpacity>

        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color={COLORS.dangerText} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>📸 For best results</Text>
          {['Good lighting — no shadows', 'Hold steady — no blur', 'Full prescription in frame'].map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <View style={styles.tipDot} />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>

        <View style={styles.disclaimer}>
          <Ionicons name="warning-outline" size={13} color={COLORS.warningText} />
          <Text style={styles.disclaimerText}>Informational only. Consult your doctor before changing medication.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Upload
  uploadHeader: {
    alignItems: 'center', paddingHorizontal: 24, paddingTop: 40, paddingBottom: 36, position: 'relative', overflow: 'hidden',
  },
  bgCircle: {
    position: 'absolute', width: 250, height: 250, borderRadius: 125,
    backgroundColor: 'rgba(13,148,136,0.08)', top: -60, right: -60,
  },
  uploadTitle: { fontSize: 26, fontWeight: '900', color: '#fff', marginBottom: 8, letterSpacing: -0.5 },
  uploadSub: { fontSize: 14, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 21, marginBottom: 16 },
  featureChips: { flexDirection: 'row', gap: 8 },
  featureChip: {
    backgroundColor: 'rgba(13,148,136,0.25)', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(94,234,212,0.3)',
  },
  featureChipText: { fontSize: 12, fontWeight: '600', color: '#5EEAD4' },

  uploadContent: { padding: 20, paddingBottom: 60, gap: 14 },

  countryCard: {
    backgroundColor: '#fff', borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  countryCardLabel: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  countryPill: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: COLORS.lightGray, borderWidth: 1, borderColor: COLORS.border,
  },
  countryPillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  countryPillText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  countryPillTextActive: { color: '#fff' },
  countryHint: { fontSize: 12, color: COLORS.textSecondary, marginTop: 10 },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 17, borderRadius: 16,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: COLORS.successBg, paddingVertical: 16, borderRadius: 16,
    borderWidth: 1.5, borderColor: COLORS.border,
  },
  secondaryBtnText: { color: COLORS.primary, fontSize: 16, fontWeight: '700' },

  errorBox: {
    flexDirection: 'row', gap: 10, backgroundColor: COLORS.dangerBg,
    padding: 14, borderRadius: 14, borderWidth: 1, borderColor: COLORS.dangerBorder, alignItems: 'flex-start',
  },
  errorText: { flex: 1, fontSize: 14, color: COLORS.dangerText, lineHeight: 20 },

  tipsCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: COLORS.border, gap: 8,
  },
  tipsTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary },
  tipText: { fontSize: 13, color: COLORS.textSecondary },

  disclaimer: {
    flexDirection: 'row', gap: 8, backgroundColor: COLORS.warningBg,
    padding: 12, borderRadius: 12, alignItems: 'flex-start',
  },
  disclaimerText: { flex: 1, fontSize: 12, color: '#92400E', lineHeight: 18 },

  // Loading
  loadingContainer: { flex: 1, backgroundColor: '#000' },
  loadingBg: { ...StyleSheet.absoluteFillObject, resizeMode: 'cover', opacity: 0.4 },
  loadingContent: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 36, padding: 24 },
  scanFrame: { width: 240, height: 300, position: 'relative', justifyContent: 'flex-start', overflow: 'hidden' },
  corner: { position: 'absolute', width: 24, height: 24, borderColor: '#5EEAD4', borderWidth: 3 },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  scanLine: { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: '#5EEAD4', shadowColor: '#5EEAD4', shadowOpacity: 0.8, shadowRadius: 4 },
  loadingCard: {
    backgroundColor: 'rgba(255,255,255,0.96)', padding: 24, borderRadius: 22,
    alignItems: 'center', gap: 12, width: '100%',
  },
  loadingIconRow: { marginBottom: 4 },
  loadingIcon: { width: 56, height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  loadingTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  loadingStep: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  loadingStepText: { fontSize: 13, color: COLORS.textSecondary },

  // Results header
  resultsHeader: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },
  resultsHeaderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  resultsTitle: { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  resultsMeta: { fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 4 },
  rescanBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  rescanText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // Medicine cards
  medCard: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 18,
    marginBottom: 12, overflow: 'hidden', backgroundColor: '#fff', ...SHADOWS.sm,
  },
  medHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, backgroundColor: COLORS.lightGray, gap: 12,
  },
  medIndex: { width: 30, height: 30, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  medIndexText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  medName: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  medBriefRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  medBrief: { fontSize: 12, color: COLORS.textSecondary },
  confBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  confText: { fontSize: 10, fontWeight: '700' },

  medBody: { padding: 14, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: COLORS.lightGray, gap: 10 },
  langToggle: {
    flexDirection: 'row', backgroundColor: COLORS.lightGray,
    borderRadius: 10, padding: 3, alignSelf: 'flex-start',
  },
  langBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  langBtnActive: { backgroundColor: COLORS.primary },
  langBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  langBtnTextActive: { color: '#fff' },

  sLabel: { fontSize: 10, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 0.8 },
  medDesc: { fontSize: 14, color: COLORS.textPrimary, lineHeight: 21 },
  genericText: { fontSize: 13, color: COLORS.textSecondary, fontStyle: 'italic' },

  detailGrid: {
    flexDirection: 'row', backgroundColor: COLORS.lightGray, borderRadius: 12, padding: 12,
  },
  detailBox: { flex: 1, alignItems: 'center' },
  detailBoxBorder: { borderRightWidth: 1, borderRightColor: COLORS.border },
  detailLabel: { fontSize: 9, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 0.6, marginBottom: 4 },
  detailValue: { fontSize: 13, fontWeight: '800', color: COLORS.primary, textAlign: 'center' },

  badgeHeader: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  badgeHeaderText: { fontSize: 10, fontWeight: '700', color: COLORS.dangerText, letterSpacing: 0.6 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  dangerBadge: {
    backgroundColor: COLORS.dangerBg, paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, borderColor: COLORS.dangerBorder,
  },
  dangerBadgeText: { color: COLORS.dangerText, fontSize: 12, fontWeight: '500' },
  warningBanner: {
    flexDirection: 'row', gap: 8, backgroundColor: COLORS.dangerBg,
    padding: 12, borderRadius: 12, borderWidth: 1, borderColor: COLORS.dangerBorder,
  },
  warningText: { flex: 1, fontSize: 13, color: COLORS.dangerText, lineHeight: 19 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  priceText: { fontSize: 14, color: '#059669', fontWeight: '700' },
  altCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.successBg, padding: 12, borderRadius: 12,
  },
  altName: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  altType: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  altPrice: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
});
