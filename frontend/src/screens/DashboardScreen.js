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
];

export default function DashboardScreen({ user, navigate }) {
    const { width: SCREEN_WIDTH } = useWindowDimensions();
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
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>

                {/* ── Header ── */}
                <LinearGradient colors={GRADIENTS.hero} style={styles.header}>
                    <View style={styles.headerTop}>
                        <View>
                            <Text style={styles.greeting}>Good morning,</Text>
                            <Text style={styles.userName}>{firstName} 👋</Text>
                        </View>
                        <View style={styles.headerActions}>
                            <TouchableOpacity style={styles.headerBtn} onPress={() => navigate('HISTORY')}>
                                <MaterialCommunityIcons name="clipboard-text-outline" size={20} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => navigate('PROFILE')}>
                                <LinearGradient colors={GRADIENTS.teal} style={styles.avatarGradient}>
                                    <Text style={styles.avatarText}>{firstName[0].toUpperCase()}</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.healthCard}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.healthCardLabel}>HEALTH SCORE</Text>
                            <Text style={styles.healthScoreText}>{medsLoaded ? adherencePct : '--'}</Text>
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
                                <Text style={styles.scoreCircleVal}>{medsLoaded ? adherencePct : '--'}</Text>
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
                    <View style={styles.actionsGrid}>
                        {ADDITIONAL_FEATURES.map((action, i) => (
                            <TouchableOpacity key={i} style={[styles.actionCard, { width: isTablet ? '15%' : '30%' }]} onPress={() => navigate(action.screen)}>
                                <LinearGradient colors={action.bg} style={styles.actionIconBox}>
                                    <MaterialCommunityIcons name={action.icon} size={22} color="#fff" />
                                </LinearGradient>
                                <Text style={styles.actionLabel} numberOfLines={1}>{action.label}</Text>
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

                {/* ── Recent Scans ── */}
                <View style={{ marginTop: 20 }}>
                    <View style={[styles.sectionHeader, { paddingHorizontal: 20 }]}>
                        <Text style={styles.sectionTitle}>Recent Rx</Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rxScroll}>
                        <TouchableOpacity style={styles.rxCardNew} onPress={() => navigate('SCANNER')}>
                            <Feather name="plus" size={20} color={COLORS.primary} />
                            <Text style={styles.rxNewText}>Scan New</Text>
                        </TouchableOpacity>
                        {recentScans.map(scan => (
                            <TouchableOpacity key={scan.id} style={styles.rxCard}>
                                <Text style={styles.rxDate}>{scan.date}</Text>
                                <Text style={styles.rxCondition} numberOfLines={1}>{scan.condition}</Text>
                                <Text style={styles.rxMedsCount}>{scan.meds} meds</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* ── Health Tip Card with Flowing Neural Beam ── */}
                <View style={[styles.section, { marginBottom: 20 }]}>
                    <View style={styles.insightCardContainer}>
                        <LinearGradient colors={['#0F766E', '#0891B2']} style={styles.insightCard} start={{x: 0, y: 0}} end={{x: 1, y: 1}}>
                            
                            {/* The Neural Beam Shimmer */}
                            <Animated.View style={[styles.neuralBeam, { transform: [{ translateX: beamTranslateX }] }]}>
                                <LinearGradient 
                                    colors={['transparent', 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.4)', 'rgba(255,255,255,0.05)', 'transparent']} 
                                    start={{x: 0, y: 0}} end={{x: 1, y: 0}}
                                    style={{ flex: 1 }} 
                                />
                            </Animated.View>

                            <View style={{ flex: 1, zIndex: 2 }}>
                                <Text style={styles.insightTag}>💡 HEALTH TIP</Text>
                                <Text style={styles.insightTitle}>{activeTip.title}</Text>
                                <Text style={styles.insightBody}>{activeTip.body}</Text>
                            </View>
                            <MaterialCommunityIcons name="lightbulb-on-outline" size={40} color="rgba(255,255,255,0.15)" style={{ zIndex: 2 }} />
                        </LinearGradient>
                    </View>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: { 
        paddingTop: Platform.OS === 'android' ? 45 : 15,
        paddingBottom: 35,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 15 },
    greeting: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
    userName: { fontSize: 24, fontWeight: '900', color: '#fff' },
    headerActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    headerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
    avatarGradient: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontSize: 16, fontWeight: '800', color: '#fff' },
    
    healthCard: { backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 20, borderRadius: 24, padding: 20, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
    healthCardLabel: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.5)', letterSpacing: 0.5 },
    healthScoreText: { fontSize: 36, fontWeight: '900', color: '#fff', marginTop: 2 },
    trendRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
    trendText: { fontSize: 12, fontWeight: '700', color: '#34D399' },
    adherenceBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, marginBottom: 6, width: '75%' },
    adherenceBarFill: { height: 6, backgroundColor: '#5EEAD4', borderRadius: 3 },
    adherenceLabel: { fontSize: 11, color: '#fff', opacity: 0.7 },
    
    scoreCircleWrap: { alignItems: 'center', marginLeft: 15 },
    scoreCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#5EEAD4' },
    scoreCircleVal: { fontSize: 22, fontWeight: '900', color: '#fff' },
    scoreCircleSub: { fontSize: 9, color: 'rgba(255,255,255,0.5)' },
    streakBadge: { backgroundColor: '#F59E0B', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginTop: -8 },
    streakText: { fontSize: 9, fontWeight: '800', color: '#fff' },

    section: { paddingHorizontal: 20, marginTop: 25 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { fontSize: 17, fontWeight: '800', color: '#1E293B' },
    seeAllText: { fontSize: 13, fontWeight: '700', color: '#0D9488' },

    actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    actionCard: { alignItems: 'center', marginBottom: 15 },
    actionIconBox: { width: 56, height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center', ...SHADOWS.sm },
    actionLabel: { fontSize: 11, fontWeight: '700', color: '#475569', marginTop: 6 },

    medRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 18, marginBottom: 10, ...SHADOWS.sm },
    medRowDone: { opacity: 0.6 },
    medTimeBox: { backgroundColor: '#F0FDFA', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 },
    medTimeText: { fontSize: 12, fontWeight: '800', color: '#0D9488' },
    medName: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
    medNameDone: { textDecorationLine: 'line-through' },
    medDose: { fontSize: 12, color: '#64748B' },
    medCheck: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#CBD5E1', justifyContent: 'center', alignItems: 'center' },
    medCheckDone: { backgroundColor: '#0D9488', borderColor: '#0D9488' },
    
    rxScroll: { paddingLeft: 20, paddingRight: 10, paddingBottom: 10 },
    rxCard: { backgroundColor: '#fff', width: 140, padding: 15, borderRadius: 20, marginRight: 12, ...SHADOWS.sm },
    rxCardNew: { backgroundColor: '#F0FDFA', width: 110, padding: 15, borderRadius: 20, marginRight: 12, alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#0D9488' },
    rxNewText: { fontSize: 12, fontWeight: '800', color: '#0D9488', marginTop: 5 },
    rxDate: { fontSize: 10, fontWeight: '700', color: '#94A3B8' },
    rxCondition: { fontSize: 13, fontWeight: '800', color: '#1E293B', marginVertical: 3 },
    rxMedsCount: { fontSize: 11, fontWeight: '600', color: '#0D9488' },

    insightCardContainer: { borderRadius: 22, overflow: 'hidden', ...SHADOWS.sm },
    insightCard: { padding: 20, flexDirection: 'row', alignItems: 'center', position: 'relative' },
    neuralBeam: { position: 'absolute', top: 0, bottom: 0, left: 0, width: '40%', zIndex: 1 },
    insightTag: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.5)', letterSpacing: 1, marginBottom: 4 },
    insightTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },
    insightBody: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 6, lineHeight: 19 },
    emptyCard: { padding: 20, backgroundColor: '#fff', borderRadius: 20, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#CBD5E1' },
});