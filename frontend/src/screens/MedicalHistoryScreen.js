import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView,
  TextInput, ActivityIndicator, Modal, Pressable, StatusBar, Animated, Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SHADOWS } from '../theme';
import { MaterialCommunityIcons, Feather, Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';

const STAT_COLORS = [
  { colors: ['#0D9488', '#0891B2'], icon: 'file-document-outline' },
  { colors: ['#7C3AED', '#6D28D9'], icon: 'clipboard-pulse-outline' },
  { colors: ['#F59E0B', '#D97706'], icon: 'calendar-month-outline' },
];

export default function MedicalHistoryScreen({ user, navigate }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState('');
  const [newCondition, setNewCondition] = useState('');
  const [newDoctor, setNewDoctor] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: false }).start();
    if (user?.id) fetchHistory();
  }, [user]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}api/prescriptions/history?user_id=${user.id}`);
      const data = await response.json();
      if (data.status === 'success') {
        const formatted = data.history.map(item => ({
          id: item.id,
          date: item.date,
          condition: item.results?.[0]?.explanation?.medicine_class || 'General Checkup',
          doctor: item.results?.[0]?.explanation?.brand_name || 'Prescription Scan',
          medicines: item.results.map(r => r.medicine),
          fullResults: item.results,
          notes: item.results?.[0]?.explanation?.what_it_does || item.raw_text?.substring(0, 100),
          image_url: item.image_url ? (item.image_url.startsWith('http') ? item.image_url : `${API_URL.replace(/\/$/, '')}${item.image_url}`) : null,
          raw_image_url: item.image_url,
          raw_text: item.raw_text,
          avg_confidence: item.avg_confidence,
          country: item.country,
          currency: item.currency,
        }));
        setRecords(formatted);
      }
    } catch (err) { console.error('Error fetching history:', err); }
    finally { setLoading(false); }
  };

  const handleAdd = async () => {
    if (!newCondition) return;
    try {
      const response = await fetch(`${API_URL}api/prescriptions/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          condition: newCondition,
          doctor: newDoctor || 'Unknown Doctor',
          notes: newNotes,
        }),
      });
      if (response.ok) {
        setAdding(false);
        setNewCondition('');
        setNewDoctor('');
        setNewNotes('');
        fetchHistory();
      }
    } catch (err) { console.error('Error adding record:', err); }
  };

  const handleDeleteRecord = (id) => {
    setDeleteConfirm(id);
  };

  const deleteRecord = async (id) => {
    try {
      const response = await fetch(`${API_URL}api/prescriptions/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setExpanded(null);
        setDeleteConfirm(null);
        fetchHistory();
      }
    } catch (err) {
      console.log(err);
    }
  };

  const filtered = records.filter(r =>
    r.condition.toLowerCase().includes(search.toLowerCase()) ||
    r.doctor.toLowerCase().includes(search.toLowerCase())
  );

  const stats = [
    { label: 'Total Scans', value: records.length.toString() },
    { label: 'Conditions', value: [...new Set(records.map(r => r.condition))].length.toString() },
    { label: 'This Month', value: records.filter(r => new Date(r.date).getMonth() === new Date().getMonth()).length.toString() },
  ];

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const activeRecord = records.find(r => r.id === expanded);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Delete Confirmation Modal */}
      <Modal visible={!!deleteConfirm} transparent animationType="fade" onRequestClose={() => setDeleteConfirm(null)}>
        <Pressable style={styles.confirmBackdrop} onPress={() => setDeleteConfirm(null)}>
          <Pressable style={styles.confirmDialog} onPress={(e) => e.stopPropagation()}>
            <View style={styles.confirmIcon}>
              <Feather name="alert-triangle" size={28} color={COLORS.dangerText} />
            </View>
            <Text style={styles.confirmTitle}>Delete Record?</Text>
            <Text style={styles.confirmMessage}>
              This prescription will be permanently removed from your history. This action cannot be undone.
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={styles.confirmBtnCancel}
                onPress={() => setDeleteConfirm(null)}
                activeOpacity={0.7}
              >
                <Text style={styles.confirmBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtnDelete}
                onPress={() => deleteRecord(deleteConfirm)}
                activeOpacity={0.7}
              >
                <LinearGradient colors={['#DC2626', '#B91C1C']} style={styles.confirmBtnDeleteGradient}>
                  <Text style={styles.confirmBtnDeleteText}>Delete</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Bottom Sheet Modal */}
      <Modal visible={!!expanded} transparent animationType="slide" onRequestClose={() => setExpanded(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setExpanded(null)}>
          <Pressable
            style={styles.sheet}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.sheetHandle} />
            <View style={styles.sheetTitleRow}>
              <Text style={styles.sheetTitle} numberOfLines={1}>{activeRecord?.condition}</Text>
              <Text style={styles.sheetMeta}>{activeRecord?.medicines?.length || 0} medicines</Text>
            </View>

            <TouchableOpacity
              style={styles.sheetOption}
              onPress={() => {
                if (!activeRecord) return;
                setExpanded(null);
                navigate('PRESCRIPTION_DETAIL', { record: activeRecord, refreshHistory: fetchHistory });
              }}
            >
              <LinearGradient colors={['#0D9488', '#0891B2']} style={styles.sheetOptionIcon}>
                <Feather name="eye" size={16} color="#fff" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetOptionLabel}>View Prescription</Text>
                <Text style={styles.sheetOptionSub}>Full analysis & original image</Text>
              </View>
              <Feather name="chevron-right" size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetOption}
              onPress={() => {
                if (!activeRecord) return;
                setExpanded(null);

                const highlights = (activeRecord.fullResults || []).map(r => ({
                  medicine: r.medicine || r.name,
                  bbox: r.bbox,
                  confidence: r.confidence || 0.8,
                  uncertain: r.uncertain || false,
                }));

                const rawRes = {
                  results: activeRecord.fullResults,
                  raw_text: activeRecord.raw_text,
                  avg_confidence: activeRecord.avg_confidence,
                  image_url: activeRecord.raw_image_url,
                };

                navigate('CONFIRM_MEDICINES', {
                  imageUri: activeRecord.image_url,
                  image_url: activeRecord.raw_image_url,
                  medicineHighlights: highlights,
                  rawResult: rawRes,
                  country: activeRecord.country || 'India',
                  currency: activeRecord.currency || 'INR',
                  userId: user.id,
                  prescriptionId: activeRecord.id,
                  isEditing: true
                });
              }}
            >
              <LinearGradient colors={['#7C3AED', '#6D28D9']} style={styles.sheetOptionIcon}>
                <Feather name="edit-3" size={16} color="#fff" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetOptionLabel}>Edit Record</Text>
                <Text style={styles.sheetOptionSub}>Re-evaluate scan results</Text>
              </View>
              <Feather name="chevron-right" size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>

            <View style={styles.sheetDivider} />

            <TouchableOpacity
              style={styles.sheetOption}
              onPress={() => {
                setExpanded(null);
                setTimeout(() => handleDeleteRecord(expanded), 300);
              }}
            >
              <View style={[styles.sheetOptionIcon, { backgroundColor: COLORS.dangerBg }]}>
                <Feather name="trash-2" size={16} color={COLORS.dangerText} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sheetOptionLabel, { color: COLORS.dangerText }]}>Delete Record</Text>
                <Text style={styles.sheetOptionSub}>Cannot be undone</Text>
              </View>
              <Feather name="chevron-right" size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetCancel} onPress={() => setExpanded(null)}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <LinearGradient colors={['#0A1628', '#0F2535']} style={styles.header}>
          <View style={styles.bgCircle} />
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerTitle}>Medical History</Text>
              <Text style={styles.headerSub}>Your complete health record</Text>
            </View>
            <TouchableOpacity
              style={[styles.addBtn, adding && { backgroundColor: 'rgba(220,38,38,0.3)' }]}
              onPress={() => setAdding(!adding)}
            >
              <Feather name={adding ? 'x' : 'plus'} size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* User card */}
          <View style={styles.userCard}>
            <LinearGradient colors={['#0D9488', '#0891B2']} style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>{(user?.name || user?.full_name || 'U')[0].toUpperCase()}</Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName}>{user?.name || user?.full_name || 'Patient'}</Text>
              <Text style={styles.userEmail}>{user?.email || ''}</Text>
            </View>
            <View style={styles.verifiedBadge}>
              <Ionicons name="shield-checkmark" size={13} color="#34D399" />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            {stats.map((s, i) => (
              <View key={i} style={styles.statCard}>
                <LinearGradient colors={STAT_COLORS[i].colors} style={styles.statIcon}>
                  <MaterialCommunityIcons name={STAT_COLORS[i].icon} size={16} color="#fff" />
                </LinearGradient>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {loading && <ActivityIndicator color={COLORS.primary} style={{ marginTop: 30 }} />}

        {/* Add Form */}
        {adding && (
          <Animated.View style={[styles.addForm, { opacity: fadeAnim }]}>
            <Text style={styles.addFormTitle}>New Health Record</Text>
            {[
              { label: 'Condition / Diagnosis', value: newCondition, set: setNewCondition, placeholder: 'e.g. Seasonal Allergies' },
              { label: 'Doctor Name', value: newDoctor, set: setNewDoctor, placeholder: 'e.g. Dr. Sharma' },
              { label: 'Notes', value: newNotes, set: setNewNotes, placeholder: 'Additional notes...', multiline: true },
            ].map((field, i) => (
              <View key={i} style={styles.formField}>
                <Text style={styles.formLabel}>{field.label}</Text>
                <TextInput
                  style={[styles.formInput, field.multiline && { height: 80, textAlignVertical: 'top' }]}
                  placeholder={field.placeholder}
                  placeholderTextColor={COLORS.textMuted}
                  value={field.value}
                  onChangeText={field.set}
                  multiline={field.multiline}
                />
              </View>
            ))}
            <TouchableOpacity onPress={handleAdd} activeOpacity={0.85}>
              <LinearGradient colors={['#0D9488', '#0891B2']} style={styles.saveBtn}>
                <Feather name="check" size={16} color="#fff" />
                <Text style={styles.saveBtnText}>Save Record</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Search */}
        <View style={styles.searchBar}>
          <Feather name="search" size={16} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search records..."
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Feather name="x" size={15} color={COLORS.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Section header */}
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Past Records</Text>
          <View style={styles.listCountBadge}>
            <Text style={styles.listCount}>{filtered.length}</Text>
          </View>
        </View>

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={44} color={COLORS.border} />
            <Text style={styles.emptyTitle}>No records found</Text>
            <Text style={styles.emptyText}>Scan a prescription to get started</Text>
          </View>
        )}

        {/* Records */}
        {filtered.map((record, i) => (
          <Animated.View key={record.id} style={{ opacity: fadeAnim }}>
            <TouchableOpacity
              style={styles.recordCard}
              onPress={() => navigate('PRESCRIPTION_DETAIL', { record, refreshHistory: fetchHistory })}
              activeOpacity={0.8}
            >
              <View style={styles.recordLeft}>
                <LinearGradient colors={['#0D9488', '#0891B2']} style={styles.recordIcon}>
                  <MaterialCommunityIcons name="clipboard-pulse" size={16} color="#fff" />
                </LinearGradient>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.recordCondition}>{record.condition}</Text>
                <Text style={styles.recordMeta}>{formatDate(record.date)}</Text>
                {record.medicines?.length > 0 && (
                  <View style={styles.recordMedBadge}>
                    <MaterialCommunityIcons name="pill" size={10} color={COLORS.primary} />
                    <Text style={styles.recordMedText}>{record.medicines.slice(0, 2).join(', ')}{record.medicines.length > 2 ? ` +${record.medicines.length - 2}` : ''}</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={styles.menuBtn}
                onPress={(e) => { e.stopPropagation(); setExpanded(record.id); }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialCommunityIcons name="dots-vertical" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </TouchableOpacity>
          </Animated.View>
        ))}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Delete Confirmation Modal
  confirmBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  confirmDialog: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    ...SHADOWS.xl,
  },
  confirmIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.dangerBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmBtnCancel: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: COLORS.lightGray,
    borderRadius: 14,
    alignItems: 'center',
  },
  confirmBtnCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  confirmBtnDelete: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  confirmBtnDeleteGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmBtnDeleteText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },

  // Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 26, borderTopRightRadius: 26,
    paddingHorizontal: 20, paddingBottom: 36, paddingTop: 12,
    ...SHADOWS.lg,
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 18 },
  sheetTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary, flex: 1 },
  sheetMeta: {
    fontSize: 12, fontWeight: '600', color: COLORS.primary,
    backgroundColor: COLORS.successBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
  },
  sheetOption: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  sheetOptionIcon: {
    width: 42, height: 42, borderRadius: 13, justifyContent: 'center', alignItems: 'center',
  },
  sheetOptionLabel: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  sheetOptionSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  sheetDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 4 },
  sheetCancel: {
    marginTop: 12, paddingVertical: 14, backgroundColor: COLORS.lightGray,
    borderRadius: 14, alignItems: 'center',
  },
  sheetCancelText: { fontSize: 15, fontWeight: '700', color: COLORS.textSecondary },

  // Header
  header: { paddingBottom: 24, position: 'relative', overflow: 'hidden' },
  bgCircle: {
    position: 'absolute', width: 240, height: 240, borderRadius: 120,
    backgroundColor: 'rgba(13,148,136,0.08)', top: -80, right: -60,
  },
  headerTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
  },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  addBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },

  userCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginHorizontal: 20, marginBottom: 14,
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  userAvatar: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center' },
  userAvatarText: { fontSize: 18, fontWeight: '900', color: '#fff' },
  userName: { fontSize: 15, fontWeight: '800', color: '#fff' },
  userEmail: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(52,211,153,0.15)', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(52,211,153,0.25)',
  },
  verifiedText: { fontSize: 11, fontWeight: '700', color: '#34D399' },

  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10 },
  statCard: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14,
    padding: 14, alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  statIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  statLabel: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.45)', textAlign: 'center' },

  // Add form
  addForm: {
    marginHorizontal: 16, marginTop: 16, backgroundColor: '#fff',
    borderRadius: 20, padding: 20, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  addFormTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 16 },
  formField: { marginBottom: 14 },
  formLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 7, letterSpacing: 0.3 },
  formInput: {
    backgroundColor: COLORS.lightGray, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 15, color: COLORS.textPrimary, borderWidth: 1, borderColor: COLORS.border,
  },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 14, marginTop: 4,
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Search
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginTop: 16, marginBottom: 8,
    paddingHorizontal: 14, height: 48, backgroundColor: '#fff',
    borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.textPrimary },

  // Records
  listHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  listTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  listCountBadge: {
    backgroundColor: COLORS.primary, width: 24, height: 24, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  listCount: { fontSize: 11, fontWeight: '800', color: '#fff' },

  emptyState: {
    alignItems: 'center', paddingVertical: 48, gap: 10, marginHorizontal: 16,
    backgroundColor: '#fff', borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.border, borderStyle: 'dashed',
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  emptyText: { fontSize: 13, color: COLORS.textSecondary },

  recordCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginHorizontal: 16, marginBottom: 10, padding: 14,
    backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  recordLeft: {},
  recordIcon: { width: 40, height: 40, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  recordCondition: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  recordMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  recordMedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6,
    backgroundColor: COLORS.successBg, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8, alignSelf: 'flex-start',
  },
  recordMedText: { fontSize: 11, fontWeight: '600', color: COLORS.primary },
  menuBtn: { padding: 4 },
});
