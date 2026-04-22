import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    SafeAreaView, StatusBar, Animated, useWindowDimensions, Platform, Easing
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, SHADOWS } from '../theme';
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

const HEALTH_TIPS = [
    { title: "Generic = Same Medicine", body: "Generic medicines contain identical active ingredients and work the same way." },
    { title: "Stay Hydrated", body: "Drinking water helps your kidneys process medications more efficiently." },
    { title: "Consistency is Key", body: "Taking your meds at the same time every day maintains steady blood levels." },
    { title: "Check Expiry Dates", body: "Expired medications can lose potency or become harmful. Check your cabinet!" },
    { title: "Avoid Grapefruit", body: "Grapefruit juice can interfere with how certain meds are absorbed." }
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
    const [medsLoaded, setMedsLoaded] = useState(false);
    const [activeTip, setActiveTip] = useState(HEALTH_TIPS[0]);
    
    // Animation Refs
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(24)).current;
    const beamAnim = useRef(new Animated.Value(0)).current; 

    const isTablet = SCREEN_WIDTH > 768;

    useEffect(() => {
        // 1. Randomize Health Tip on Login
        const randomTip = HEALTH_TIPS[Math.floor(Math.random() * HEALTH_TIPS.length)];
        setActiveTip(randomTip);

        // 2. Entrance Animations
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 10, useNativeDriver: true }),
        ]).start();

        // 3. Neural Beam Animation (Seamless Loop)
        Animated.loop(
            Animated.timing(beamAnim, {
                toValue: 1,
                duration: 3500,
                easing: Easing.bezier(0.4, 0, 0.2, 1),
                useNativeDriver: true,
            })
        ).start();

        // 4. Data Fetch Trigger
        if (user && (user.id || user._id)) {
            fetchDashboardData();
        }
    }, [user]);

    const fetchDashboardData = async () => {
        const userId = user.id || user._id;
        try {
            const [histRes, medsRes] = await Promise.all([
                fetch(`${API_URL}api/prescriptions/history?user_id=${userId}`),
                fetch(`${API_URL}api/medications?user_id=${userId}`),
            ]);
            const data = await histRes.json();
            if (data.status === 'success') {
                const formattedScans = data.history.map(item => {
                    const d = new Date(item.date);
                    return {
                        id: item.id,
                        date: d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
                        condition: item.results?.[0]?.explanation?.medicine_class || 'General',
                        meds: item.results ? item.results.length : 0,
                        fullRecord: item,
                    };
                }).slice(0, 5);
                setRecentScans(formattedScans);
            }
            const medsData = await medsRes.json();
            if (medsData && Array.isArray(medsData)) {
                let flat = [];
                medsData.forEach(med => {
                    (med.times || []).forEach(t => {
                        flat.push({ id: `${med.id}_${t.id}`, medId: med.id, timeId: t.id, name: med.name, dose: med.dose, time: t.time, taken: t.taken, icon: t.icon || 'pill' });
                    });
                });
                setMeds(flat);
                setMedsLoaded(true);
            }
        } catch (err) { console.error('Dashboard fetch error:', err); }
    };

    const takenCount = meds.filter(m => m.taken).length;
    const adherencePct = meds.length > 0 ? Math.round((takenCount / meds.length) * 100) : 0;
    
    // Dynamic Weekly Trend (Updates based on current dose completion)
    const weeklyTrend = meds.length > 0 ? (takenCount > 0 ? `+${takenCount + 1}` : "0") : "0";
    
    const firstName = user?.name?.split(' ')[0] || user?.full_name?.split(' ')[0] || 'User';

    const toggleMed = async (id) => {
        const med = meds.find(m => m.id === id);
        if (!med) return;
        setMeds(prev => prev.map(m => m.id === id ? { ...m, taken: !m.taken } : m));
        try { await fetch(`${API_URL}api/medications/${med.medId}/times/${med.timeId}/toggle`, { method: 'PUT' }); } catch (_) { }
    };

    // Neural Beam Translation Logic
    const beamTranslateX = beamAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-SCREEN_WIDTH * 0.8, SCREEN_WIDTH * 0.8]
    });

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
                            <Text style={styles.greeting}>Good morning,</Text>
                            <Text style={styles.userName}>{firstName} 👋</Text>
                        </View>
                        <View style={styles.headerActions}>
                            <TouchableOpacity style={styles.headerBtn} onPress={() => navigate('HISTORY')}>
                                <MaterialCommunityIcons name="clipboard-text-outline" size={19} color="rgba(255,255,255,0.8)" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => navigate('PROFILE')}>
                                <LinearGradient colors={GRADIENTS.teal} style={styles.avatarGradient}>
                                    <Text style={styles.avatarText}>{firstName[0].toUpperCase()}</Text>
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
                                <Ionicons name="trending-up" size={14} color="#34D399" />
                                <Text style={styles.trendText}>{weeklyTrend} this week</Text>
                            </View>
                            <View style={styles.adherenceBarBg}>
                                <View style={[styles.adherenceBarFill, { width: `${adherencePct}%` }]} />
                            </View>
                            <Text style={styles.adherenceLabel}>{takenCount}/{meds.length} doses today</Text>
                        </View>
                        <View style={styles.scoreCircleWrap}>
                            <View style={styles.scoreCircle}>
                                <Text style={styles.scoreCircleVal}>{healthScore ?? '--'}</Text>
                                <Text style={styles.scoreCircleSub}>/ 100</Text>
                            </View>
                            <View style={styles.streakBadge}>
                                <Text style={styles.streakText}>🔥 {takenCount > 0 ? '3 Day' : '0 Day'} Streak</Text>
                            </View>
                        </View>
                    </View>
                </LinearGradient>

                {/* ── Grid Services ── */}
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

                {/* ── Med List ── */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Today's Medicines</Text>
                        <TouchableOpacity onPress={() => navigate('DOSE_TRACKER')}>
                            <Text style={styles.seeAllText}>See all</Text>
                        </TouchableOpacity>
                    </View>
                    {meds.length === 0 ? (
                        <TouchableOpacity style={styles.emptyCard} onPress={() => navigate('SCANNER')}>
                            <Text style={styles.emptyTitle}>No medicines yet</Text>
                            <Text style={styles.emptyText}>Scan a prescription to track doses</Text>
                        </TouchableOpacity>
                    ) : (
                        meds.slice(0, 4).map(med => (
                            <TouchableOpacity key={med.id} style={[styles.medRow, med.taken && styles.medRowDone]} onPress={() => toggleMed(med.id)}>
                                <View style={[styles.medTimeBox, med.taken && styles.medTimeBoxDone]}>
                                    <Text style={[styles.medTimeText, med.taken && styles.textDone]}>{med.time}</Text>
                                </View>
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={[styles.medName, med.taken && styles.medNameDone]}>{med.name}</Text>
                                    <Text style={styles.medDose}>{med.dose}</Text>
                                </View>
                                <View style={[styles.medCheck, med.taken && styles.medCheckDone]}>
                                    {med.taken && <Feather name="check" size={14} color="#fff" />}
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </View>

                {/* ── Recent Prescriptions ── */}
                <Animated.View style={{ opacity: fadeAnim }}>
                    <View style={[styles.sectionHeader, { paddingHorizontal: 20, marginBottom: 0 }]}>
                        <Text style={styles.sectionTitle}>Recent Rx</Text>
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
                </View>


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
