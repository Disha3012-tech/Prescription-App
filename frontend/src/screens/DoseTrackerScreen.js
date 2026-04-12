// ─── DoseTrackerScreen.js ────────────────────────────────────────────────────
import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView,
    TextInput, Animated, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SHADOWS } from '../theme';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const generateWeek = () => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() - 3 + i);
        return {
            label: DAYS[d.getDay()],
            date: d.getDate(),
            isToday: i === 3,
            hasDose: i <= 3,
            done: i < 3,
        };
    });
};

export default function DoseTrackerScreen({ user, currentScreen }) {
    const [meds, setMeds] = useState([]);
    const [selectedDay, setSelectedDay] = useState(3);
    const [addingMed, setAddingMed] = useState(false);
    const [newName, setNewName] = useState('');
    const [newDose, setNewDose] = useState('');
    const week = generateWeek();
    const progressAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
        if (user?.id && currentScreen === 'DOSE_TRACKER') fetchMeds();
    }, [user, currentScreen]);

    const fetchMeds = async () => {
        try {
            const response = await fetch(`${API_URL}api/medications?user_id=${user.id}`);
            const data = await response.json();
            setMeds(data);
        } catch (err) { console.error('Error fetching meds:', err); }
    };

    const totalDoses = meds.reduce((acc, m) => acc + (m.times?.length || 0), 0);
    const takenDoses = meds.reduce((acc, m) => acc + (m.times?.filter(t => t.taken).length || 0), 0);
    const pct = totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : 0;

    useEffect(() => {
        Animated.timing(progressAnim, { toValue: pct, duration: 1000, useNativeDriver: false }).start();
    }, [pct]);

    const toggleDose = async (medId, timeId) => {
        setMeds(prev => prev.map(m => {
            if (m.id !== medId) return m;
            return { ...m, times: m.times.map(t => t.id === timeId ? { ...t, taken: !t.taken } : t) };
        }));
        try {
            await fetch(`${API_URL}api/medications/${medId}/times/${timeId}/toggle`, { method: 'PUT' });
        } catch (err) { fetchMeds(); }
    };

    const handleAddMed = async () => {
        if (!newName || !newDose) return;
        try {
            const response = await fetch(`${API_URL}api/medications`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: user.id, name: newName, dose: newDose }),
            });
            if (response.ok) {
                setAddingMed(false); setNewName(''); setNewDose('');
                fetchMeds();
            }
        } catch (err) { console.error('Failed to add med:', err); }
    };

    const handleDeleteMed = async (medId) => {
        try {
            const response = await fetch(`${API_URL}api/medications/${medId}`, { method: 'DELETE' });
            if (response.ok) fetchMeds();
        } catch (err) { console.error('Failed to delete med:', err); }
    };

    const progressWidth = progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
    const getProgressColor = () => pct >= 80 ? ['#059669', '#10B981'] : pct >= 50 ? ['#D97706', '#F59E0B'] : ['#DC2626', '#EF4444'];

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />

            <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

                {/* Header */}
                <LinearGradient colors={['#0A1628', '#0F2535']} style={styles.header}>
                    <View style={styles.bgDeco} />
                    <View style={styles.headerTop}>
                        <View>
                            <Text style={styles.headerTitle}>Dose Tracker</Text>
                            <Text style={styles.headerSub}>Stay consistent, stay healthy</Text>
                        </View>
                        <View style={styles.headerRight}>
                            <View style={styles.streakBadge}>
                                <Text style={styles.streakEmoji}>🔥</Text>
                                <Text style={styles.streakText}>{takenDoses > 0 ? 3 : 0}d</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.addIconBtn}
                                onPress={() => setAddingMed(!addingMed)}
                            >
                                <Feather name={addingMed ? 'x' : 'plus'} size={20} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Progress */}
                    <View style={styles.progressCard}>
                        <View style={styles.progressTop}>
                            <View>
                                <Text style={styles.progressLabel}>Today's Progress</Text>
                                <Text style={styles.progressSub}>{takenDoses} of {totalDoses} doses taken</Text>
                            </View>
                            <Text style={styles.progressPct}>{pct}%</Text>
                        </View>
                        <View style={styles.progressBarBg}>
                            <Animated.View style={[styles.progressBarFill, { width: progressWidth }]}>
                                <LinearGradient colors={getProgressColor()} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
                            </Animated.View>
                        </View>
                        {pct === 100 && totalDoses > 0 && (
                            <View style={styles.allDoneRow}>
                                <Ionicons name="checkmark-circle" size={16} color="#34D399" />
                                <Text style={styles.allDoneText}>All doses complete for today! 🎉</Text>
                            </View>
                        )}
                    </View>
                </LinearGradient>

                {/* Calendar strip */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.calStrip}>
                    {week.map((day, i) => (
                        <TouchableOpacity
                            key={i}
                            style={[styles.dayPill, i === selectedDay && styles.dayPillActive]}
                            onPress={() => setSelectedDay(i)}
                        >
                            <Text style={[styles.dayLabel, i === selectedDay && styles.dayLabelActive]}>{day.label}</Text>
                            <Text style={[styles.dayNum, i === selectedDay && styles.dayNumActive]}>{day.date}</Text>
                            {day.hasDose && (
                                <View style={[styles.dayDot, day.done ? styles.dayDotDone : day.isToday ? styles.dayDotToday : styles.dayDotFuture]} />
                            )}
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Add Med Form */}
                {addingMed && (
                    <Animated.View style={[styles.addForm, { opacity: fadeAnim }]}>
                        <Text style={styles.addFormTitle}>➕ Add Medication</Text>
                        <View style={styles.addFormRow}>
                            <View style={[styles.addInput, { flex: 2 }]}>
                                <TextInput
                                    style={styles.addInputText}
                                    placeholder="Medicine name"
                                    placeholderTextColor={COLORS.textMuted}
                                    value={newName}
                                    onChangeText={setNewName}
                                />
                            </View>
                            <View style={[styles.addInput, { flex: 1 }]}>
                                <TextInput
                                    style={styles.addInputText}
                                    placeholder="Dose"
                                    placeholderTextColor={COLORS.textMuted}
                                    value={newDose}
                                    onChangeText={setNewDose}
                                />
                            </View>
                        </View>
                        <TouchableOpacity onPress={handleAddMed} activeOpacity={0.85}>
                            <LinearGradient colors={['#0D9488', '#0891B2']} style={styles.saveBtn}>
                                <Text style={styles.saveBtnText}>Save Medication</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>
                )}

                {/* Medicine List */}
                <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
                    {meds.length === 0 ? (
                        <View style={styles.emptyState}>
                            <MaterialCommunityIcons name="pill-off" size={40} color={COLORS.border} />
                            <Text style={styles.emptyTitle}>No medications yet</Text>
                            <Text style={styles.emptyText}>Tap + to add your first medication</Text>
                        </View>
                    ) : meds.map(med => (
                        <View key={med.id} style={styles.medSection}>
                            <View style={styles.medSectionHeader}>
                                <View style={[styles.medColorDot, { backgroundColor: med.color || COLORS.primary }]} />
                                <Text style={styles.medSectionName}>{med.name}</Text>
                                <Text style={styles.medSectionDose}>{med.dose}</Text>
                                <TouchableOpacity onPress={() => handleDeleteMed(med.id)} style={styles.deleteBtn}>
                                    <Feather name="trash-2" size={14} color={COLORS.dangerText} />
                                </TouchableOpacity>
                            </View>

                            {(med.times || []).map(t => (
                                <TouchableOpacity
                                    key={t.id}
                                    style={[styles.doseRow, t.taken && styles.doseRowDone]}
                                    onPress={() => toggleDose(med.id, t.id)}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.timeIcon, { backgroundColor: (med.colorBg || COLORS.successBg) }]}>
                                        <MaterialCommunityIcons name={t.icon || 'pill'} size={18} color={med.color || COLORS.primary} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.doseTime, t.taken && styles.doseTimeDone]}>{t.time}</Text>
                                        <Text style={styles.doseLabel}>{t.label}</Text>
                                    </View>
                                    <View style={[
                                        styles.checkCircle,
                                        t.taken && { backgroundColor: med.color || COLORS.primary, borderColor: med.color || COLORS.primary },
                                    ]}>
                                        {t.taken
                                            ? <Feather name="check" size={13} color="#fff" />
                                            : <View style={styles.checkCircleInner} />
                                        }
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    ))}
                </View>

                {/* Tip */}
                <View style={[styles.tipCard, { marginHorizontal: 16 }]}>
                    <LinearGradient colors={['#0D9488', '#0891B2']} style={styles.tipIcon}>
                        <Ionicons name="notifications-outline" size={16} color="#fff" />
                    </LinearGradient>
                    <Text style={styles.tipText}>Set phone reminders for your medicine times to never miss a dose.</Text>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },

    header: { paddingBottom: 24, position: 'relative', overflow: 'hidden' },
    bgDeco: {
        position: 'absolute', width: 220, height: 220, borderRadius: 110,
        backgroundColor: 'rgba(13,148,136,0.1)', top: -80, right: -60,
    },
    headerTop: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
    },
    headerTitle: { fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
    headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    streakBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: 'rgba(245,158,11,0.2)', paddingHorizontal: 10, paddingVertical: 6,
        borderRadius: 12, borderWidth: 1, borderColor: 'rgba(252,211,77,0.3)',
    },
    streakEmoji: { fontSize: 14 },
    streakText: { fontSize: 12, fontWeight: '800', color: '#FCD34D' },
    addIconBtn: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    },

    progressCard: {
        marginHorizontal: 20, backgroundColor: 'rgba(255,255,255,0.07)',
        borderRadius: 18, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    },
    progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    progressLabel: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
    progressSub: { fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
    progressPct: { fontSize: 30, fontWeight: '900', color: '#fff', letterSpacing: -1 },
    progressBarBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 4, overflow: 'hidden' },
    progressBarFill: { height: 8, borderRadius: 4, minWidth: 4, overflow: 'hidden' },
    allDoneRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
    allDoneText: { fontSize: 13, fontWeight: '600', color: '#34D399' },

    calStrip: { paddingHorizontal: 16, paddingVertical: 16, gap: 8 },
    dayPill: {
        alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12,
        borderRadius: 14, backgroundColor: COLORS.white,
        borderWidth: 1, borderColor: COLORS.border, gap: 4, minWidth: 52, ...SHADOWS.sm,
    },
    dayPillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    dayLabel: { fontSize: 10, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 0.3 },
    dayLabelActive: { color: 'rgba(255,255,255,0.75)' },
    dayNum: { fontSize: 17, fontWeight: '900', color: COLORS.textPrimary },
    dayNumActive: { color: '#fff' },
    dayDot: { width: 5, height: 5, borderRadius: 2.5 },
    dayDotDone: { backgroundColor: '#34D399' },
    dayDotToday: { backgroundColor: COLORS.warningText },
    dayDotFuture: { backgroundColor: COLORS.border },

    addForm: {
        marginHorizontal: 16, marginBottom: 16, backgroundColor: '#fff',
        borderRadius: 18, padding: 18, borderWidth: 1, borderColor: COLORS.border,
        ...SHADOWS.sm, gap: 12,
    },
    addFormTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
    addFormRow: { flexDirection: 'row', gap: 10 },
    addInput: {
        backgroundColor: COLORS.lightGray, borderRadius: 12, paddingHorizontal: 14,
        paddingVertical: 11, borderWidth: 1, borderColor: COLORS.border,
    },
    addInputText: { fontSize: 14, color: COLORS.textPrimary },
    saveBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

    emptyState: {
        alignItems: 'center', paddingVertical: 48, gap: 10,
        backgroundColor: '#fff', borderRadius: 20, marginVertical: 8,
        borderWidth: 1.5, borderColor: COLORS.border, borderStyle: 'dashed',
    },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
    emptyText: { fontSize: 13, color: COLORS.textSecondary },

    medSection: {
        backgroundColor: '#fff', borderRadius: 18, marginBottom: 14,
        borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', ...SHADOWS.sm,
    },
    medSectionHeader: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.lightGray,
        borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    medColorDot: { width: 10, height: 10, borderRadius: 5 },
    medSectionName: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary, flex: 1 },
    medSectionDose: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
    deleteBtn: { padding: 4 },

    doseRow: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        paddingHorizontal: 16, paddingVertical: 13,
        borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    doseRowDone: { opacity: 0.6 },
    timeIcon: { width: 40, height: 40, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
    doseTime: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
    doseTimeDone: { textDecorationLine: 'line-through', color: COLORS.textSecondary },
    doseLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
    checkCircle: {
        width: 30, height: 30, borderRadius: 15,
        borderWidth: 2, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center',
    },
    checkCircleInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.lightGray },

    tipCard: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        padding: 14, backgroundColor: COLORS.successBg,
        borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, marginTop: 8,
    },
    tipIcon: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    tipText: { flex: 1, fontSize: 13, color: COLORS.primaryDark, lineHeight: 19 },
});
