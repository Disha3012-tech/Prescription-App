import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    SafeAreaView, StatusBar, Animated, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, SHADOWS } from '../theme';
import { MaterialCommunityIcons, Feather, Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';

// ─── Helper ────────────────────────────────────────────────────────────────────
const formatDate = (d) => {
    const date = new Date(d);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatRelative = (d) => {
    const now = new Date();
    const date = new Date(d);
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return formatDate(d);
};

// ─── Timeline Event Card ────────────────────────────────────────────────────────
const TimelineEvent = ({ item, isLast, onPress }) => {
    const isScan = item.type === 'scan';
    const colors = isScan ? GRADIENTS.teal : GRADIENTS.purple;

    return (
        <TouchableOpacity style={tc.wrap} onPress={onPress} activeOpacity={0.8}>
            {/* Vertical line */}
            <View style={tc.lineCol}>
                <LinearGradient colors={colors} style={tc.dot} />
                {!isLast && <View style={tc.line} />}
            </View>

            {/* Content */}
            <View style={tc.card}>
                <View style={tc.cardTop}>
                    <View style={{ flex: 1 }}>
                        <Text style={tc.dateText}>{formatRelative(item.date)}</Text>
                        <Text style={tc.titleText} numberOfLines={1}>{item.title}</Text>
                        {item.subtitle ? <Text style={tc.subtitle} numberOfLines={1}>{item.subtitle}</Text> : null}
                    </View>
                    <View style={[tc.typeBadge, { backgroundColor: isScan ? COLORS.successBg : '#F0EEFF' }]}>
                        <MaterialCommunityIcons
                            name={isScan ? 'scan-helper' : 'pill'}
                            size={12}
                            color={isScan ? COLORS.primary : '#7C3AED'}
                        />
                        <Text style={[tc.typeText, { color: isScan ? COLORS.primary : '#7C3AED' }]}>
                            {isScan ? 'Rx Scan' : 'Manual'}
                        </Text>
                    </View>
                </View>

                {/* Medicine chips */}
                {item.medicines && item.medicines.length > 0 && (
                    <View style={tc.medRow}>
                        {item.medicines.slice(0, 3).map((m, i) => (
                            <View key={i} style={tc.medChip}>
                                <MaterialCommunityIcons name="pill" size={10} color={COLORS.primary} />
                                <Text style={tc.medChipText}>{m}</Text>
                            </View>
                        ))}
                        {item.medicines.length > 3 && (
                            <Text style={tc.moreText}>+{item.medicines.length - 3} more</Text>
                        )}
                    </View>
                )}

                {item.confidence != null && (
                    <View style={tc.confRow}>
                        <Feather name="bar-chart-2" size={11} color={COLORS.textMuted} />
                        <Text style={tc.confText}>
                            {Math.round(item.confidence * (item.confidence <= 1 ? 100 : 1))}% OCR confidence
                        </Text>
                    </View>
                )}

                <Feather name="chevron-right" size={16} color={COLORS.border} style={tc.arrow} />
            </View>
        </TouchableOpacity>
    );
};

const tc = StyleSheet.create({
    wrap: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 4 },
    lineCol: { width: 32, alignItems: 'center' },
    dot: { width: 14, height: 14, borderRadius: 7, marginTop: 18, zIndex: 1 },
    line: { width: 2, flex: 1, backgroundColor: COLORS.border, marginTop: 2 },
    card: {
        flex: 1, marginLeft: 12, backgroundColor: COLORS.white,
        borderRadius: 16, padding: 14, marginBottom: 12,
        borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
    },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
    dateText: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted, marginBottom: 2 },
    titleText: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary },
    subtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
    typeBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    },
    typeText: { fontSize: 10, fontWeight: '700' },
    medRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 6 },
    medChip: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: COLORS.successBg, paddingHorizontal: 7, paddingVertical: 3,
        borderRadius: 6, borderWidth: 1, borderColor: COLORS.border,
    },
    medChipText: { fontSize: 10, fontWeight: '600', color: COLORS.primary },
    moreText: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', alignSelf: 'center' },
    confRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    confText: { fontSize: 11, color: COLORS.textMuted },
    arrow: { position: 'absolute', right: 12, top: 18 },
});

// ─── Filter Tab ─────────────────────────────────────────────────────────────────
const FilterTab = ({ label, active, onPress }) => (
    <TouchableOpacity
        style={[ft.tab, active && ft.tabActive]}
        onPress={onPress}
        activeOpacity={0.8}
    >
        <Text style={[ft.tabText, active && ft.tabTextActive]}>{label}</Text>
    </TouchableOpacity>
);

const ft = StyleSheet.create({
    tab: {
        paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
        backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border,
    },
    tabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    tabText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
    tabTextActive: { color: '#fff' },
});

// ─── Stats Header ───────────────────────────────────────────────────────────────
const StatsRow = ({ total, thisMonth, meds }) => (
    <LinearGradient colors={['#0F766E', '#0891B2']} style={stats.card}>
        {[
            { value: total, label: 'Total Rx' },
            { value: thisMonth, label: 'This Month' },
            { value: meds, label: 'Total Meds' },
        ].map((s, i) => (
            <View key={i} style={[stats.item, i < 2 && stats.itemBorder]}>
                <Text style={stats.val}>{s.value}</Text>
                <Text style={stats.label}>{s.label}</Text>
            </View>
        ))}
    </LinearGradient>
);

const stats = StyleSheet.create({
    card: {
        flexDirection: 'row', marginHorizontal: 20, borderRadius: 18,
        padding: 16, marginBottom: 20,
    },
    item: { flex: 1, alignItems: 'center' },
    itemBorder: { borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.2)' },
    val: { fontSize: 26, fontWeight: '900', color: '#fff' },
    label: { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: '600', marginTop: 3, textAlign: 'center' },
});

// ─── Main Screen ────────────────────────────────────────────────────────────────
const FILTERS = ['All', 'Scans', 'Manual'];

export default function PrescriptionTimelineScreen({ user, navigate, goBack }) {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('All');
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        if (!user?.id) { setLoading(false); return; }
        try {
            const res = await fetch(`${API_URL}api/prescriptions/history?user_id=${user.id}`);
            const data = await res.json();
            if (data.status === 'success') {
                setHistory(data.history.map(item => {
                    const isManual = item.country === 'Manual';
                    return {
                        id: item.id,
                        date: item.date,
                        type: isManual ? 'manual' : 'scan',
                        title: item.results?.[0]?.explanation?.medicine_class || (isManual ? 'Health Record' : 'Rx Scan'),
                        subtitle: `${item.results?.length || 0} medicine${item.results?.length !== 1 ? 's' : ''}${isManual ? ' · Added manually' : ` · ${item.country || 'Scanned'}`}`,
                        medicines: item.results?.map(r => r.medicine) || [],
                        confidence: item.avg_confidence,
                        image_url: item.image_url,
                        fullRecord: {
                            id: item.id,
                            date: item.date,
                            condition: item.results?.[0]?.explanation?.medicine_class || 'General Checkup',
                            doctor: item.results?.[0]?.explanation?.brand_name || 'Prescription Scan',
                            medicines: item.results?.map(r => r.medicine) || [],
                            fullResults: item.results,
                            notes: item.results?.[0]?.explanation?.what_it_does || item.raw_text?.substring(0, 100),
                            image_url: item.image_url
                                ? (item.image_url.startsWith('http') ? item.image_url : `${API_URL.replace(/\/$/, '')}${item.image_url}`)
                                : null,
                            raw_text: item.raw_text,
                            avg_confidence: item.avg_confidence,
                            country: item.country,
                            currency: item.currency,
                        },
                    };
                }));
            }
        } catch (e) {
            console.error('Timeline fetch error', e);
        } finally {
            setLoading(false);
        }
    };

    const filtered = history.filter(h => {
        if (filter === 'Scans') return h.type === 'scan';
        if (filter === 'Manual') return h.type === 'manual';
        return true;
    });

    const thisMonth = history.filter(h => {
        const d = new Date(h.date);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    const totalMeds = history.reduce((a, h) => a + (h.medicines?.length || 0), 0);

    // Group by month
    const grouped = {};
    filtered.forEach(h => {
        const key = new Date(h.date).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(h);
    });

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.midnight} />

            {/* Header */}
            <LinearGradient colors={GRADIENTS.hero} style={styles.header}>
                <View style={styles.bgDeco} />
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => goBack()} style={styles.backBtn}>
                        <Feather name="arrow-left" size={20} color="rgba(255,255,255,0.8)" />
                    </TouchableOpacity>
                    <View style={{ flex: 1, paddingLeft: 14 }}>
                        <Text style={styles.headerTitle}>Prescription Timeline</Text>
                        <Text style={styles.headerSub}>Your complete medical history</Text>
                    </View>
                    <TouchableOpacity style={styles.refreshBtn} onPress={fetchHistory}>
                        <Feather name="refresh-cw" size={16} color="rgba(255,255,255,0.8)" />
                    </TouchableOpacity>
                </View>

                {/* Filter tabs */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                    {FILTERS.map(f => (
                        <FilterTab key={f} label={f} active={filter === f} onPress={() => setFilter(f)} />
                    ))}
                </ScrollView>
            </LinearGradient>

            {loading ? (
                <View style={styles.centerBox}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Loading your history...</Text>
                </View>
            ) : (
                <Animated.ScrollView
                    style={{ opacity: fadeAnim }}
                    contentContainerStyle={{ paddingBottom: 60, paddingTop: 20 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Stats */}
                    <StatsRow total={history.length} thisMonth={thisMonth} meds={totalMeds} />

                    {filtered.length === 0 ? (
                        <View style={styles.emptyBox}>
                            <MaterialCommunityIcons name="timeline-outline" size={48} color={COLORS.border} />
                            <Text style={styles.emptyTitle}>No prescriptions yet</Text>
                            <Text style={styles.emptyText}>Scan your first prescription to start your health timeline</Text>
                            <TouchableOpacity style={styles.scanCta} onPress={() => navigate('SCANNER')}>
                                <LinearGradient colors={GRADIENTS.teal} style={styles.scanCtaGrad}>
                                    <Feather name="camera" size={16} color="#fff" />
                                    <Text style={styles.scanCtaText}>Scan Prescription</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        Object.entries(grouped).map(([month, items]) => (
                            <View key={month}>
                                {/* Month divider */}
                                <View style={styles.monthRow}>
                                    <View style={styles.monthLine} />
                                    <Text style={styles.monthLabel}>{month}</Text>
                                    <View style={styles.monthLine} />
                                </View>

                                {items.map((item, idx) => (
                                    <TimelineEvent
                                        key={item.id}
                                        item={item}
                                        isLast={idx === items.length - 1}
                                        onPress={() => navigate('PRESCRIPTION_DETAIL', { record: item.fullRecord })}
                                    />
                                ))}
                            </View>
                        ))
                    )}
                </Animated.ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { paddingBottom: 16, overflow: 'hidden', position: 'relative' },
    bgDeco: {
        position: 'absolute', width: 200, height: 200, borderRadius: 100,
        backgroundColor: 'rgba(13,148,136,0.1)', top: -60, right: -60,
    },
    headerTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 14 },
    backBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    },
    refreshBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
    headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 1 },
    filterRow: { paddingHorizontal: 20, gap: 8, paddingBottom: 4 },

    centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    loadingText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' },

    monthRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12, gap: 10 },
    monthLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
    monthLabel: {
        fontSize: 12, fontWeight: '700', color: COLORS.textMuted,
        backgroundColor: COLORS.background, paddingHorizontal: 8,
    },

    emptyBox: {
        alignItems: 'center', padding: 40, gap: 10,
        marginHorizontal: 20, marginTop: 20,
        backgroundColor: COLORS.white, borderRadius: 24,
        borderWidth: 1, borderColor: COLORS.border,
    },
    emptyTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
    emptyText: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
    scanCta: { marginTop: 8, borderRadius: 14, overflow: 'hidden' },
    scanCtaGrad: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 13 },
    scanCtaText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
