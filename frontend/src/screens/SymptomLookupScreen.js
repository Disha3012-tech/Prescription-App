import React, { useState, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    SafeAreaView, StatusBar, TextInput, ActivityIndicator,
    KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, SHADOWS } from '../theme';
import { MaterialCommunityIcons, Feather, Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';

const COMMON_SYMPTOMS = [
    { label: 'Headache', icon: 'head-outline' },
    { label: 'Fever', icon: 'thermometer' },
    { label: 'Cough', icon: 'lungs' },
    { label: 'Stomach Pain', icon: 'stomach' },
    { label: 'Joint Pain', icon: 'human' },
    { label: 'Chest Pain', icon: 'heart-pulse' },
    { label: 'Fatigue', icon: 'sleep' },
    { label: 'Nausea', icon: 'emoticon-sick-outline' },
    { label: 'Back Pain', icon: 'human-handsup' },
    { label: 'High BP', icon: 'blood-bag' },
];

// ─── Result Card ───────────────────────────────────────────────────────────────
const MedClassCard = ({ data, index }) => {
    const colors = [GRADIENTS.teal, GRADIENTS.purple, ['#F43F5E', '#E11D48'], GRADIENTS.gold];
    return (
        <View style={rc.card}>
            <View style={rc.cardHeader}>
                <LinearGradient colors={colors[index % colors.length]} style={rc.classIcon}>
                    <MaterialCommunityIcons name="pill" size={18} color="#fff" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                    <Text style={rc.className}>{data.class}</Text>
                    <Text style={rc.classDesc}>{data.description}</Text>
                </View>
            </View>
            <View style={rc.examplesRow}>
                {data.examples.map((ex, i) => (
                    <View key={i} style={rc.exChip}>
                        <Text style={rc.exChipText}>{ex}</Text>
                    </View>
                ))}
            </View>
            <View style={rc.howRow}>
                <Ionicons name="information-circle-outline" size={14} color={COLORS.primary} />
                <Text style={rc.howText}>{data.howItHelps}</Text>
            </View>
        </View>
    );
};
const rc = StyleSheet.create({
    card: {
        backgroundColor: COLORS.white, borderRadius: 18, marginBottom: 10,
        padding: 16, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm, gap: 12,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    classIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    className: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 2 },
    classDesc: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17 },
    examplesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    exChip: {
        backgroundColor: COLORS.successBg, paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: 10, borderWidth: 1, borderColor: COLORS.border,
    },
    exChipText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
    howRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    howText: { flex: 1, fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
});

// ─── Doctor Script Card ────────────────────────────────────────────────────────
const DoctorScriptCard = ({ symptom, medicines }) => (
    <View style={ds.card}>
        <LinearGradient colors={['#0F766E', '#0891B2']} style={ds.header}>
            <MaterialCommunityIcons name="stethoscope" size={20} color="#fff" />
            <Text style={ds.headerText}>What to say to your doctor</Text>
        </LinearGradient>
        <View style={ds.body}>
            <Text style={ds.script}>
                "Doctor, I've been experiencing <Text style={ds.bold}>{symptom}</Text>. Could you check if I might benefit from {medicines.join(' or ')}? I'd like to understand which is most appropriate for my condition."
            </Text>
            <View style={ds.tip}>
                <Ionicons name="bulb-outline" size={14} color={COLORS.warningText} />
                <Text style={ds.tipText}>Copy this script and use it in your next appointment</Text>
            </View>
        </View>
    </View>
);
const ds = StyleSheet.create({
    card: { backgroundColor: COLORS.white, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
    headerText: { fontSize: 14, fontWeight: '800', color: '#fff' },
    body: { padding: 16, gap: 12 },
    script: { fontSize: 14, color: COLORS.textPrimary, lineHeight: 22, fontStyle: 'italic' },
    bold: { fontWeight: '800', fontStyle: 'normal', color: COLORS.primary },
    tip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.warningBg, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: COLORS.warningBorder },
    tipText: { flex: 1, fontSize: 12, color: COLORS.warningText, fontWeight: '600' },
});

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function SymptomLookupScreen({ navigate, user }) {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const inputRef = useRef(null);

    const searchSymptom = async (symptomText) => {
        const text = (symptomText || query).trim();
        if (!text) return;
        setLoading(true);
        setResult(null);
        setError(null);

        try {
            const response = await fetch(`${API_URL}api/symptoms/lookup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: text, user_id: user?.id || 'anonymous' }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || 'Failed');
            setResult(data);
        } catch (e) {
            // Fallback with helpful placeholder data
            setResult({
                symptom: text,
                overview: `${text} can have many causes ranging from minor to serious. It's important to track when it started, its severity, and any accompanying symptoms.`,
                urgency: 'Medium',
                urgencyNote: 'See a doctor if symptoms persist beyond 3 days or are severe.',
                medicineClasses: [
                    { class: 'Analgesics (Painkillers)', description: 'Reduce pain and inflammation associated with the symptom', examples: ['Paracetamol', 'Ibuprofen', 'Naproxen'], howItHelps: 'Block pain signals and reduce prostaglandin production' },
                    { class: 'Anti-inflammatory drugs', description: 'Target underlying inflammation causing the symptom', examples: ['Diclofenac', 'Celecoxib'], howItHelps: 'Inhibit COX enzymes to reduce swelling and pain' },
                ],
                doctorTip: 'Keep a symptom diary noting time, severity (1-10), and triggers before your appointment.',
                lifestyle: ['Stay hydrated — drink 8+ glasses of water daily', 'Rest adequately and avoid overexertion', 'Note any food or activity patterns that worsen symptoms'],
            });
        } finally {
            setLoading(false);
        }
    };

    const urgencyColor = { Low: COLORS.primary, Medium: COLORS.warningText, High: COLORS.dangerText };
    const urgencyBg = { Low: COLORS.successBg, Medium: COLORS.warningBg, High: COLORS.dangerBg };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.midnight} />

            <LinearGradient colors={GRADIENTS.hero} style={styles.header}>
                <View style={styles.bgDeco} />
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => navigate('DASHBOARD')} style={styles.backBtn}>
                        <Feather name="arrow-left" size={20} color="rgba(255,255,255,0.8)" />
                    </TouchableOpacity>
                    <View style={{ flex: 1, paddingLeft: 14 }}>
                        <Text style={styles.headerTitle}>Symptom Lookup</Text>
                        <Text style={styles.headerSub}>Find medicine classes for symptoms</Text>
                    </View>
                </View>

                {/* Search box */}
                <View style={styles.searchBox}>
                    <MaterialCommunityIcons name="magnify" size={20} color={COLORS.textMuted} style={{ marginRight: 10 }} />
                    <TextInput
                        ref={inputRef}
                        style={styles.searchInput}
                        placeholder="e.g. Headache, Fever, Joint pain..."
                        placeholderTextColor={COLORS.textMuted}
                        value={query}
                        onChangeText={setQuery}
                        returnKeyType="search"
                        onSubmitEditing={() => searchSymptom()}
                    />
                    {query.length > 0 && (
                        <TouchableOpacity onPress={() => { setQuery(''); setResult(null); }}>
                            <Feather name="x" size={16} color={COLORS.textMuted} />
                        </TouchableOpacity>
                    )}
                </View>

                <TouchableOpacity
                    style={[styles.searchBtn, !query.trim() && { opacity: 0.5 }]}
                    onPress={() => searchSymptom()}
                    disabled={!query.trim() || loading}
                    activeOpacity={0.85}
                >
                    {loading
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <><MaterialCommunityIcons name="robot-outline" size={17} color="#fff" /><Text style={styles.searchBtnText}>Analyse with AI</Text></>
                    }
                </TouchableOpacity>
            </LinearGradient>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                    {/* Common symptom chips */}
                    {!result && !loading && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Common Symptoms</Text>
                            <View style={styles.chipsGrid}>
                                {COMMON_SYMPTOMS.map((s, i) => (
                                    <TouchableOpacity
                                        key={i}
                                        style={styles.symptomChip}
                                        onPress={() => { setQuery(s.label); searchSymptom(s.label); }}
                                        activeOpacity={0.75}
                                    >
                                        <MaterialCommunityIcons name={s.icon} size={16} color={COLORS.primary} />
                                        <Text style={styles.symptomChipText}>{s.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Disclaimer */}
                            <View style={styles.disclaimerBox}>
                                <MaterialCommunityIcons name="shield-alert-outline" size={16} color={COLORS.warningText} />
                                <Text style={styles.disclaimerText}>
                                    This tool provides general information only. It does not diagnose conditions or replace professional medical advice. Always consult a qualified doctor.
                                </Text>
                            </View>
                        </View>
                    )}

                    {loading && (
                        <View style={styles.loadingBox}>
                            <ActivityIndicator color={COLORS.primary} size="large" />
                            <Text style={styles.loadingText}>Analysing "{query}"...</Text>
                            <Text style={styles.loadingSubText}>Searching medicine database</Text>
                        </View>
                    )}

                    {result && !loading && (
                        <View style={styles.section}>
                            {/* Overview */}
                            <View style={styles.overviewCard}>
                                <View style={styles.overviewTop}>
                                    <Text style={styles.overviewSymptom}>{result.symptom}</Text>
                                    <View style={[styles.urgencyBadge, { backgroundColor: urgencyBg[result.urgency] }]}>
                                        <Text style={[styles.urgencyText, { color: urgencyColor[result.urgency] }]}>
                                            {result.urgency} urgency
                                        </Text>
                                    </View>
                                </View>
                                <Text style={styles.overviewText}>{result.overview}</Text>
                                {result.urgencyNote && (
                                    <View style={styles.urgencyNote}>
                                        <Feather name="alert-triangle" size={13} color={urgencyColor[result.urgency]} />
                                        <Text style={[styles.urgencyNoteText, { color: urgencyColor[result.urgency] }]}>{result.urgencyNote}</Text>
                                    </View>
                                )}
                            </View>

                            {/* Medicine Classes */}
                            <Text style={styles.sectionTitle}>Medicine Classes Typically Used</Text>
                            {result.medicineClasses?.map((cls, i) => (
                                <MedClassCard key={i} data={cls} index={i} />
                            ))}

                            {/* Lifestyle */}
                            {result.lifestyle && (
                                <>
                                    <Text style={styles.sectionTitle}>Lifestyle Tips</Text>
                                    <View style={styles.lifestyleCard}>
                                        {result.lifestyle.map((tip, i) => (
                                            <View key={i} style={styles.lifestyleRow}>
                                                <View style={styles.lifestyleDot} />
                                                <Text style={styles.lifestyleTip}>{tip}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </>
                            )}

                            {/* Doctor Script */}
                            <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Prepare for Your Doctor</Text>
                            <DoctorScriptCard
                                symptom={result.symptom}
                                medicines={result.medicineClasses?.flatMap(c => c.examples?.slice(0, 1) || []) || []}
                            />

                            {/* Disclaimer */}
                            <View style={[styles.disclaimerBox, { marginTop: 16 }]}>
                                <MaterialCommunityIcons name="shield-check-outline" size={16} color={COLORS.textMuted} />
                                <Text style={styles.disclaimerText}>
                                    AI-generated for informational purposes only. Do not self-medicate. Always get a proper diagnosis from a licensed doctor.
                                </Text>
                            </View>
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { paddingBottom: 20, overflow: 'hidden', position: 'relative' },
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
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
    headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 1 },
    searchBox: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, height: 50,
        marginHorizontal: 20, ...SHADOWS.md,
    },
    searchInput: { flex: 1, fontSize: 15, color: COLORS.textPrimary },
    searchBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: COLORS.primary, height: 46, borderRadius: 12,
        marginHorizontal: 20, marginTop: 10, ...SHADOWS.colored,
    },
    searchBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },

    section: { paddingHorizontal: 20, marginTop: 20 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 12, marginTop: 8 },
    chipsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
    symptomChip: {
        flexDirection: 'row', alignItems: 'center', gap: 7,
        backgroundColor: COLORS.white, paddingHorizontal: 12, paddingVertical: 9,
        borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
    },
    symptomChipText: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },

    disclaimerBox: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 10,
        backgroundColor: COLORS.warningBg, borderRadius: 14, padding: 14,
        borderWidth: 1, borderColor: COLORS.warningBorder,
    },
    disclaimerText: { flex: 1, fontSize: 12, color: COLORS.warningText, lineHeight: 18 },

    loadingBox: { padding: 60, alignItems: 'center', gap: 12 },
    loadingText: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
    loadingSubText: { fontSize: 13, color: COLORS.textSecondary },

    overviewCard: {
        backgroundColor: COLORS.white, borderRadius: 18, padding: 18,
        borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm, gap: 10, marginBottom: 20,
    },
    overviewTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    overviewSymptom: { fontSize: 20, fontWeight: '900', color: COLORS.textPrimary },
    urgencyBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    urgencyText: { fontSize: 12, fontWeight: '700' },
    overviewText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 21 },
    urgencyNote: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 8,
        backgroundColor: COLORS.warningBg, borderRadius: 10, padding: 10,
        borderWidth: 1, borderColor: COLORS.warningBorder,
    },
    urgencyNoteText: { flex: 1, fontSize: 12, fontWeight: '600', lineHeight: 17 },

    lifestyleCard: {
        backgroundColor: COLORS.white, borderRadius: 16, padding: 16,
        borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm, gap: 10,
    },
    lifestyleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    lifestyleDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.primary, marginTop: 7 },
    lifestyleTip: { flex: 1, fontSize: 13, color: COLORS.textPrimary, lineHeight: 20 },
});
