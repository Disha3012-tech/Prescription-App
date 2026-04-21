import React, { useState, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Animated, LayoutAnimation,
  UIManager, Platform, Dimensions,
} from 'react-native';
import { COLORS } from '../theme';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { API_URL } from '../config';
import { Image } from 'expo-image';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_W } = Dimensions.get('window');

const getCurrencySymbol = (code) => {
    const map = { 'INR': '₹', 'USD': '$', 'GBP': '£', 'EUR': '€', 'CAD': 'C$', 'AUD': 'A$' };
    return map[code] || code;
};

// ─── Single Medicine Card ──────────────────────────────────────────────────
const MedicineCard = ({ item, index, currency }) => {
  const [expanded, setExpanded] = useState(false);
  const [showSimple, setShowSimple] = useState(true);
  const symbol = getCurrencySymbol(currency);
  const mainPrice = parseFloat(item.explanation?.approximate_price || 0);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(prev => !prev);
  };

  const exp = item.explanation || {};

  // Support both history format (item.medicine) and results format (item.name)
  const medicineName = item.medicine || item.name || 'Unknown Medicine';
  const dosage = item.dosage || exp.dosage || '—';
  const frequency = item.frequency || exp.frequency || '—';
  const duration = item.duration || exp.duration || '—';

  return (
    <View style={styles.medCard}>
      <TouchableOpacity style={styles.medHeader} onPress={toggle} activeOpacity={0.7}>
        <View style={styles.medHeaderLeft}>
          <View style={styles.medIndex}>
            <Text style={styles.medIndexText}>{index + 1}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.medName}>{medicineName}</Text>
            <Text style={styles.medBrief}>{dosage} · {frequency}</Text>
          </View>
        </View>
        <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.textSecondary} />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.medBody}>
          {/* Simple / Medical toggle */}
          {(exp.what_it_does || exp.simple_summary) && (
            <View style={styles.langToggle}>
              <TouchableOpacity
                style={[styles.langBtn, showSimple && styles.langBtnActive]}
                onPress={() => setShowSimple(true)}
              >
                <Text style={[styles.langBtnText, showSimple && styles.langBtnTextActive]}>Simple</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.langBtn, !showSimple && styles.langBtnActive]}
                onPress={() => setShowSimple(false)}
              >
                <Text style={[styles.langBtnText, !showSimple && styles.langBtnTextActive]}>Medical</Text>
              </TouchableOpacity>
            </View>
          )}

          {(exp.what_it_does || exp.simple_summary) && (
            <>
              <Text style={styles.sectionLabel}>WHAT IT DOES</Text>
              <Text style={styles.medDesc}>
                {showSimple ? (exp.what_it_does || exp.simple_summary) : (exp.simple_summary || exp.what_it_does)}
              </Text>
            </>
          )}

          {exp.generic_name && (
            <Text style={styles.genericText}>
              Generic: {exp.generic_name}{exp.medicine_class ? ` · ${exp.medicine_class}` : ''}
            </Text>
          )}

          {/* Dosage / Frequency / Duration grid */}
          <View style={styles.detailGrid}>
            {[
              { label: 'DOSAGE', value: dosage },
              { label: 'FREQUENCY', value: frequency },
              { label: 'DURATION', value: duration },
            ].map((d, i) => (
              <View key={i} style={[styles.detailBox, i < 2 && styles.detailBoxBorder]}>
                <Text style={styles.detailLabel}>{d.label}</Text>
                <Text style={styles.detailValue}>{d.value}</Text>
              </View>
            ))}
          </View>

          {exp.how_to_take && (
            <>
              <Text style={styles.sectionLabel}>HOW TO TAKE</Text>
              <Text style={styles.medDesc}>{exp.how_to_take}</Text>
            </>
          )}

          {(exp.common_side_effects || []).length > 0 && (
            <>
              <View style={styles.badgeHeader}>
                <Ionicons name="warning-outline" size={14} color={COLORS.dangerText} />
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
              <Ionicons name="warning" size={16} color={COLORS.dangerText} />
              <Text style={styles.warningText}>{exp.important_warning}</Text>
            </View>
          )}

          {exp.approximate_price && (
            <View style={styles.priceRow}>
              <MaterialCommunityIcons name="cash" size={16} color={COLORS.primary} />
              <Text style={styles.priceText}>
                Price: {symbol} {exp.approximate_price}
              </Text>
            </View>
          )}

          {(exp.generics || exp.alternatives || []).length > 0 && (
            <>
              <View style={[styles.badgeHeader, { marginTop: 16 }]}>
                <MaterialCommunityIcons name="swap-horizontal" size={16} color={COLORS.primary} />
                <Text style={[styles.badgeHeaderText, { color: COLORS.primary }]}>ALTERNATIVES</Text>
              </View>
              {(exp.generics || exp.alternatives || []).map((alt, i) => {
                const altPrice = alt.genericPrice || alt.approximate_price;
                const savings = alt.savingPct || (mainPrice > 0 ? Math.round(((mainPrice - parseFloat(altPrice)) / mainPrice) * 100) : null);
                
                return (
                  <View key={i} style={styles.subCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.subName}>{alt.name}</Text>
                      <Text style={styles.subType}>{alt.manufacturer || alt.type || 'Generic'}</Text>
                    </View>
                    {altPrice ? (
                       <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.altPrice}>{symbol} {altPrice}</Text>
                        {savings > 0 && (
                            <View style={styles.saveBadge}>
                                <Text style={styles.saveText}>Save {savings}%</Text>
                            </View>
                        )}
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </>
          )}
        </View>
      )}
    </View>
  );
};

// ─── Main Screen ───────────────────────────────────────────────────────────
export default function PrescriptionDetailScreen({ route, navigation }) {
  const { record, returnToDashboard } = route?.params || {};
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const imageUri = useMemo(() => {
    if (!record?.image_url) return null;
    return record.image_url.startsWith('http')
      ? record.image_url
      : `${API_URL.replace(/\/$/, '')}${record.image_url}`;
  }, [record?.image_url]);

  if (!record) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerState}>
          <Feather name="alert-circle" size={40} color={COLORS.textSecondary} />
          <Text style={styles.centerText}>Record not found</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const formatDate = (d) => {
    const date = new Date(d);
    return date.toLocaleDateString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  };

  // Get medicines from results (both fullResults and results formats supported)
  const medicines = record.fullResults || record.results || [];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerBack}
            onPress={() => (returnToDashboard ? navigation.navigate('DASHBOARD') : navigation.goBack())}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="arrow-left" size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {record.condition || medicines[0]?.explanation?.medicine_class || 'Medical Visit'}
            </Text>
            <Text style={styles.headerSub}>{formatDate(record.date)}</Text>
          </View>
        </View>

        {/* ── Meta chips ── */}
        <View style={styles.metaRow}>
          {record.country && (
            <View style={styles.metaChip}>
              <Text style={styles.metaChipText}>🌍 {record.country}</Text>
            </View>
          )}
          {record.currency && (
            <View style={styles.metaChip}>
              <Text style={styles.metaChipText}>💱 {record.currency}</Text>
            </View>
          )}
          {record.avg_confidence != null && (
            <View style={styles.metaChip}>
              <Feather name="bar-chart-2" size={12} color={COLORS.primary} />
              <Text style={styles.metaChipText}>
                {Math.round(record.avg_confidence * (record.avg_confidence <= 1 ? 100 : 1))}% confidence
              </Text>
            </View>
          )}
        </View>

        {/* ── Prescription Image ── */}
        <View style={styles.imageSection}>
          <View style={styles.imageSectionHeader}>
            <MaterialCommunityIcons name="image-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.imageSectionTitle}>ORIGINAL PRESCRIPTION</Text>
          </View>

          <View style={styles.imageWrapper}>
            {imageUri && (
              <Image
                key={imageUri}
                source={{ uri: imageUri, cache: 'force-cache' }}
                style={styles.prescriptionImage}
                resizeMode="contain"
                onLoadEnd={() => {
                  if (imageLoading) setImageLoading(false);
                }}
                onError={() => {
                  setImageError(true);
                  setImageLoading(false);
                }}
              />
            )}

            {imageLoading && (
              <View style={styles.imageLoadingOverlay}>
                <MaterialCommunityIcons name="image-outline" size={32} color={COLORS.border} />
                <Text style={styles.imageLoadingText}>Loading image...</Text>
              </View>
            )}

            {imageError && (
              <View style={styles.noImageBox}>
                <Feather name="image" size={32} color={COLORS.border} />
                <Text style={styles.noImageText}>Could not load image</Text>
              </View>
            )}
          </View>
        </View>



        {/* ── Medicine Analysis ── */}
        <View style={styles.medsSection}>
          <View style={styles.medsSectionHeader}>
            <MaterialCommunityIcons name="pill" size={20} color={COLORS.primary} />
            <Text style={styles.medsSectionTitle}>
              Prescribed Medicines ({medicines.length})
            </Text>
          </View>

          {medicines.length === 0 ? (
            <View style={styles.noMedsBox}>
              <Feather name="inbox" size={28} color={COLORS.border} />
              <Text style={styles.noMedsText}>No medicines found in this record</Text>
            </View>
          ) : (
            medicines.map((med, i) => (
              <MedicineCard key={i} item={med} index={i} currency={record.currency} />
            ))
          )}
        </View>

        {/* ── Disclaimer ── */}
        <View style={styles.disclaimer}>
          <Ionicons name="warning" size={15} color={COLORS.warningText} />
          <Text style={styles.disclaimerText}>
            For informational purposes only. Always consult your doctor before changing medication.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },
  centerText: { fontSize: 16, color: COLORS.textSecondary },
  backBtn: {
    backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10,
  },
  backBtnText: { color: COLORS.white, fontWeight: '700' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12,
  },
  headerBack: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  headerSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  // Meta chips
  metaRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    paddingHorizontal: 20, marginBottom: 16,
  },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  metaChipText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },

  // Image section
  imageSection: {
    marginHorizontal: 20, marginBottom: 14,
    backgroundColor: COLORS.white, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border,
    overflow: 'hidden',
  },
  imageSectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  imageSectionTitle: {
    fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 0.6,
  },
  imageWrapper: {
    width: '100%',
    minHeight: 200,
    maxHeight: 420,
    backgroundColor: '#F8F9FA',
  },
  prescriptionImage: {
    width: '100%',
    height: 380,
  },
  imageLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center', gap: 8,
    backgroundColor: '#F8F9FA',
  },
  imageLoadingText: { fontSize: 13, color: COLORS.border },
  noImageBox: {
    height: 160, justifyContent: 'center', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.lightGray,
  },
  noImageText: { fontSize: 13, color: COLORS.textSecondary },

  // Raw OCR text
  rawTextSection: {
    marginHorizontal: 20, marginBottom: 14,
    backgroundColor: COLORS.white, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border,
    overflow: 'hidden',
  },
  rawText: {
    fontSize: 13, color: COLORS.textPrimary, lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    padding: 14, backgroundColor: '#FAFAFA',
  },

  // Medicines section
  medsSection: {
    marginHorizontal: 20, marginBottom: 14,
    backgroundColor: COLORS.white, borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: COLORS.border,
  },
  medsSectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14,
  },
  medsSectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  noMedsBox: {
    alignItems: 'center', paddingVertical: 30, gap: 8,
  },
  noMedsText: { fontSize: 13, color: COLORS.textSecondary },

  // Medicine Card
  medCard: {
    borderWidth: 1, borderColor: COLORS.lightGray,
    borderRadius: 14, marginBottom: 10, overflow: 'hidden',
  },
  medHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, backgroundColor: COLORS.lightGray,
  },
  medHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  medIndex: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.successBg, justifyContent: 'center', alignItems: 'center',
  },
  medIndexText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
  medName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  medBrief: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  medBody: {
    padding: 14, backgroundColor: COLORS.white,
    borderTopWidth: 1, borderTopColor: COLORS.lightGray,
  },
  langToggle: {
    flexDirection: 'row', backgroundColor: COLORS.lightGray,
    borderRadius: 10, padding: 3, marginBottom: 14, alignSelf: 'flex-start',
  },
  langBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  langBtnActive: { backgroundColor: COLORS.primary },
  langBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  langBtnTextActive: { color: COLORS.white },
  sectionLabel: {
    fontSize: 11, fontWeight: '600', color: COLORS.textSecondary,
    letterSpacing: 0.5, marginBottom: 6,
  },
  medDesc: { fontSize: 14, color: COLORS.textPrimary, lineHeight: 21, marginBottom: 14 },
  genericText: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 12, fontStyle: 'italic' },
  detailGrid: {
    flexDirection: 'row', backgroundColor: COLORS.lightGray,
    borderRadius: 10, padding: 12, marginBottom: 14,
  },
  detailBox: { flex: 1, alignItems: 'center' },
  detailBoxBorder: { borderRightWidth: 1, borderRightColor: COLORS.border },
  detailLabel: {
    fontSize: 10, fontWeight: '600', color: COLORS.textSecondary,
    letterSpacing: 0.5, marginBottom: 4,
  },
  detailValue: { fontSize: 13, fontWeight: '700', color: COLORS.primary, textAlign: 'center' },
  badgeHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  badgeHeaderText: { fontSize: 11, fontWeight: '700', color: COLORS.dangerText, letterSpacing: 0.5 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dangerBadge: {
    backgroundColor: COLORS.dangerBg, paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, borderColor: '#FECACA',
  },
  dangerBadgeText: { color: COLORS.dangerText, fontSize: 12, fontWeight: '500' },
  warningBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: COLORS.dangerBg, padding: 12, borderRadius: 10,
    marginTop: 10, borderWidth: 1, borderColor: '#FECACA',
  },
  warningText: { flex: 1, fontSize: 13, color: COLORS.dangerText, lineHeight: 19 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  priceText: { fontSize: 16, color: COLORS.primary, fontWeight: '900' },
  subCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.successBg, padding: 12, borderRadius: 10, marginBottom: 8,
  },
  subName: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 2 },
  subType: { fontSize: 12, color: COLORS.textSecondary },
  altPrice: { fontSize: 15, fontWeight: '900', color: '#27ae60' },
  saveBadge: { backgroundColor: '#27ae60', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
  saveText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  // Disclaimer
  disclaimer: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: COLORS.warningBg, padding: 14,
    marginHorizontal: 20, borderRadius: 12,
  },
  disclaimerText: { flex: 1, fontSize: 12, color: '#92400E', lineHeight: 18 },
});
