import React, { useState, useRef } from 'react';
import {
    View, Text, ScrollView, Image, TouchableOpacity, TextInput,
    StyleSheet, Dimensions, Alert, ActivityIndicator
} from 'react-native';
import { API_URL } from '../config';

const { width: SCREEN_W } = Dimensions.get('window');

export default function ConfirmMedicinesScreen({ route, navigation }) {
    const { imageUri, medicineHighlights, rawResult, country, currency, userId, prescriptionId, isEditing, image_hash } = route.params;
    const [confirmed, setConfirmed] = useState(
        medicineHighlights.reduce((acc, m) => {
            acc[m.medicine] = true;
            return acc;
        }, {})
    );
    const [editableMeds, setEditableMeds] = useState(
        rawResult.results.reduce((acc, r) => {
            acc[r.name] = { dosage: r.dosage || '', frequency: r.frequency || '' };
            return acc;
        }, {})
    );
    const [imgLayout, setImgLayout] = useState(null);
    const [naturalSize, setNaturalSize] = useState(null);
    const [loading, setLoading] = useState(false);
    const [selectedBox, setSelectedBox] = useState(null);
    const [imgError, setImgError] = useState(false);

    const updateMed = (name, field, value) => {
        setEditableMeds(prev => ({
            ...prev,
            [name]: { ...prev[name], [field]: value }
        }));
    };

    const onImageLoad = (e) => {
        setNaturalSize({ w: e.nativeEvent.source.width, h: e.nativeEvent.source.height });
    };

    const onImageLayout = (e) => {
        setImgLayout(e.nativeEvent.layout);
    };

    // Scale OCR bounding box coords accounting for resizeMode="contain" centering
    const scaleBbox = (bbox) => {
        if (!imgLayout || !naturalSize || !bbox) return null;

        const containerW = imgLayout.width;
        const containerH = imgLayout.height;
        const imageW = naturalSize.w;
        const imageH = naturalSize.h;

        const scale = Math.min(containerW / imageW, containerH / imageH);
        const renderedW = imageW * scale;
        const renderedH = imageH * scale;
        const offsetX = (containerW - renderedW) / 2;
        const offsetY = (containerH - renderedH) / 2;

        const xs = bbox.map(p => p[0]);
        const ys = bbox.map(p => p[1]);

        return {
            left: (Math.min(...xs) * scale) + offsetX,
            top: (Math.min(...ys) * scale) + offsetY,
            width: (Math.max(...xs) - Math.min(...xs)) * scale,
            height: (Math.max(...ys) - Math.min(...ys)) * scale,
        };
    };

    const toggle = (name) => {
        setConfirmed(prev => ({ ...prev, [name]: !prev[name] }));
    };

    const handleConfirm = async () => {
        const confirmedMeds = rawResult.results
            .filter(r => confirmed[r.name])
            .map(r => ({
                name: r.name,
                form: r.form,
                dosage: editableMeds[r.name]?.dosage || r.dosage || '',
                frequency: editableMeds[r.name]?.frequency || r.frequency || '',
                duration: r.duration,
            }));

        if (confirmedMeds.length === 0) {
            Alert.alert('No medicines selected', 'Please confirm at least one medicine.');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_URL}confirm-medicines`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    confirmed_medicines: confirmedMeds,
                    country,
                    currency,
                    user_id: userId,
                    raw_text: rawResult.raw_text,
                    avg_confidence: rawResult.avg_confidence,
                    image_url: route.params.image_url,
                    image_hash: image_hash,
                    prescription_id: prescriptionId
                }),
            });
            const data = await res.json();

            if (res.ok && data.status === 'success') {
                if (isEditing) {
                    navigation.navigate('HISTORY');
                } else {
                    navigation.navigate('SCANNER', { analysisResult: data });
                }
            } else {
                Alert.alert('Error', data.message || 'Failed to save prescription.');
            }
        } catch (e) {
            console.error('Confirm error:', e);
            Alert.alert('Error', 'Connection failed. Please check your internet.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Review your prescription</Text>
            <Text style={styles.sub}>Tap medicines to confirm or reject</Text>

            {/* Image with overlaid bounding boxes */}
            {!imgError && imageUri ? (
                <View style={styles.imageContainer}>
                    <Image
                        source={{ uri: imageUri }}
                        style={styles.image}
                        resizeMode="contain"
                        onLoad={onImageLoad}
                        onError={() => setImgError(true)}
                        onLayout={onImageLayout}
                    />
                    {imgLayout && naturalSize && medicineHighlights.map((m, i) => {
                        const scaled = scaleBbox(m.bbox);
                        if (!scaled) return null;
                        const isOn = confirmed[m.medicine];
                        return (
                            <TouchableOpacity
                                key={i}
                                onPress={() => { toggle(m.medicine); setSelectedBox(m.medicine); }}
                                style={[
                                    styles.bbox,
                                    {
                                        left: scaled.left,
                                        top: scaled.top,
                                        width: scaled.width,
                                        height: scaled.height,
                                        borderColor: m.uncertain ? '#F59E0B' : isOn ? '#10B981' : '#EF4444',
                                        backgroundColor: isOn
                                            ? 'rgba(16,185,129,0.15)'
                                            : m.uncertain
                                                ? 'rgba(245,158,11,0.15)'
                                                : 'rgba(239,68,68,0.10)',
                                    }
                                ]}
                            />
                        );
                    })}
                </View>
            ) : null}

            {/* Medicine list */}
            <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 100 }}>
                {medicineHighlights.map((m, i) => {
                    const isOn = confirmed[m.medicine];
                    const pct = Math.round(m.confidence * 100);
                    return (
                        <View
                            key={i}
                            style={[styles.card, isOn && styles.cardOn, selectedBox === m.medicine && styles.cardSelected]}
                        >
                            <View style={styles.cardHeader}>
                                <View style={styles.cardLeft}>
                                    <Text style={styles.medName}>{m.medicine}</Text>
                                    <View style={styles.row}>
                                        <View style={[styles.badge,
                                        { backgroundColor: m.uncertain ? '#FEF3C7' : pct > 80 ? '#D1FAE5' : '#FEE2E2' }]}>
                                            <Text style={[styles.badgeText,
                                            { color: m.uncertain ? '#92400E' : pct > 80 ? '#065F46' : '#991B1B' }]}>
                                                {m.uncertain ? '⚠ uncertain' : `${pct}% confident`}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                                <TouchableOpacity onPress={() => toggle(m.medicine)} style={[styles.toggle, isOn && styles.toggleOn]}>
                                    <Text style={{ color: isOn ? '#fff' : '#6B7280', fontSize: 12 }}>
                                        {isOn ? '✓ Include' : 'Skip'}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {isOn && editableMeds[m.medicine] && (
                                <View style={styles.editForm}>
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>Dosage</Text>
                                        <TextInput
                                            style={styles.textInput}
                                            value={editableMeds[m.medicine].dosage}
                                            onChangeText={(t) => updateMed(m.medicine, 'dosage', t)}
                                            placeholder="e.g. 500mg"
                                            placeholderTextColor="#9CA3AF"
                                        />
                                    </View>
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>Frequency</Text>
                                        <TextInput
                                            style={styles.textInput}
                                            value={editableMeds[m.medicine].frequency}
                                            onChangeText={(t) => updateMed(m.medicine, 'frequency', t)}
                                            placeholder="e.g. Twice a day"
                                            placeholderTextColor="#9CA3AF"
                                        />
                                    </View>
                                </View>
                            )}
                        </View>
                    );
                })}
            </ScrollView>

            {/* Confirm button */}
            <View style={styles.footer}>
                <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} disabled={loading}>
                    {loading
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={styles.confirmText}>
                            Confirm {Object.values(confirmed).filter(Boolean).length} medicine(s)
                        </Text>
                    }
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: { fontSize: 20, fontWeight: '600', color: '#111827', margin: 16, marginBottom: 2 },
    sub: { fontSize: 13, color: '#6B7280', marginHorizontal: 16, marginBottom: 10 },
    imageContainer: { width: '100%', height: 260, backgroundColor: 'transparent', position: 'relative', marginVertical: 4 },
    image: { width: '100%', height: '100%' },
    bbox: { position: 'absolute', borderWidth: 2, borderRadius: 4 },
    list: { flex: 1, padding: 12 },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12, padding: 14, marginBottom: 10,
        borderWidth: 1, borderColor: '#E5E7EB',
        shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    cardOn: { borderColor: '#10B981', backgroundColor: '#F0FDF4' },
    cardSelected: { shadowOpacity: 0.12, elevation: 4 },
    cardLeft: { flex: 1 },
    medName: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 4 },
    row: { flexDirection: 'row', alignItems: 'center' },
    badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginRight: 8 },
    badgeText: { fontSize: 11, fontWeight: '500' },
    toggle: {
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
        backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB'
    },
    toggleOn: { backgroundColor: '#10B981', borderColor: '#10B981' },
    editForm: { marginTop: 12, flexDirection: 'row', gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#D1FAE5' },
    inputGroup: { flex: 1 },
    inputLabel: { fontSize: 11, color: '#065F46', fontWeight: '600', marginBottom: 4 },
    textInput: {
        backgroundColor: '#fff', borderWidth: 1, borderColor: '#A7F3D0', borderRadius: 8,
        paddingHorizontal: 10, paddingVertical: 6, fontSize: 13, color: '#111827'
    },
    footer: { padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
    confirmBtn: { backgroundColor: '#3B82F6', borderRadius: 12, padding: 16, alignItems: 'center' },
    confirmText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
