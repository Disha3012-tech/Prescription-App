import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    SafeAreaView, StatusBar, Switch, ActivityIndicator, Animated,
    Alert, TextInput, Modal, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, SHADOWS } from '../theme';
import { MaterialCommunityIcons, Feather, Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';

// ─── Refill Status Bar ──────────────────────────────────────────────────────────
const RefillBar = ({ remaining, total, threshold }) => {
    const pct = total > 0 ? (remaining / total) * 100 : 0;
    const isCritical = remaining <= threshold;
    const isLow = remaining <= threshold * 2;
    const color = isCritical ? COLORS.dangerText : isLow ? COLORS.warningText : COLORS.primary;
    const barColors = isCritical
        ? ['#DC2626', '#EF4444']
        : isLow ? ['#D97706', '#F59E0B']
        : ['#0D9488', '#0891B2'];

    return (
        <View style={rb.wrap}>
            <View style={rb.barBg}>
                <View style={[rb.barFill, { width: `${Math.max(pct, 0)}%` }]}>
                    <LinearGradient colors={barColors} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
                </View>
            </View>
            <Text style={[rb.label, { color }]}>{remaining} left</Text>
        </View>
    );
};
const rb = StyleSheet.create({
    wrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
    barBg: { flex: 1, height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden' },
    barFill: { height: 6, borderRadius: 3, overflow: 'hidden', minWidth: 4 },
    label: { fontSize: 11, fontWeight: '700', minWidth: 44, textAlign: 'right' },
});

// ─── Med Refill Card ────────────────────────────────────────────────────────────
const MedRefillCard = ({ med, onToggleReminder, onUpdateQuantity }) => {
    const remaining = med.remaining_quantity ?? med.total_quantity ?? 30;
    const total = med.total_quantity ?? 30;
    const threshold = med.refill_threshold ?? 5;
    const isCritical = remaining <= threshold;
    const isLow = remaining <= threshold * 2 && !isCritical;
    const isOn = med.is_refill_reminder_on !== false;

    return (
        <View style={[mrc.card, isCritical && mrc.cardCritical, isLow && mrc.cardLow]}>
            {(isCritical || isLow) && (
                <View style={[mrc.urgentBanner, { backgroundColor: isCritical ? COLORS.dangerBg : COLORS.warningBg }]}>
                    <MaterialCommunityIcons
                        name={isCritical ? 'alert-circle' : 'alert'}
                        size={14}
                        color={isCritical ? COLORS.dangerText : COLORS.warningText}
                    />
                    <Text style={[mrc.urgentText, { color: isCritical ? COLORS.dangerText : COLORS.warningText }]}>
                        {isCritical ? '🚨 Needs refill urgently' : '⚠️ Running low — refill soon'}
                    </Text>
                </View>
            )}

            <View style={mrc.row}>
                {/* Color dot */}
                <View style={[mrc.colorDot, { backgroundColor: med.color || COLORS.primary }]} />

                <View style={{ flex: 1 }}>
                    <Text style={mrc.medName}>{med.name}</Text>
                    <Text style={mrc.medDose}>{med.dose}</Text>
                    <RefillBar remaining={remaining} total={total} threshold={threshold} />
                </View>

                {/* Controls */}
                <View style={mrc.controls}>
                    <TouchableOpacity style={mrc.qtyBtn} onPress={() => onUpdateQuantity(med.id, Math.max(0, remaining - 1))}>
                        <Feather name="minus" size={12} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                    <Text style={mrc.qtyVal}>{Math.round(remaining)}</Text>
                    <TouchableOpacity style={mrc.qtyBtn} onPress={() => onUpdateQuantity(med.id, Math.min(total, remaining + 1))}>
                        <Feather name="plus" size={12} color={COLORS.primary} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Reminder toggle */}
            <View style={mrc.reminderRow}>
                <Ionicons name="notifications-outline" size={14} color={COLORS.textSecondary} />
                <Text style={mrc.reminderLabel}>Refill reminder</Text>
                <Switch
                    value={isOn}
                    onValueChange={(val) => onToggleReminder(med.id, val)}
                    trackColor={{ false: COLORS.border, true: COLORS.primary + '60' }}
                    thumbColor={isOn ? COLORS.primary : '#f4f3f4'}
                    style={{ transform: [{ scale: 0.8 }] }}
                />
            </View>
        </View>
    );
};
const mrc = StyleSheet.create({
    card: {
        backgroundColor: COLORS.white, borderRadius: 18, marginBottom: 12,
        borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', ...SHADOWS.sm,
    },
    cardCritical: { borderColor: COLORS.dangerBorder },
    cardLow: { borderColor: COLORS.warningBorder },
    urgentBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 14, paddingVertical: 8,
    },
    urgentText: { fontSize: 12, fontWeight: '700' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
    colorDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0, marginTop: -2 },
    medName: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary },
    medDose: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
    controls: { flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 },
    qtyBtn: {
        width: 26, height: 26, borderRadius: 8,
        backgroundColor: COLORS.lightGray, justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: COLORS.border,
    },
    qtyVal: { fontSize: 14, fontWeight: '900', color: COLORS.textPrimary, minWidth: 20, textAlign: 'center' },
    reminderRow: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 14, paddingVertical: 10,
        borderTopWidth: 1, borderTopColor: COLORS.border,
        backgroundColor: COLORS.lightGray,
    },
    reminderLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, flex: 1 },
});

// ─── Summary Pill ───────────────────────────────────────────────────────────────
const SummaryPill = ({ icon, value, label, color }) => (
    <View style={sp.pill}>
        <MaterialCommunityIcons name={icon} size={16} color={color} />
        <Text style={[sp.val, { color }]}>{value}</Text>
        <Text style={sp.label}>{label}</Text>
    </View>
);
const sp = StyleSheet.create({
    pill: {
        flex: 1, alignItems: 'center', gap: 4,
        backgroundColor: COLORS.white, borderRadius: 14, padding: 12,
        borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
    },
    val: { fontSize: 22, fontWeight: '900' },
    label: { fontSize: 10, fontWeight: '600', color: COLORS.textMuted, textAlign: 'center' },
});

// ─── Main Screen ────────────────────────────────────────────────────────────────
export default function RefillReminderScreen({ user, navigate }) {
    const [meds, setMeds] = useState([]);
    const [loading, setLoading] = useState(true);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
        fetchMeds();
    }, []);

    const fetchMeds = async () => {
        if (!user?.id) { setLoading(false); return; }
        try {
            const res = await fetch(`${API_URL}api/medications?user_id=${user.id}`);
            const data = await res.json();
            if (Array.isArray(data)) setMeds(data);
        } catch (e) {
            console.error('RefillScreen fetch error', e);
        } finally {
            setLoading(false);
        }
    };

    const updateQuantity = async (medId, newQty) => {
        // Optimistic update
        setMeds(prev => prev.map(m => m.id === medId ? { ...m, remaining_quantity: newQty } : m));
        try {
            await fetch(`${API_URL}api/medications/${medId}/refill`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ remaining_quantity: newQty }),
            });
        } catch (e) {
            console.error('Update quantity error', e);
        }
    };

    const toggleReminder = async (medId, isOn) => {
        setMeds(prev => prev.map(m => m.id === medId ? { ...m, is_refill_reminder_on: isOn } : m));
        try {
            await fetch(`${API_URL}api/medications/${medId}/refill`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_refill_reminder_on: isOn }),
            });
        } catch (e) {
            console.error('Toggle reminder error', e);
        }
    };

    const criticalCount = meds.filter(m => (m.remaining_quantity ?? 30) <= (m.refill_threshold ?? 5)).length;
    const lowCount = meds.filter(m => {
        const r = m.remaining_quantity ?? 30;
        const t = m.refill_threshold ?? 5;
        return r > t && r <= t * 2;
    }).length;
    const okCount = meds.length - criticalCount - lowCount;

    const sortedMeds = [...meds].sort((a, b) => {
        const ra = a.remaining_quantity ?? 30;
        const rb = b.remaining_quantity ?? 30;
        return ra - rb;
    });

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.midnight} />

            {/* Header */}
            <LinearGradient colors={GRADIENTS.hero} style={styles.header}>
                <View style={styles.bgDeco} />
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => navigate('DASHBOARD')} style={styles.backBtn}>
                        <Feather name="arrow-left" size={20} color="rgba(255,255,255,0.8)" />
                    </TouchableOpacity>
                    <View style={{ flex: 1, paddingLeft: 14 }}>
                        <Text style={styles.headerTitle}>Refill Reminders</Text>
                        <Text style={styles.headerSub}>Track medicine stock levels</Text>
                    </View>
                    <TouchableOpacity style={styles.refreshBtn} onPress={fetchMeds}>
                        <Feather name="refresh-cw" size={16} color="rgba(255,255,255,0.8)" />
                    </TouchableOpacity>
                </View>

                {/* Status chips */}
                {!loading && meds.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusRow}>
                        {criticalCount > 0 && (
                            <View style={[styles.statusChip, { backgroundColor: COLORS.dangerBg, borderColor: COLORS.dangerBorder }]}>
                                <MaterialCommunityIcons name="alert-circle" size={13} color={COLORS.dangerText} />
                                <Text style={[styles.statusText, { color: COLORS.dangerText }]}>{criticalCount} Critical</Text>
                            </View>
                        )}
                        {lowCount > 0 && (
                            <View style={[styles.statusChip, { backgroundColor: COLORS.warningBg, borderColor: COLORS.warningBorder }]}>
                                <MaterialCommunityIcons name="alert" size={13} color={COLORS.warningText} />
                                <Text style={[styles.statusText, { color: COLORS.warningText }]}>{lowCount} Low</Text>
                            </View>
                        )}
                        {okCount > 0 && (
                            <View style={[styles.statusChip, { backgroundColor: COLORS.successBg, borderColor: COLORS.border }]}>
                                <MaterialCommunityIcons name="check-circle" size={13} color={COLORS.primary} />
                                <Text style={[styles.statusText, { color: COLORS.primary }]}>{okCount} OK</Text>
                            </View>
                        )}
                    </ScrollView>
                )}
            </LinearGradient>

            {loading ? (
                <View style={styles.centerBox}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Loading medicines...</Text>
                </View>
            ) : (
                <Animated.ScrollView
                    style={{ opacity: fadeAnim }}
                    contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Summary */}
                    <View style={styles.summaryRow}>
                        <SummaryPill icon="pill" value={meds.length} label="Total Meds" color={COLORS.primary} />
                        <SummaryPill
                            icon="alert-circle"
                            value={criticalCount}
                            label="Needs Refill"
                            color={criticalCount > 0 ? COLORS.dangerText : COLORS.textMuted}
                        />
                        <SummaryPill
                            icon="alert"
                            value={lowCount}
                            label="Running Low"
                            color={lowCount > 0 ? COLORS.warningText : COLORS.textMuted}
                        />
                    </View>

                    {meds.length === 0 ? (
                        <View style={styles.emptyBox}>
                            <MaterialCommunityIcons name="prescription-outline" size={48} color={COLORS.border} />
                            <Text style={styles.emptyTitle}>No medicines tracked</Text>
                            <Text style={styles.emptyText}>Scan a prescription or add medicines in Dose Tracker to enable refill reminders.</Text>
                            <TouchableOpacity style={styles.scanCta} onPress={() => navigate('SCANNER')}>
                                <LinearGradient colors={GRADIENTS.teal} style={styles.scanCtaGrad}>
                                    <Feather name="camera" size={16} color="#fff" />
                                    <Text style={styles.scanCtaText}>Scan Prescription</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <>
                            {criticalCount > 0 && <Text style={styles.groupLabel}>🚨 Needs Refill Now</Text>}
                            {sortedMeds.filter(m => (m.remaining_quantity ?? 30) <= (m.refill_threshold ?? 5)).map(med => (
                                <MedRefillCard
                                    key={med.id}
                                    med={med}
                                    onToggleReminder={toggleReminder}
                                    onUpdateQuantity={updateQuantity}
                                />
                            ))}

                            {lowCount > 0 && <Text style={[styles.groupLabel, { marginTop: 8 }]}>⚠️ Running Low</Text>}
                            {sortedMeds.filter(m => {
                                const r = m.remaining_quantity ?? 30;
                                const t = m.refill_threshold ?? 5;
                                return r > t && r <= t * 2;
                            }).map(med => (
                                <MedRefillCard
                                    key={med.id}
                                    med={med}
                                    onToggleReminder={toggleReminder}
                                    onUpdateQuantity={updateQuantity}
                                />
                            ))}

                            {okCount > 0 && <Text style={[styles.groupLabel, { marginTop: 8 }]}>✅ Well Stocked</Text>}
                            {sortedMeds.filter(m => {
                                const r = m.remaining_quantity ?? 30;
                                const t = m.refill_threshold ?? 5;
                                return r > t * 2;
                            }).map(med => (
                                <MedRefillCard
                                    key={med.id}
                                    med={med}
                                    onToggleReminder={toggleReminder}
                                    onUpdateQuantity={updateQuantity}
                                />
                            ))}
                        </>
                    )}

                    {/* Info card */}
                    <LinearGradient colors={['#0F766E', '#0891B2']} style={styles.infoCard}>
                        <Ionicons name="bulb-outline" size={20} color="rgba(255,255,255,0.8)" />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.infoTitle}>How Refill Tracking Works</Text>
                            <Text style={styles.infoText}>
                                Use the ± buttons to track how many pills you have left. You'll be alerted when stock falls below your threshold (default 5). Set a reminder to get a notification when it's time to refill.
                            </Text>
                        </View>
                    </LinearGradient>
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
    statusRow: { paddingHorizontal: 20, gap: 8, paddingBottom: 4 },
    statusChip: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
    },
    statusText: { fontSize: 12, fontWeight: '700' },

    centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    loadingText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' },

    summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },

    groupLabel: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 10 },

    emptyBox: {
        alignItems: 'center', padding: 40, gap: 10,
        backgroundColor: COLORS.white, borderRadius: 24,
        borderWidth: 1, borderColor: COLORS.border,
    },
    emptyTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
    emptyText: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
    scanCta: { marginTop: 8, borderRadius: 14, overflow: 'hidden' },
    scanCtaGrad: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 13 },
    scanCtaText: { fontSize: 15, fontWeight: '800', color: '#fff' },

    infoCard: {
        flexDirection: 'row', gap: 12, borderRadius: 18, padding: 16,
        marginTop: 16, alignItems: 'flex-start',
    },
    infoTitle: { fontSize: 14, fontWeight: '800', color: '#fff', marginBottom: 4 },
    infoText: { fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 18 },
});
