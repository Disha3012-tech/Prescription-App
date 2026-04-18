import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    SafeAreaView, StatusBar, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, SHADOWS, RADIUS } from '../theme';
import { MaterialCommunityIcons, Feather, Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';

const ADDITIONAL_FEATURES = [
    { label: 'Pharmacy', icon: 'map-marker-radius-outline', bg: ['#F43F5E', '#E11D48'], screen: 'PHARMACY' },
    { label: 'Timeline', icon: 'timeline-clock-outline', bg: GRADIENTS.teal, screen: 'PRESCRIPTION_TIMELINE' },
    { label: 'Family', icon: 'account-group-outline', bg: GRADIENTS.purple, screen: 'FAMILY_PROFILE' },
    { label: 'Guide', icon: 'book-open-variant', bg: ['#F59E0B', '#D97706'], screen: 'MEDICINE_EXPLAINER' },
    { label: 'Reminders', icon: 'bell-ring-outline', bg: ['#EF4444', '#DC2626'], screen: 'REFILL_REMINDER' },
    { label: 'Symptoms', icon: 'stethoscope', bg: ['#8B5CF6', '#7C3AED'], screen: 'SYMPTOM_LOOKUP' },
];

// Additional feature cards for the dashboard
const FEATURE_CARDS = [
    {
        label: 'Prescription Timeline',
        icon: 'timeline-clock-outline',
        gradient: GRADIENTS.teal,
        screen: 'PRESCRIPTION_TIMELINE',
        description: 'Track your medication history'
    },
    {
        label: 'Family Profiles',
        icon: 'account-group-outline',
        gradient: GRADIENTS.purple,
        screen: 'FAMILY_PROFILE',
        description: 'Manage family medications'
    },
    {
        label: 'Medicine Guide',
        icon: 'book-open-variant',
        gradient: ['#F59E0B', '#D97706'],
        screen: 'MEDICINE_EXPLAINER',
        description: 'Learn about your medicines'
    },
    {
        label: 'Refill Reminders',
        icon: 'bell-ring-outline',
        gradient: ['#EF4444', '#DC2626'],
        screen: 'REFILL_REMINDER',
        description: 'Never run out of meds'
    },
    {
        label: 'Symptom Lookup',
        icon: 'stethoscope',
        gradient: ['#8B5CF6', '#7C3AED'],
        screen: 'SYMPTOM_LOOKUP',
        description: 'Check your symptoms'
    },
];

export default function DashboardScreen({ user, navigate }) {
    const [meds, setMeds] = useState([]);
    const [recentScans, setRecentScans] = useState([]);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(24)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
        ]).start();
        if (user?.id) fetchDashboardData();
    }, [user]);

    const fetchDashboardData = async () => {
        try {
            const [histRes, medsRes] = await Promise.all([
                fetch(`${API_URL}api/prescriptions/history?user_id=${user.id}`),
                fetch(`${API_URL}api/medications?user_id=${user.id}`),
            ]);
            const data = await histRes.json();
            if (data.status === 'success') {
                const formattedScans = data.history.map(item => {
                    const d = new Date(item.date);
                    const isToday = new Date().toDateString() === d.toDateString();
                    return {
                        id: item.id,
                        date: isToday ? 'Today' : d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
                        doctor: item.results?.[0]?.explanation?.brand_name || 'Rx Scan',
                        meds: item.results ? item.results.length : 0,
                        condition: item.results?.[0]?.explanation?.medicine_class || 'General',
                        fullRecord: {
                            id: item.id, date: item.date,
                            condition: item.results?.[0]?.explanation?.medicine_class || 'General Checkup',
                            doctor: item.results?.[0]?.explanation?.brand_name || 'Prescription Scan',
                            medicines: item.results ? item.results.map(r => r.medicine) : [],
                            fullResults: item.results,
                            notes: item.results?.[0]?.explanation?.what_it_does || item.raw_text?.substring(0, 100),
                            image_url: item.image_url ? (item.image_url.startsWith('http') ? item.image_url : `${API_URL.replace(/\/$/, '')}${item.image_url}`) : null,
                            raw_text: item.raw_text, avg_confidence: item.avg_confidence,
                            country: item.country, currency: item.currency,
                        },
                    };
                }).slice(0, 5);
                setRecentScans(formattedScans);
            }
            const medsData = await medsRes.json();
            if (medsData && Array.isArray(medsData)) {
                let flat = [];
                medsData.forEach(med => {
                    (med.times || []).forEach(t => {
                        flat.push({ id: `${med.id}_${t.id}`, medId: med.id, timeId: t.id, name: med.name, dose: med.dose, time: t.time, label: t.label, taken: t.taken, icon: t.icon || 'pill' });
                    });
                });
                setMeds(flat);
            }
        } catch (err) { console.error('Dashboard fetch error:', err); }
    };

    const takenCount = meds.filter(m => m.taken).length;
    const adherencePct = meds.length > 0 ? Math.round((takenCount / meds.length) * 100) : 0;

    const toggleMed = async (id) => {
        const med = meds.find(m => m.id === id);
        if (!med) return;
        setMeds(prev => prev.map(m => m.id === id ? { ...m, taken: !m.taken } : m));
        if (med.medId && med.timeId) {
            try { await fetch(`${API_URL}api/medications/${med.medId}/times/${med.timeId}/toggle`, { method: 'PUT' }); } catch (_) { }
        }
    };

    const getGreeting = () => {
        const h = new Date().getHours();
        if (h < 12) return 'Good morning';
        if (h < 17) return 'Good afternoon';
        return 'Good evening';
    };

    const healthScore = meds.length === 0 ? 72 : Math.min(100, Math.round(40 + adherencePct * 0.6));
    const firstName = user?.name?.split(' ')[0] || user?.full_name?.split(' ')[0] || 'there';

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.midnight} />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

                {/* ── Dark Header ── */}
                <LinearGradient colors={GRADIENTS.hero} style={styles.header}>
                    <View style={styles.bgDeco1} />
                    <View style={styles.bgDeco2} />

                    {/* Top row */}
                    <View style={styles.headerTop}>
                        <View>
                            <Text style={styles.greeting}>{getGreeting()}</Text>
                            <Text style={styles.userName}>{firstName} 👋</Text>
                        </View>
                        <View style={styles.headerActions}>
                            <TouchableOpacity style={styles.headerBtn} onPress={() => navigate('HISTORY')}>
                                <MaterialCommunityIcons name="clipboard-text-outline" size={19} color="rgba(255,255,255,0.8)" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => navigate('PROFILE')}>
                                <LinearGradient colors={GRADIENTS.teal} style={styles.avatarGradient}>
                                    <Text style={styles.avatarText}>{(user?.name || user?.full_name || 'U')[0].toUpperCase()}</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Health Card */}
                    <View style={styles.healthCard}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.healthCardLabel}>Health Score</Text>
                            <Text style={styles.healthScore}>{healthScore}</Text>
                            <View style={styles.trendRow}>
                                <Ionicons name="trending-up" size={13} color="#34D399" />
                                <Text style={styles.trendText}>+3 this week</Text>
                            </View>
                            <View style={styles.adherenceRow}>
                                <View style={styles.adherenceBarBg}>
                                    <View style={[styles.adherenceBarFill, { width: `${adherencePct}%` }]} />
                                </View>
                                <Text style={styles.adherencePct}>{adherencePct}%</Text>
                            </View>
                            <Text style={styles.adherenceLabel}>{takenCount}/{meds.length} doses today</Text>
                        </View>
                        <View style={styles.scoreCircleWrap}>
                            <View style={styles.scoreCircle}>
                                <Text style={styles.scoreCircleVal}>{healthScore}</Text>
                                <Text style={styles.scoreCircleSub}>/ 100</Text>
                            </View>
                            <View style={styles.streakBadge}>
                                <Text style={styles.streakEmoji}>🔥</Text>
                                <Text style={styles.streakText}>{takenCount > 0 ? 3 : 0} day streak</Text>
                            </View>
                        </View>
                    </View>
                </LinearGradient>

                {/* ── Additional Features ── */}
                <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                    <Text style={styles.sectionTitle}>Additional Features</Text>

                    <View style={[styles.actionsGrid, { flexWrap: 'wrap' }]}>
                        {ADDITIONAL_FEATURES.map((action, i) => (
                            <TouchableOpacity
                                key={i}
                                style={[styles.actionCard, { width: '22%', marginBottom: 14 }]}
                                onPress={() => navigate(action.screen)}
                                activeOpacity={0.8}
                            >
                                <LinearGradient colors={action.bg} style={styles.actionIconBox}>
                                    <MaterialCommunityIcons name={action.icon} size={22} color="#fff" />
                                </LinearGradient>
                                <Text style={styles.actionLabel}>{action.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </Animated.View>

                {/* ── Today's Medicines ── */}
                <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Today's Medicines</Text>
                        <TouchableOpacity onPress={() => navigate('DOSE_TRACKER')} style={styles.seeAllBtn}>
                            <Text style={styles.seeAllText}>See all</Text>
                            <Feather name="chevron-right" size={13} color={COLORS.primary} />
                        </TouchableOpacity>
                    </View>

                    {meds.length === 0 ? (
                        <TouchableOpacity style={styles.emptyCard} onPress={() => navigate('SCANNER')}>
                            <LinearGradient colors={GRADIENTS.teal} style={styles.emptyIcon}>
                                <MaterialCommunityIcons name="pill-multiple" size={26} color="#fff" />
                            </LinearGradient>
                            <Text style={styles.emptyTitle}>No medicines yet</Text>
                            <Text style={styles.emptyText}>Scan a prescription to track your doses</Text>
                            <View style={styles.emptyCtaBtn}>
                                <Text style={styles.emptyCtaText}>Scan Now →</Text>
                            </View>
                        </TouchableOpacity>
                    ) : (
                        meds.slice(0, 4).map(med => (
                            <TouchableOpacity
                                key={med.id}
                                style={[styles.medRow, med.taken && styles.medRowDone]}
                                onPress={() => toggleMed(med.id)}
                                activeOpacity={0.75}
                            >
                                <View style={[styles.medTimeBox, med.taken && styles.medTimeBoxDone]}>
                                    <Text style={[styles.medTimeHour, med.taken && styles.textDone]}>
                                        {med.time.split(':')[0]}
                                    </Text>
                                    <Text style={[styles.medTimeAMPM, med.taken && styles.textDone]}>
                                        {med.time.toUpperCase().includes('PM') ? 'PM' : 'AM'}
                                    </Text>
                                </View>
                                <View style={[styles.medIconBox, med.taken && styles.medIconBoxDone]}>
                                    <MaterialCommunityIcons name={med.icon} size={19} color={med.taken ? COLORS.textMuted : COLORS.primary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.medName, med.taken && styles.medNameDone]}>{med.name}</Text>
                                    <Text style={styles.medDose}>{med.dose}{med.dose && med.label ? ' • ' : ''}{med.label || ''}</Text>
                                </View>
                                <View style={[styles.medCheck, med.taken && styles.medCheckDone]}>
                                    {med.taken
                                        ? <Feather name="check" size={13} color="#fff" />
                                        : <View style={styles.medCheckEmpty} />
                                    }
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </Animated.View>

                {/* ── Recent Prescriptions ── */}
                <Animated.View style={{ opacity: fadeAnim }}>
                    <View style={[styles.sectionHeader, { paddingHorizontal: 20, marginBottom: 0 }]}>
                        <Text style={styles.sectionTitle}>Recent Rx</Text>
                        <TouchableOpacity onPress={() => navigate('HISTORY')} style={styles.seeAllBtn}>
                            <Text style={styles.seeAllText}>See all</Text>
                            <Feather name="chevron-right" size={13} color={COLORS.primary} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rxScrollContent}>
                        <TouchableOpacity style={styles.rxCardNew} onPress={() => navigate('SCANNER')}>
                            <LinearGradient colors={GRADIENTS.teal} style={styles.rxNewIconBox}>
                                <Feather name="plus" size={22} color="#fff" />
                            </LinearGradient>
                            <Text style={styles.rxNewText}>Scan New{'\n'}Prescription</Text>
                        </TouchableOpacity>
                        {recentScans.map(scan => (
                            <TouchableOpacity
                                key={scan.id}
                                style={styles.rxCard}
                                onPress={() => navigate('PRESCRIPTION_DETAIL', { record: scan.fullRecord, refreshHistory: fetchDashboardData })}
                                activeOpacity={0.8}
                            >
                                <View style={styles.rxCardTop}>
                                    <LinearGradient colors={GRADIENTS.teal} style={styles.rxIconBox}>
                                        <Feather name="file-text" size={14} color="#fff" />
                                    </LinearGradient>
                                    <Text style={styles.rxDate}>{scan.date}</Text>
                                </View>
                                <Text style={styles.rxCondition} numberOfLines={2}>{scan.condition}</Text>
                                <View style={styles.rxMedsBadge}>
                                    <MaterialCommunityIcons name="pill" size={11} color={COLORS.primary} />
                                    <Text style={styles.rxMedsText}>{scan.meds} meds</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </Animated.View>


                {/* ── Insight Card ── */}
                <View style={styles.section}>
                    <LinearGradient colors={['#0F766E', '#0891B2']} style={styles.insightCard}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.insightTag}>💡  HEALTH TIP</Text>
                            <Text style={styles.insightTitle}>Generic = Same Medicine</Text>
                            <Text style={styles.insightBody}>Generic medicines contain identical active ingredients. Ask your pharmacist about generics to save up to 80%.</Text>
                        </View>
                        <MaterialCommunityIcons name="lightbulb-on-outline" size={44} color="rgba(255,255,255,0.18)" />
                    </LinearGradient>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },

    // Header
    header: { paddingBottom: 28, overflow: 'hidden', position: 'relative' },
    bgDeco1: {
        position: 'absolute', width: 200, height: 200, borderRadius: 100,
        backgroundColor: 'rgba(13,148,136,0.1)', top: -50, right: -50,
    },
    bgDeco2: {
        position: 'absolute', width: 150, height: 150, borderRadius: 75,
        backgroundColor: 'rgba(8,145,178,0.07)', bottom: 0, left: -30,
    },
    headerTop: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 24, paddingTop: 20, paddingBottom: 18,
    },
    greeting: { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '600', letterSpacing: 0.3 },
    userName: { fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: -0.5, marginTop: 2 },
    headerActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    headerBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    },
    avatarGradient: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontSize: 15, fontWeight: '800', color: '#fff' },

    healthCard: {
        marginHorizontal: 20, backgroundColor: 'rgba(255,255,255,0.07)',
        borderRadius: 20, padding: 18, flexDirection: 'row', alignItems: 'center',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.11)',
    },
    healthCardLabel: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginBottom: 2 },
    healthScore: { fontSize: 44, fontWeight: '900', color: '#fff', lineHeight: 50, letterSpacing: -1 },
    trendRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
    trendText: { fontSize: 12, fontWeight: '600', color: '#34D399' },
    adherenceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    adherenceBarBg: { flex: 1, height: 5, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3, overflow: 'hidden' },
    adherenceBarFill: { height: 5, backgroundColor: '#5EEAD4', borderRadius: 3 },
    adherencePct: { fontSize: 11, fontWeight: '700', color: '#5EEAD4', minWidth: 30 },
    adherenceLabel: { fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: '500' },
    scoreCircleWrap: { alignItems: 'center', gap: 10, paddingLeft: 14 },
    scoreCircle: {
        width: 68, height: 68, borderRadius: 34,
        backgroundColor: 'rgba(13,148,136,0.25)', justifyContent: 'center', alignItems: 'center',
        borderWidth: 2, borderColor: 'rgba(94,234,212,0.35)',
    },
    scoreCircleVal: { fontSize: 19, fontWeight: '900', color: '#fff' },
    scoreCircleSub: { fontSize: 9, fontWeight: '600', color: 'rgba(255,255,255,0.45)' },
    streakBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: 'rgba(245,158,11,0.2)', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10,
    },
    streakEmoji: { fontSize: 13 },
    streakText: { fontSize: 10, fontWeight: '700', color: '#FCD34D' },

    // Sections
    section: { paddingHorizontal: 20, marginTop: 28 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    sectionTitle: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 14 },
    seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 14 },
    seeAllText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },

    // Quick Actions
    actionsGrid: { flexDirection: 'row', gap: 10 },
    actionCard: { flex: 1, alignItems: 'center', gap: 8 },
    actionIconBox: {
        width: 54, height: 54, borderRadius: 16,
        justifyContent: 'center', alignItems: 'center', ...SHADOWS.colored,
    },
    actionLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },

    // Med Rows
    medRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: COLORS.white, borderRadius: 16, padding: 13, marginBottom: 9,
        borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
    },
    medRowDone: { opacity: 0.6, backgroundColor: COLORS.lightGray },
    medTimeBox: {
        alignItems: 'center', minWidth: 36,
        backgroundColor: COLORS.successBg, paddingVertical: 7, paddingHorizontal: 8, borderRadius: 10,
    },
    medTimeBoxDone: { backgroundColor: COLORS.lightGray },
    medTimeHour: { fontSize: 15, fontWeight: '800', color: COLORS.primary },
    medTimeAMPM: { fontSize: 9, fontWeight: '600', color: COLORS.primary, marginTop: 1 },
    textDone: { color: COLORS.textMuted },
    medIconBox: {
        width: 36, height: 36, borderRadius: 11,
        backgroundColor: COLORS.successBg, justifyContent: 'center', alignItems: 'center',
    },
    medIconBoxDone: { backgroundColor: COLORS.lightGray },
    medName: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
    medNameDone: { textDecorationLine: 'line-through', color: COLORS.textSecondary },
    medDose: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
    medCheck: {
        width: 28, height: 28, borderRadius: 14,
        borderWidth: 2, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center',
    },
    medCheckDone: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    medCheckEmpty: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.border },

    // Empty state
    emptyCard: {
        backgroundColor: COLORS.white, borderRadius: 20, padding: 28, alignItems: 'center',
        borderWidth: 1.5, borderColor: COLORS.border, borderStyle: 'dashed', gap: 8, ...SHADOWS.sm,
    },
    emptyIcon: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
    emptyTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
    emptyText: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },
    emptyCtaBtn: { marginTop: 8, backgroundColor: COLORS.successBg, paddingHorizontal: 20, paddingVertical: 9, borderRadius: 20 },
    emptyCtaText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },

    // Rx Scroll
    rxScrollContent: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8, gap: 10 },
    rxCardNew: {
        width: 136, backgroundColor: COLORS.successBg, borderRadius: 18, padding: 18,
        alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: COLORS.primaryLight, borderStyle: 'dashed',
    },
    rxNewIconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    rxNewText: { fontSize: 13, fontWeight: '700', color: COLORS.primary, textAlign: 'center', lineHeight: 19 },
    rxCard: {
        width: 144, backgroundColor: COLORS.white, borderRadius: 18, padding: 14,
        borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm, gap: 8,
    },
    rxCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    rxIconBox: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    rxDate: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
    rxCondition: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, lineHeight: 19 },
    rxMedsBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: COLORS.successBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start',
    },
    rxMedsText: { fontSize: 11, fontWeight: '600', color: COLORS.primary },

    // Feature Cards
    featuresList: { gap: 10 },
    featureCard: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        backgroundColor: COLORS.white, borderRadius: 16, padding: 14,
        borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
    },
    featureIconBox: {
        width: 48, height: 48, borderRadius: 14,
        justifyContent: 'center', alignItems: 'center',
    },
    featureLabel: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 2 },
    featureDesc: { fontSize: 12, color: COLORS.textSecondary },

    // Insight
    insightCard: {
        borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 12,
        overflow: 'hidden', ...SHADOWS.colored,
    },
    insightTag: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.6)', letterSpacing: 0.8, marginBottom: 6 },
    insightTitle: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 7 },
    insightBody: { fontSize: 13, color: 'rgba(255,255,255,0.72)', lineHeight: 20 },
});
