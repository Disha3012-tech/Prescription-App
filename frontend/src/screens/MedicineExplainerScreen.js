import React, { useState, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
    SafeAreaView, StatusBar, Animated, LayoutAnimation, UIManager, Platform, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, SHADOWS } from '../theme';
import { MaterialCommunityIcons, Feather, Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Section Row ───────────────────────────────────────────────────────────────
const InfoSection = ({ icon, iconColor, iconBg, title, children }) => (
    <View style={sec.wrap}>
        <View style={[sec.iconBox, { backgroundColor: iconBg }]}>
            <MaterialCommunityIcons name={icon} size={16} color={iconColor} />
        </View>
        <View style={{ flex: 1 }}>
            <Text style={sec.title}>{title}</Text>
            {children}
        </View>
    </View>
);
const sec = StyleSheet.create({
    wrap: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    iconBox: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center', flexShrink: 0, marginTop: 1 },
    title: { fontSize: 13, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 5 },
});

// ─── Confidence Ring ───────────────────────────────────────────────────────────
const ConfidenceDot = ({ level }) => {
    const color = level === 'High' ? COLORS.primary : level === 'Medium' ? COLORS.warningText : COLORS.dangerText;
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
            <Text style={{ fontSize: 11, fontWeight: '700', color }}>{level} confidence</Text>
        </View>
    );
};

// ─── Medicine Explainer Card ───────────────────────────────────────────────────
const MedicineCard = ({ medicine, index }) => {
    const [expanded, setExpanded] = useState(false);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(medicine);

    const rotateAnim = useRef(new Animated.Value(0)).current;

    const gradients = [GRADIENTS.teal, GRADIENTS.purple, ['#F43F5E', '#E11D48'], GRADIENTS.gold];
    const cardGrad = gradients[index % gradients.length];

    const fetchDetails = async () => {
        if (!medicine._id) return;

        // prevent refetch
        if (data.sideEffects?.[0] !== 'Loading...') return;

        try {
            setLoading(true);

            const res = await fetch(`${API_URL}api/medications/${medicine._id}/explain`);
            const result = await res.json();

            const explanation = result.explanation || {};
            setData(prev => ({
                ...prev,
                class: explanation.medicine_class || prev.class,
                whatItDoes: explanation.what_it_does || "No data",
                sideEffects: explanation.side_effects || [],
                foodInteractions: explanation.food_interactions || [],
                generics: explanation.generics || [],
                doctorTip: explanation.doctor_tip || "",
                approximatePrice: explanation.approximate_price || "",
                confidence: 'High', // AI successful
            }));

        } catch (e) {
            console.log("Explain API error:", e);
        } finally {
            setLoading(false);
        }
    };

    const toggle = async () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

        const newExpanded = !expanded;
        setExpanded(newExpanded);

        if (newExpanded) {
            await fetchDetails();
        }

        Animated.timing(rotateAnim, {
            toValue: newExpanded ? 1 : 0,
            duration: 250,
            useNativeDriver: true,
        }).start();
    };

    const chevronRotate = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '180deg'],
    });

    return (
        <View style={card.wrap}>
            {/* Header */}
            <TouchableOpacity onPress={toggle} activeOpacity={0.8} style={card.header}>
                <LinearGradient colors={cardGrad} style={card.iconBox}>
                    <MaterialCommunityIcons name="pill" size={20} color="#fff" />
                </LinearGradient>

                <View style={{ flex: 1 }}>
                    <Text style={card.medName}>{data.name}</Text>
                    <Text style={card.medClass}>{data.class} · {data.dose}</Text>
                </View>

                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <ConfidenceDot level={data.confidence} />
                    <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
                        <Feather name="chevron-down" size={18} color={COLORS.textSecondary} />
                    </Animated.View>
                </View>
            </TouchableOpacity>

            {/* Tags */}
            <View style={card.chips}>
                {data.tags?.map((tag, i) => (
                    <View key={i} style={card.chip}>
                        <Text style={card.chipText}>{tag}</Text>
                    </View>
                ))}
            </View>

            {/* Expanded */}
            {expanded && (
                <View style={card.detail}>
                    <View style={card.divider} />

                    {loading ? (
                        <ActivityIndicator size="small" color={COLORS.primary} />
                    ) : (
                        <>
                            {/* What it does */}
                            <InfoSection
                                icon="information-outline"
                                iconColor={COLORS.primary}
                                iconBg={COLORS.successBg}
                                title="What it does"
                            >
                                <Text style={card.bodyText}>{data.whatItDoes}</Text>
                            </InfoSection>

                            {/* Side Effects */}
                            <InfoSection
                                icon="alert-outline"
                                iconColor={COLORS.warningText}
                                iconBg={COLORS.warningBg}
                                title="Common side effects"
                            >
                                {data.sideEffects?.length ? (
                                    data.sideEffects.map((s, i) => (
                                        <Text key={i} style={card.bodyText}>• {s}</Text>
                                    ))
                                ) : (
                                    <Text style={card.bodyText}>No known side effects</Text>
                                )}
                            </InfoSection>

                            {/* Food Interactions */}
                            <InfoSection
                                icon="food-off"
                                iconColor={COLORS.dangerText}
                                iconBg={COLORS.dangerBg}
                                title="Food interactions"
                            >
                                {data.foodInteractions?.length ? (
                                    data.foodInteractions.map((f, i) => (
                                        <Text key={i} style={card.bodyText}>
                                            {f.food} — {f.reason}
                                        </Text>
                                    ))
                                ) : (
                                    <Text style={card.bodyText}>No major food interactions</Text>
                                )}
                            </InfoSection>

                            {/* Doctor Tip */}
                            {data.doctorTip ? (
                                <View style={card.tipBox}>
                                    <Ionicons name="chatbubble-ellipses-outline" size={16} color={COLORS.primary} />
                                    <Text style={card.tipText}>{data.doctorTip}</Text>
                                </View>
                            ) : null}

                            {/* Generics */}
                            {data.generics?.length > 0 && (
                                <View style={{ marginTop: 20 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                        <Text style={sec.title}>Lower Cost Alternatives</Text>
                                        {data.approximatePrice ? (
                                            <View style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#CBD5E1' }}>
                                                <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 2 }}>CURRENT PRICE</Text>
                                                <Text style={{ fontSize: 18, fontWeight: '900', color: COLORS.textPrimary }}>₹{data.approximatePrice}</Text>
                                            </View>
                                        ) : null}
                                    </View>
                                    {data.generics.map((g, i) => (
                                        <View key={i} style={[card.genericRow, { marginBottom: 10 }]}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={card.genericName}>{g.name}</Text>
                                                <Text style={card.genericMaker}>{g.manufacturer}</Text>
                                            </View>
                                            <View style={card.savingsBadge}>
                                                <Text style={card.originalPrice}>₹{g.originalPrice}</Text>
                                                <Text style={card.genericPrice}>₹{g.genericPrice}</Text>
                                                <View style={card.savePct}>
                                                    <Text style={card.savePctText}>{g.savingPct}% Less</Text>
                                                </View>
                                            </View>
                                        </View>
                                    ))}
                                    <Text style={card.genericDisclaimer}>* Prices are estimates for India. Consult your pharmacist.</Text>
                                </View>
                            )}
                        </>
                    )}
                </View>
            )}
        </View>
    );
};

const card = StyleSheet.create({
    wrap: {
        backgroundColor: COLORS.white, borderRadius: 20, marginHorizontal: 20, marginBottom: 12,
        borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', ...SHADOWS.sm,
    },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
    iconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    medName: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
    medClass: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 16, paddingBottom: 14 },
    chip: {
        backgroundColor: COLORS.successBg, paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: 10, borderWidth: 1, borderColor: COLORS.border,
    },
    chipText: { fontSize: 11, fontWeight: '600', color: COLORS.primary },
    divider: { height: 1, backgroundColor: COLORS.border, marginBottom: 16 },
    detail: { paddingHorizontal: 16, paddingBottom: 16 },
    bodyText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },
    foodTag: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 10,
        backgroundColor: COLORS.dangerBg, borderRadius: 12, padding: 10,
        borderWidth: 1, borderColor: COLORS.dangerBorder,
    },
    foodEmoji: { fontSize: 20 },
    foodName: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
    foodWhy: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2, lineHeight: 17 },
    foodSeverity: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
    genericRow: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: COLORS.successBg, borderRadius: 12, padding: 12,
        borderWidth: 1, borderColor: COLORS.successBorder,
    },
    genericName: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
    genericMaker: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
    savingsBadge: { alignItems: 'flex-end', gap: 2 },
    originalPrice: { fontSize: 11, color: COLORS.textMuted, textDecorationLine: 'line-through' },
    genericPrice: { fontSize: 14, fontWeight: '800', color: COLORS.primary },
    savePct: { backgroundColor: COLORS.primary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    savePctText: { fontSize: 11, fontWeight: '800', color: '#fff' },
    genericDisclaimer: { fontSize: 11, color: COLORS.textMuted, fontStyle: 'italic', lineHeight: 16 },
    tipBox: {
        flexDirection: 'row', gap: 10, alignItems: 'flex-start',
        backgroundColor: COLORS.successBg, borderRadius: 12, padding: 12,
        borderWidth: 1, borderColor: COLORS.border,
    },
    tipText: { flex: 1, fontSize: 13, color: COLORS.textPrimary, lineHeight: 19, fontStyle: 'italic' },
});

// ─── Screen ────────────────────────────────────────────────────────────────────
const SAMPLE_MEDICINES = [
    {
        name: 'Metformin 500mg',
        class: 'Biguanide',
        dose: '1 tablet twice daily',
        confidence: 'High',
        tags: ['Diabetes', 'Blood Sugar', 'Oral'],
        whatItDoes: 'Metformin lowers blood sugar by reducing glucose production in the liver and improving your body\'s sensitivity to insulin. It does not cause weight gain and is usually the first medicine prescribed for Type 2 diabetes.',
        sideEffects: ['Nausea or upset stomach (especially early on)', 'Diarrhea or loose stools', 'Metallic taste in mouth', 'Vitamin B12 deficiency over long-term use'],
        foodInteractions: [
            { emoji: '🍺', food: 'Alcohol', reason: 'Increases risk of lactic acidosis — a rare but serious side effect', severity: 'Avoid' },
            { emoji: '🍽️', food: 'Heavy meals', reason: 'Take with food to reduce stomach upset', severity: 'Caution' },
        ],
        generics: [
            { name: 'Glycomet 500mg', manufacturer: 'USV Pvt Ltd', originalPrice: 85, genericPrice: 22, savingPct: 74 },
            { name: 'Glucophage 500mg', manufacturer: 'Merck', originalPrice: 120, genericPrice: 35, savingPct: 71 },
        ],
        doctorTip: '"Ask your doctor if you can take Metformin SR (slow release) — it causes far less stomach upset and is taken only once a day."',
    },
    {
        name: 'Amlodipine 5mg',
        class: 'Calcium Channel Blocker',
        dose: '1 tablet once daily',
        confidence: 'High',
        tags: ['Blood Pressure', 'Heart', 'Daily'],
        whatItDoes: 'Amlodipine relaxes blood vessels, making it easier for your heart to pump blood. It lowers high blood pressure and reduces the frequency of chest pain (angina). It works best when taken at the same time every day.',
        sideEffects: ['Ankle or foot swelling', 'Flushing or feeling hot', 'Headache (usually goes away after a few weeks)', 'Dizziness when standing up quickly'],
        foodInteractions: [
            { emoji: '🍊', food: 'Grapefruit / Grapefruit juice', reason: 'Grapefruit increases amlodipine levels in blood — can amplify side effects', severity: 'Avoid' },
            { emoji: '🧂', food: 'High sodium foods', reason: 'Salt counteracts blood pressure medication effectiveness', severity: 'Caution' },
        ],
        generics: [
            { name: 'Amlopress 5mg', manufacturer: 'Cipla', originalPrice: 95, genericPrice: 18, savingPct: 81 },
            { name: 'Stamlo 5mg', manufacturer: 'Dr. Reddy\'s', originalPrice: 88, genericPrice: 21, savingPct: 76 },
        ],
        doctorTip: '"Never stop Amlodipine suddenly — it can cause a rebound increase in blood pressure. Always consult your doctor before stopping."',
    },
];

export default function MedicineExplainerScreen({ navigate, user, medicines: propMedicines }) {
    const [medicines, setMedicines] = React.useState(propMedicines || SAMPLE_MEDICINES);
    const [loading, setLoading] = React.useState(!propMedicines && !!user?.id);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [globalSearchLoading, setGlobalSearchLoading] = React.useState(false);
    const [globalResult, setGlobalResult] = React.useState(null);
    const [country, setCountry] = React.useState('India');

    React.useEffect(() => {
        if (!propMedicines && user?.id) {
            loadMedicinesFromBackend();
        }
    }, [user]);

    const handleGlobalSearch = async () => {
        if (!searchQuery.trim()) return;
        try {
            setGlobalSearchLoading(true);
            setGlobalResult(null);

            const res = await fetch(`${API_URL}api/medications/search-explain?name=${encodeURIComponent(searchQuery)}`);
            const data = await res.json();

            if (data && data.explanation) {
                const cached = data.explanation;
                setGlobalResult({
                    name: data.medicine || searchQuery,
                    class: cached.medicine_class || 'General Medicine',
                    dose: 'Information only',
                    confidence: 'AI Search',
                    tags: ['Generic Available'],
                    whatItDoes: cached.what_it_does || 'No summary available.',
                    sideEffects: cached.side_effects || [],
                    foodInteractions: cached.food_interactions || [],
                    generics: cached.generics || [],
                    doctorTip: cached.doctor_tip || cached.important_warning,
                    approximatePrice: cached.approximate_price,
                    _id: 'search_' + Date.now()
                });
            }
        } catch (e) {
            console.error("Global search error:", e);
        } finally {
            setGlobalSearchLoading(false);
        }
    };

    const loadMedicinesFromBackend = async () => {
        try {
            const res = await fetch(`${API_URL}api/medications?user_id=${user.id}`);
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                // Map backend medications to our display format
                const mapped = data.map((med, i) => {
                    let cached = {};
                    if (med.explanation_json) {
                        try {
                            const parsed = JSON.parse(med.explanation_json);
                            cached = parsed.explanation || {};
                        } catch (e) { }
                    }

                    return {
                        name: med.name,
                        class: cached.medicine_class || 'Prescription Medicine',
                        dose: med.dose || 'As prescribed',
                        confidence: cached.medicine_class ? 'High' : 'High',
                        tags: ['Prescribed', med.dose ? 'Dosed' : 'Rx'].filter(Boolean),
                        whatItDoes: cached.what_it_does || 'Tap the ⓘ detail button to load full AI explanation for this medicine.',
                        sideEffects: cached.side_effects || ['Loading...'],
                        foodInteractions: cached.food_interactions || [],
                        generics: cached.generics || [],
                        doctorTip: cached.doctor_tip || '"Always take this medicine exactly as prescribed by your doctor."',
                        approximatePrice: cached.approximate_price || "",
                        _id: med.id,
                    };
                });
                setMedicines(mapped);
            }
        } catch (e) {
            console.log('Could not load medicines from backend, using sample data');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.midnight} />

            <LinearGradient colors={GRADIENTS.hero} style={styles.header}>
                <View style={styles.bgDeco} />
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => navigate && navigate('DASHBOARD')} style={styles.backBtn}>
                        <Feather name="arrow-left" size={20} color="rgba(255,255,255,0.8)" />
                    </TouchableOpacity>
                    <View style={{ flex: 1, paddingLeft: 14 }}>
                        <Text style={styles.headerTitle}>Medicine Guide</Text>
                        <Text style={styles.headerSub}>Tap any card to expand details</Text>
                    </View>
                    <View style={styles.countBadge}>
                        <Text style={styles.countText}>{medicines.length} meds</Text>
                    </View>
                </View>

                {/* Feature highlights */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featureRow}>
                    {[
                        { icon: 'information-outline', label: 'What it does', color: '#5EEAD4' },
                        { icon: 'alert-outline', label: 'Side effects', color: '#FCD34D' },
                        { icon: 'food-off', label: 'Food alerts', color: '#FCA5A5' },
                        { icon: 'currency-inr', label: 'Save money', color: '#A5F3D0' },
                    ].map((f, i) => (
                        <View key={i} style={styles.featureChip}>
                            <MaterialCommunityIcons name={f.icon} size={13} color={f.color} />
                            <Text style={styles.featureChipText}>{f.label}</Text>
                        </View>
                    ))}
                </ScrollView>

                {/* Search Bar */}
                <View style={styles.searchSection}>
                    <View style={styles.searchBar}>
                        <Feather name="search" size={18} color={COLORS.textMuted} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search any medicine name..."
                            placeholderTextColor={COLORS.textMuted}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            onSubmitEditing={handleGlobalSearch}
                        />
                        {searchQuery ? (
                            <TouchableOpacity onPress={() => { setSearchQuery(''); setGlobalResult(null); }}>
                                <Feather name="x" size={16} color={COLORS.textMuted} />
                            </TouchableOpacity>
                        ) : null}
                    </View>
                    <TouchableOpacity style={styles.searchBtn} onPress={handleGlobalSearch}>
                        {globalSearchLoading ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.searchBtnText}>Search</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            {loading ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={{ fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' }}>Loading your medicines...</Text>
                </View>
            ) : (
                <ScrollView contentContainerStyle={{ paddingTop: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

                    {globalResult && (
                        <View style={styles.searchResultsContainer}>
                            <Text style={styles.searchResultTitle}>AI SEARCH RESULT</Text>
                            <MedicineCard medicine={globalResult} index={0} />
                            <View style={styles.searchDivider} />
                        </View>
                    )}

                    <Text style={styles.listTitle}>{globalResult ? 'YOUR MEDICINES' : 'MY MEDICINES'}</Text>
                    {medicines.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase())).map((med, i) => (
                        <MedicineCard key={i} medicine={med} index={i} />
                    ))}

                    {/* Disclaimer */}
                    <View style={styles.disclaimer}>
                        <MaterialCommunityIcons name="shield-alert-outline" size={16} color={COLORS.textMuted} />
                        <Text style={styles.disclaimerText}>
                            Information is AI-generated for reference only. Always consult your doctor or pharmacist before making changes to your medication.
                        </Text>
                    </View>
                </ScrollView>
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
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
    headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 1 },
    countBadge: {
        backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    },
    countText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
    featureRow: { paddingHorizontal: 20, gap: 8, paddingBottom: 4 },
    featureChip: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 7,
        borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    },
    featureChipText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
    disclaimer: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 10,
        marginHorizontal: 20, marginTop: 8, padding: 14,
        backgroundColor: COLORS.lightGray, borderRadius: 14,
    },
    disclaimerText: { flex: 1, fontSize: 12, color: COLORS.textMuted, lineHeight: 18 },

    // Search Styles
    searchSection: {
        flexDirection: 'row', gap: 10, paddingHorizontal: 20,
        marginTop: 16, marginBottom: 8, alignItems: 'center'
    },
    searchBar: {
        flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12,
        height: 44, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)'
    },
    searchInput: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '600' },
    searchBtn: {
        backgroundColor: '#fff', height: 44, paddingHorizontal: 16,
        borderRadius: 12, justifyContent: 'center', alignItems: 'center'
    },
    searchBtnText: { color: COLORS.primary, fontWeight: '800', fontSize: 13 },

    searchResultsContainer: { paddingHorizontal: 20, marginBottom: 20 },
    searchResultTitle: { fontSize: 11, fontWeight: '800', color: COLORS.primary, marginBottom: 10, letterSpacing: 1 },
    searchDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 20 },
    listTitle: { fontSize: 11, fontWeight: '800', color: COLORS.textMuted, marginLeft: 20, marginBottom: 12, letterSpacing: 1 },
});
