import React, { useState, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
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
    const rotateAnim = useRef(new Animated.Value(0)).current;

    const toggle = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpanded(e => !e);
        Animated.timing(rotateAnim, {
            toValue: expanded ? 0 : 1,
            duration: 250,
            useNativeDriver: true,
        }).start();
    };

    const chevronRotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

    const gradients = [GRADIENTS.teal, GRADIENTS.purple, ['#F43F5E', '#E11D48'], GRADIENTS.gold];
    const cardGrad = gradients[index % gradients.length];

    return (
        <View style={card.wrap}>
            {/* Collapsed header — always visible */}
            <TouchableOpacity onPress={toggle} activeOpacity={0.8} style={card.header}>
                <LinearGradient colors={cardGrad} style={card.iconBox}>
                    <MaterialCommunityIcons name="pill" size={20} color="#fff" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                    <Text style={card.medName}>{medicine.name}</Text>
                    <Text style={card.medClass}>{medicine.class} · {medicine.dose}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <ConfidenceDot level={medicine.confidence} />
                    <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
                        <Feather name="chevron-down" size={18} color={COLORS.textSecondary} />
                    </Animated.View>
                </View>
            </TouchableOpacity>

            {/* Quick chips always visible */}
            <View style={card.chips}>
                {medicine.tags.map((tag, i) => (
                    <View key={i} style={card.chip}>
                        <Text style={card.chipText}>{tag}</Text>
                    </View>
                ))}
            </View>

            {/* Expanded detail */}
            {expanded && (
                <View style={card.detail}>
                    <View style={card.divider} />

                    {/* What it does */}
                    <InfoSection icon="information-outline" iconColor={COLORS.primary} iconBg={COLORS.successBg} title="What it does">
                        <Text style={card.bodyText}>{medicine.whatItDoes}</Text>
                    </InfoSection>

                    {/* Side Effects */}
                    <InfoSection icon="alert-outline" iconColor={COLORS.warningText} iconBg={COLORS.warningBg} title="Common side effects">
                        <View style={{ gap: 4 }}>
                            {medicine.sideEffects.map((s, i) => (
                                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: COLORS.warningText }} />
                                    <Text style={card.bodyText}>{s}</Text>
                                </View>
                            ))}
                        </View>
                    </InfoSection>

                    {/* Food Interactions */}
                    <InfoSection icon="food-off" iconColor={COLORS.dangerText} iconBg={COLORS.dangerBg} title="Food interactions">
                        <View style={{ gap: 6 }}>
                            {medicine.foodInteractions.map((f, i) => (
                                <View key={i} style={card.foodTag}>
                                    <Text style={card.foodEmoji}>{f.emoji}</Text>
                                    <View style={{ flex: 1 }}>
                                        <Text style={card.foodName}>{f.food}</Text>
                                        <Text style={card.foodWhy}>{f.reason}</Text>
                                    </View>
                                    <View style={[card.foodSeverity, { backgroundColor: f.severity === 'Avoid' ? COLORS.dangerBg : COLORS.warningBg }]}>
                                        <Text style={{ fontSize: 10, fontWeight: '700', color: f.severity === 'Avoid' ? COLORS.dangerText : COLORS.warningText }}>
                                            {f.severity}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </InfoSection>

                    {/* Generic Alternatives */}
                    {medicine.generics && medicine.generics.length > 0 && (
                        <InfoSection icon="currency-inr" iconColor={COLORS.primary} iconBg={COLORS.successBg} title="Cheaper generic alternatives">
                            <View style={{ gap: 8 }}>
                                {medicine.generics.map((g, i) => (
                                    <View key={i} style={card.genericRow}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={card.genericName}>{g.name}</Text>
                                            <Text style={card.genericMaker}>{g.manufacturer}</Text>
                                        </View>
                                        <View style={card.savingsBadge}>
                                            <Text style={card.originalPrice}>₹{g.originalPrice}</Text>
                                            <Text style={card.genericPrice}>₹{g.genericPrice}</Text>
                                        </View>
                                        <View style={card.savePct}>
                                            <Text style={card.savePctText}>Save {g.savingPct}%</Text>
                                        </View>
                                    </View>
                                ))}
                                <Text style={card.genericDisclaimer}>
                                    * Generic medicines contain identical active ingredients. Ask your pharmacist before switching.
                                </Text>
                            </View>
                        </InfoSection>
                    )}

                    {/* Doctor tip */}
                    <View style={card.tipBox}>
                        <Ionicons name="chatbubble-ellipses-outline" size={16} color={COLORS.primary} />
                        <Text style={card.tipText}>{medicine.doctorTip}</Text>
                    </View>
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
    const [country, setCountry] = React.useState('India');

    React.useEffect(() => {
        if (!propMedicines && user?.id) {
            loadMedicinesFromBackend();
        }
    }, [user]);

    const loadMedicinesFromBackend = async () => {
        try {
            const res = await fetch(`${API_URL}api/medications?user_id=${user.id}`);
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                // Map backend medications to our display format
                const mapped = data.map((med, i) => ({
                    name: med.name,
                    class: 'Prescription Medicine',
                    dose: med.dose || 'As prescribed',
                    confidence: 'High',
                    tags: ['Prescribed', med.dose ? 'Dosed' : 'Rx'].filter(Boolean),
                    whatItDoes: 'Tap the ⓘ detail button to load full AI explanation for this medicine.',
                    sideEffects: ['Loading...'],
                    foodInteractions: [],
                    generics: [],
                    doctorTip: '"Always take this medicine exactly as prescribed by your doctor."',
                    _id: med.id, // store for later AI explain
                }));
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
            </LinearGradient>

            {loading ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={{ fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' }}>Loading your medicines...</Text>
                </View>
            ) : (
                <ScrollView contentContainerStyle={{ paddingTop: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                    {medicines.map((med, i) => (
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
});
