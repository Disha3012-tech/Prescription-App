import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ScrollView, SafeAreaView, ActivityIndicator, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SHADOWS } from '../theme';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { API_URL, COUNTRIES } from '../config';

const SEVERITY_CONFIG = {
    safe: {
        label: 'Safe Combination',
        sub: 'These medicines are safe to take together',
        icon: 'shield-check',
        colors: ['#059669', '#10B981'],
        textColor: '#065F46',
        bg: '#ECFDF5',
        border: '#6EE7B7',
        barColor: '#10B981',
        barPct: 15,
    },
    mild: {
        label: 'Mild Interaction',
        sub: 'Use with caution — monitor for symptoms',
        icon: 'alert-circle-outline',
        colors: ['#D97706', '#F59E0B'],
        textColor: '#92400E',
        bg: '#FFFBEB',
        border: '#FCD34D',
        barColor: '#F59E0B',
        barPct: 55,
    },
    dangerous: {
        label: 'Dangerous Interaction',
        sub: 'Consult your doctor immediately',
        icon: 'alert-octagon',
        colors: ['#DC2626', '#EF4444'],
        textColor: '#991B1B',
        bg: '#FEF2F2',
        border: '#FCA5A5',
        barColor: '#EF4444',
        barPct: 95,
    },
};

export default function DrugInteractionScreen() {
    const [drug1, setDrug1] = useState('');
    const [drug2, setDrug2] = useState('');
    const [focusedField, setFocusedField] = useState(null);
    const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
    const [showCountryPicker, setShowCountryPicker] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const checkInteraction = async () => {
        if (!drug1.trim() || !drug2.trim()) return;
        setLoading(true); setResult(null); setError(null);
        try {
            const response = await fetch(`${API_URL}drug-interaction`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ drug1: drug1.trim(), drug2: drug2.trim(), country: selectedCountry.value }),
            });
            const data = await response.json();
            if (data.status !== 'success') throw new Error(data.detail || 'Server error');
            setResult(data.result);
        } catch (e) {
            setError('Could not check interaction. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const sev = result ? SEVERITY_CONFIG[result.severity] || SEVERITY_CONFIG.safe : null;

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <LinearGradient colors={['#0A1628', '#0F2535']} style={styles.header}>
                <LinearGradient colors={['#7C3AED', '#6D28D9']} style={styles.headerIcon}>
                    <MaterialCommunityIcons name="shield-search" size={36} color={COLORS.textMuted} />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>Drug Interaction Checker</Text>
                    <Text style={styles.headerSub}>Check if two medicines are safe together</Text>
                </View>
            </LinearGradient>

            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                {!result && !error && (
                    <View style={styles.emptyState}>
                        <MaterialCommunityIcons name="shield-search" size={48} color="#10B981" />
                        <Text style={styles.emptyTitle}>Enter two medicines below</Text>
                        <Text style={styles.emptyText}>We'll instantly check if they're safe to take together using medical databases</Text>
                    </View>
                )}
                {/* Input Card */}
                <View style={styles.inputCard}>

                    {/* Country */}
                    <TouchableOpacity
                        style={styles.countryBtn}
                        onPress={() => setShowCountryPicker(!showCountryPicker)}
                    >
                        <MaterialCommunityIcons name="earth" size={16} color={COLORS.primary} />
                        <Text style={styles.countryBtnText}>{selectedCountry.label}</Text>
                        <Feather name={showCountryPicker ? 'chevron-up' : 'chevron-down'} size={14} color={COLORS.textSecondary} />
                    </TouchableOpacity>

                    {showCountryPicker && (
                        <View style={styles.countryDropdown}>
                            {COUNTRIES.map(c => (
                                <TouchableOpacity
                                    key={c.value}
                                    style={[styles.countryOption, selectedCountry.value === c.value && styles.countryOptionActive]}
                                    onPress={() => { setSelectedCountry(c); setShowCountryPicker(false); }}
                                >
                                    <Text style={[styles.countryOptionText, selectedCountry.value === c.value && { color: COLORS.primary, fontWeight: '700' }]}>
                                        {c.label}
                                    </Text>
                                    {selectedCountry.value === c.value && <Feather name="check" size={14} color={COLORS.primary} />}
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    <View style={styles.drugsContainer}>
                        {/* Drug 1 */}
                        <View style={[styles.drugInput, focusedField === 'drug1' && styles.drugInputFocused]}>
                            <LinearGradient colors={['#0D9488', '#0891B2']} style={styles.drugPillIcon}>
                                <MaterialCommunityIcons name="pill" size={14} color="#fff" />
                            </LinearGradient>
                            <TextInput
                                style={styles.drugTextInput}
                                placeholder="First medicine"
                                placeholderTextColor={COLORS.textMuted}
                                value={drug1}
                                onChangeText={setDrug1}
                                onFocus={() => setFocusedField('drug1')}
                                onBlur={() => setFocusedField(null)}
                            />
                            {drug1 ? (
                                <TouchableOpacity onPress={() => setDrug1('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                    <Feather name="x-circle" size={16} color={COLORS.textMuted} />
                                </TouchableOpacity>
                            ) : null}
                        </View>

                        {/* VS divider */}
                        <View style={styles.vsDivider}>
                            <View style={styles.vsDividerLine} />
                            <TouchableOpacity
                                style={styles.swapBtn}
                                onPress={() => { setDrug1(drug2); setDrug2(drug1); }}
                            >
                                <MaterialCommunityIcons name="swap-vertical" size={18} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                            <View style={styles.vsDividerLine} />
                        </View>

                        {/* Drug 2 */}
                        <View style={[styles.drugInput, focusedField === 'drug2' && styles.drugInputFocused]}>
                            <LinearGradient colors={['#7C3AED', '#6D28D9']} style={styles.drugPillIcon}>
                                <MaterialCommunityIcons name="pill" size={14} color="#fff" />
                            </LinearGradient>
                            <TextInput
                                style={styles.drugTextInput}
                                placeholder="Second medicine"
                                placeholderTextColor={COLORS.textMuted}
                                value={drug2}
                                onChangeText={setDrug2}
                                onFocus={() => setFocusedField('drug2')}
                                onBlur={() => setFocusedField(null)}
                            />
                            {drug2 ? (
                                <TouchableOpacity onPress={() => setDrug2('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                    <Feather name="x-circle" size={16} color={COLORS.textMuted} />
                                </TouchableOpacity>
                            ) : null}
                        </View>
                    </View>

                    {/* Check Button */}
                    <TouchableOpacity
                        disabled={!drug1 || !drug2 || loading}
                        onPress={checkInteraction}
                        activeOpacity={0.85}
                    >
                        <LinearGradient
                            colors={(!drug1 || !drug2 || loading) ? ['#94A3B8', '#94A3B8'] : ['#7C3AED', '#6D28D9']}
                            style={styles.checkBtn}
                        >
                            {loading
                                ? <ActivityIndicator color="#fff" />
                                : <>
                                    <Feather name="shield" size={18} color="#fff" />
                                    <Text style={styles.checkBtnText}>Check Interaction</Text>
                                </>
                            }
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* Error */}
                {error && (
                    <View style={styles.errorBox}>
                        <Ionicons name="alert-circle" size={18} color={COLORS.dangerText} />
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                )}

                {/* Results */}
                {result && sev && (
                    <View style={styles.results}>

                        {/* Severity Banner */}
                        <LinearGradient colors={sev.colors} style={styles.severityBanner}>
                            <MaterialCommunityIcons name={sev.icon} size={32} color="#fff" />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.severityLabel}>{sev.label}</Text>
                                <Text style={styles.severitySub}>{sev.sub}</Text>
                            </View>
                        </LinearGradient>

                        {/* Risk meter */}
                        <View style={styles.riskCard}>
                            <Text style={styles.riskTitle}>Risk Level</Text>
                            <View style={styles.riskBar}>
                                <View style={[styles.riskFill, {
                                    width: `${sev.barPct}%`,
                                    backgroundColor: sev.barColor,
                                }]} />
                            </View>
                            <View style={styles.riskLabels}>
                                <Text style={styles.riskLabelText}>Low</Text>
                                <Text style={styles.riskLabelText}>Moderate</Text>
                                <Text style={styles.riskLabelText}>High</Text>
                            </View>
                        </View>

                        {/* Drug pair */}
                        <View style={styles.drugPairCard}>
                            <View style={styles.drugPairItem}>
                                <LinearGradient colors={['#0D9488', '#0891B2']} style={styles.drugPairDot} />
                                <Text style={styles.drugPairName}>{drug1}</Text>
                            </View>
                            <View style={styles.drugPairSep}>
                                <MaterialCommunityIcons name="plus" size={16} color={COLORS.textSecondary} />
                            </View>
                            <View style={styles.drugPairItem}>
                                <LinearGradient colors={['#7C3AED', '#6D28D9']} style={styles.drugPairDot} />
                                <Text style={styles.drugPairName}>{drug2}</Text>
                            </View>
                        </View>

                        {/* FDA verified */}
                        {result.fda_verified && (
                            <View style={styles.fdaBadge}>
                                <Ionicons name="shield-checkmark" size={15} color="#059669" />
                                <Text style={styles.fdaText}>Verified against FDA drug label database</Text>
                            </View>
                        )}

                        {/* Info cards */}
                        {[
                            { label: '📋 SUMMARY', value: result.summary, bg: '#fff', textColor: COLORS.textPrimary },
                            { label: '🔬 HOW IT WORKS', value: result.mechanism, bg: '#fff', textColor: COLORS.textPrimary },
                            result.whatHappens && result.severity !== 'safe' && { label: '⚠️ WHAT COULD HAPPEN', value: result.whatHappens, bg: COLORS.dangerBg, textColor: COLORS.dangerText },
                            { label: '✅ RECOMMENDATION', value: result.recommendation, bg: COLORS.successBg, textColor: COLORS.primaryDark },
                            result.diceyConditions && { label: '🎯 CONDITIONAL RISKS', value: result.diceyConditions, bg: '#FFF7ED', textColor: '#9A3412' },
                        ].filter(Boolean).map((card, i) => (
                            <View key={i} style={[styles.infoCard, { backgroundColor: card.bg }]}>
                                <Text style={[styles.infoLabel, { color: card.textColor }]}>{card.label}</Text>
                                <Text style={[styles.infoText, { color: card.textColor }]}>{card.value}</Text>
                            </View>
                        ))}

                        {/* Alternatives */}
                        {result.alternatives?.length > 0 && result.severity !== 'safe' && (
                            <View style={styles.infoCard}>
                                <Text style={styles.infoLabel}>💡 CONSIDER INSTEAD</Text>
                                {result.alternatives.map((a, i) => (
                                    <View key={i} style={styles.altRow}>
                                        <LinearGradient colors={['#0D9488', '#0891B2']} style={styles.altDot} />
                                        <Text style={styles.altText}>{a}</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* New check */}
                        <TouchableOpacity
                            onPress={() => { setResult(null); setDrug1(''); setDrug2(''); }}
                            activeOpacity={0.8}
                        >
                            <LinearGradient colors={['#0D9488', '#0891B2']} style={styles.newCheckBtn}>
                                <Feather name="refresh-cw" size={15} color="#fff" />
                                <Text style={styles.newCheckText}>Check Another Pair</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* Disclaimer */}
                        <View style={styles.disclaimer}>
                            <Ionicons name="warning-outline" size={13} color={COLORS.warningText} />
                            <Text style={styles.disclaimerText}>For informational purposes only. Consult a licensed pharmacist or doctor.</Text>
                        </View>
                    </View>
                )}

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },

    header: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        paddingHorizontal: 20, paddingVertical: 18,
    },
    headerIcon: { width: 46, height: 46, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },
    headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 },

    content: { padding: 20, paddingBottom: 60 },

    inputCard: {
        backgroundColor: '#fff', borderRadius: 22, padding: 18,
        borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.md, gap: 14, marginBottom: 16,
    },

    countryBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: COLORS.successBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
        borderWidth: 1, borderColor: COLORS.border, alignSelf: 'flex-start',
    },
    countryBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, flex: 1 },
    countryDropdown: {
        backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: COLORS.border,
        overflow: 'hidden', ...SHADOWS.sm,
    },
    countryOption: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    countryOptionActive: { backgroundColor: COLORS.successBg },
    countryOptionText: { fontSize: 14, color: COLORS.textPrimary },

    drugsContainer: { gap: 4 },
    drugInput: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: COLORS.lightGray, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13,
        borderWidth: 1.5, borderColor: COLORS.border,
    },
    drugInputFocused: { borderColor: COLORS.primary, backgroundColor: COLORS.successBg },
    drugPillIcon: { width: 28, height: 28, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
    drugTextInput: { flex: 1, fontSize: 15, color: COLORS.textPrimary, fontWeight: '500' },

    vsDivider: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
    vsDividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
    swapBtn: {
        width: 34, height: 34, borderRadius: 17, backgroundColor: '#fff',
        justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
    },

    checkBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        height: 52, borderRadius: 14,
    },
    checkBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

    errorBox: {
        flexDirection: 'row', gap: 10, backgroundColor: COLORS.dangerBg,
        padding: 14, borderRadius: 14, marginBottom: 16, borderWidth: 1, borderColor: COLORS.dangerBorder,
    },
    errorText: { flex: 1, fontSize: 14, color: COLORS.dangerText },

    results: { gap: 12 },

    severityBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        padding: 18, borderRadius: 18,
    },
    severityLabel: { fontSize: 17, fontWeight: '800', color: '#fff' },
    severitySub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

    riskCard: {
        backgroundColor: '#fff', borderRadius: 16, padding: 16,
        borderWidth: 1, borderColor: COLORS.border,
    },
    riskTitle: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 10, letterSpacing: 0.5 },
    riskBar: { height: 10, backgroundColor: COLORS.lightGray, borderRadius: 5, overflow: 'hidden', marginBottom: 6 },
    riskFill: { height: 10, borderRadius: 5 },
    riskLabels: { flexDirection: 'row', justifyContent: 'space-between' },
    riskLabelText: { fontSize: 10, fontWeight: '600', color: COLORS.textMuted },

    drugPairCard: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 12,
        borderWidth: 1, borderColor: COLORS.border,
    },
    drugPairItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
    drugPairDot: { width: 10, height: 10, borderRadius: 5 },
    drugPairName: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
    drugPairSep: {
        width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.lightGray,
        justifyContent: 'center', alignItems: 'center',
    },

    fdaBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#ECFDF5', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#6EE7B7',
    },
    fdaText: { fontSize: 13, fontWeight: '600', color: '#065F46' },

    infoCard: {
        backgroundColor: '#fff', borderRadius: 16, padding: 16,
        borderWidth: 1, borderColor: COLORS.border,
    },
    infoLabel: {
        fontSize: 11, fontWeight: '700', letterSpacing: 0.5,
        marginBottom: 8, color: COLORS.textSecondary,
    },
    infoText: { fontSize: 14, lineHeight: 22 },

    altRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
    altDot: { width: 8, height: 8, borderRadius: 4 },
    altText: { fontSize: 14, color: COLORS.textPrimary, flex: 1 },

    newCheckBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, paddingVertical: 15, borderRadius: 14,
    },
    newCheckText: { fontSize: 15, fontWeight: '700', color: '#fff' },

    disclaimer: {
        flexDirection: 'row', gap: 8, backgroundColor: COLORS.warningBg,
        padding: 12, borderRadius: 12, alignItems: 'flex-start',
    },
    disclaimerText: { flex: 1, fontSize: 12, color: '#92400E', lineHeight: 18 },

    emptyState: { alignItems: 'center', paddingTop: 40, marginBottom: 50, gap: 12 },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
    emptyText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 21, paddingHorizontal: 20 },
});
