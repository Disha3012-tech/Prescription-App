import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    SafeAreaView, StatusBar, Modal, TextInput, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, SHADOWS } from '../theme';
import { MaterialCommunityIcons, Feather, Ionicons } from '@expo/vector-icons';

import { API_URL } from '../config';

const RELATION_OPTIONS = ['Spouse', 'Child', 'Parent', 'Sibling', 'Grandparent', 'Other'];
const AVATAR_COLORS = [GRADIENTS.teal, GRADIENTS.purple, ['#F43F5E', '#E11D48'], GRADIENTS.gold, ['#0EA5E9', '#0369A1']];

const RelationIcon = ({ relation }) => {
    const map = { Spouse: 'heart-outline', Child: 'baby-face-outline', Parent: 'account-outline', Sibling: 'account-multiple-outline', Grandparent: 'human-cane', Other: 'account-question-outline' };
    return <MaterialCommunityIcons name={map[relation] || 'account-outline'} size={16} color="rgba(255,255,255,0.8)" />;
};

const MemberCard = ({ member, index, onSelect, onDelete, isActive }) => {
    const grad = AVATAR_COLORS[index % AVATAR_COLORS.length];
    const urgentCount = member.urgentMedsCount || 0;

    return (
        <TouchableOpacity
            style={[styles.memberCard, isActive && styles.memberCardActive]}
            onPress={() => onSelect(member)}
            activeOpacity={0.8}
        >
            {isActive && <View style={styles.activeBar} />}

            <View style={styles.memberCardTop}>
                <LinearGradient colors={grad} style={styles.avatar}>
                    <Text style={styles.avatarText}>{member.name[0].toUpperCase()}</Text>
                </LinearGradient>

                <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={styles.memberName}>{member.name}</Text>
                        {isActive && (
                            <View style={styles.activeBadge}>
                                <Text style={styles.activeBadgeText}>Active</Text>
                            </View>
                        )}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                        <RelationIcon relation={member.relation} />
                        <Text style={styles.memberRelation}>{member.relation}</Text>
                        {member.age && <Text style={styles.memberAge}>· {member.age}y</Text>}
                        {member.bloodGroup && <Text style={styles.memberAge}>· {member.bloodGroup}</Text>}
                    </View>
                </View>

                <TouchableOpacity
                    onPress={() => Alert.alert('Remove Profile', `Remove ${member.name}'s profile?`, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Remove', style: 'destructive', onPress: () => onDelete(member.id) },
                    ])}
                    style={styles.deleteBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Feather name="trash-2" size={15} color={COLORS.dangerText} />
                </TouchableOpacity>
            </View>

            <View style={styles.memberStats}>
                {[
                    { icon: 'pill', value: member.medsCount || 0, label: 'Medicines', color: COLORS.primary },
                    { icon: 'alert-circle-outline', value: urgentCount, label: 'Need Refill', color: urgentCount > 0 ? COLORS.warningText : COLORS.textMuted },
                    { icon: 'file-document-outline', value: member.prescriptionsCount || 0, label: 'Rx Scans', color: COLORS.accent },
                ].map((s, i) => (
                    <View key={i} style={styles.statItem}>
                        <MaterialCommunityIcons name={s.icon} size={14} color={s.color} />
                        <Text style={[styles.statVal, { color: s.color }]}>{s.value}</Text>
                        <Text style={styles.statLabel}>{s.label}</Text>
                    </View>
                ))}
            </View>

            {member.meds && member.meds.length > 0 && (
                <View style={styles.upcomingRow}>
                    <Text style={styles.upcomingLabel}>Medicines:</Text>
                    {member.meds.slice(0, 2).map((m, i) => (
                        <View key={i} style={styles.upcomingChip}>
                            <MaterialCommunityIcons name="pill" size={11} color={COLORS.primary} />
                            <Text style={styles.upcomingText}>{m.name}</Text>
                        </View>
                    ))}
                    {member.meds.length > 2 && (
                        <Text style={styles.upcomingMore}>+{member.meds.length - 2} more</Text>
                    )}
                </View>
            )}
        </TouchableOpacity>
    );
};

export default function FamilyProfilesScreen({ user, navigate }) {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeId, setActiveId] = useState(null);
    const [addModal, setAddModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ name: '', relation: 'Spouse', age: '', bloodGroup: '' });

    useEffect(() => {
        fetchFamily();
    }, []);

    const fetchFamily = async () => {
        if (!user?.id) { setLoading(false); return; }
        try {
            const res = await fetch(`${API_URL}api/family/${user.id}`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setMembers(data);
                if (data.length > 0 && !activeId) setActiveId(data[0].id);
            }
        } catch (e) {
            console.error('Family fetch error', e);
        } finally {
            setLoading(false);
        }
    };

    const activeMember = members.find(m => m.id === activeId);

    const addMember = async () => {
        if (!form.name.trim()) { Alert.alert('Name required'); return; }
        setSaving(true);
        try {
            const res = await fetch(`${API_URL}api/family/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user.id,
                    name: form.name.trim(),
                    relation: form.relation,
                    age: form.age || null,
                    blood_group: form.bloodGroup || null,
                }),
            });
            const data = await res.json();
            if (data.status === 'success') {
                setForm({ name: '', relation: 'Spouse', age: '', bloodGroup: '' });
                setAddModal(false);
                fetchFamily();
            }
        } catch (e) {
            Alert.alert('Error', 'Could not add family member. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const deleteMember = async (id) => {
        setMembers(prev => prev.filter(m => m.id !== id));
        if (activeId === id) setActiveId(members.find(m => m.id !== id)?.id || null);
        try {
            await fetch(`${API_URL}api/family/${id}`, { method: 'DELETE' });
        } catch (e) {
            fetchFamily(); // revert on error
        }
    };

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
                        <Text style={styles.headerTitle}>Family Profiles</Text>
                        <Text style={styles.headerSub}>Managing {members.length} profile{members.length !== 1 ? 's' : ''}</Text>
                    </View>
                    <TouchableOpacity style={styles.addBtn} onPress={() => setAddModal(true)}>
                        <Feather name="user-plus" size={16} color="#fff" />
                        <Text style={styles.addBtnText}>Add</Text>
                    </TouchableOpacity>
                </View>

                {/* Avatar row */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.avatarRow}>
                    {members.map((m, i) => (
                        <TouchableOpacity key={m.id} onPress={() => setActiveId(m.id)} style={styles.avatarWrap}>
                            <LinearGradient
                                colors={AVATAR_COLORS[i % AVATAR_COLORS.length]}
                                style={[styles.avatarSmall, activeId === m.id && styles.avatarSmallActive]}
                            >
                                <Text style={styles.avatarSmallText}>{m.name[0].toUpperCase()}</Text>
                            </LinearGradient>
                            {activeId === m.id && <View style={styles.avatarActiveDot} />}
                            <Text style={styles.avatarSmallName}>{m.name}</Text>
                        </TouchableOpacity>
                    ))}
                    <TouchableOpacity style={styles.avatarWrap} onPress={() => setAddModal(true)}>
                        <View style={styles.avatarAdd}>
                            <Feather name="plus" size={20} color={COLORS.primary} />
                        </View>
                        <Text style={styles.avatarSmallName}>Add</Text>
                    </TouchableOpacity>
                </ScrollView>
            </LinearGradient>

            <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                {/* Active member dashboard shortcut */}
                {activeMember && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{activeMember.name}'s Dashboard</Text>
                        <View style={styles.quickActions}>
                            {[
                                { icon: 'scan-helper', label: 'Scan Rx', screen: 'SCANNER', color: GRADIENTS.teal },
                                { icon: 'pill', label: 'Medicines', screen: 'DOSE_TRACKER', color: GRADIENTS.purple },
                                { icon: 'file-document-outline', label: 'History', screen: 'HISTORY', color: ['#F43F5E', '#E11D48'] },
                                { icon: 'robot-outline', label: 'Ask AI', screen: 'ASK_AI', color: GRADIENTS.gold },
                            ].map((a, i) => (
                                <TouchableOpacity key={i} style={styles.qaCard} onPress={() => navigate(a.screen, { memberId: activeMember.id })} activeOpacity={0.8}>
                                    <LinearGradient colors={a.color} style={styles.qaIcon}>
                                        <MaterialCommunityIcons name={a.icon} size={22} color="#fff" />
                                    </LinearGradient>
                                    <Text style={styles.qaLabel}>{a.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}

                {/* All profiles */}
                <Text style={[styles.sectionTitle, { paddingHorizontal: 20, marginTop: 8, marginBottom: 12 }]}>All Profiles</Text>
                {members.map((m, i) => (
                    <MemberCard
                        key={m.id}
                        member={m}
                        index={i}
                        isActive={m.id === activeId}
                        onSelect={(member) => setActiveId(member.id)}
                        onDelete={deleteMember}
                    />
                ))}

                {/* Health summary across family */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Family Health Overview</Text>
                    <LinearGradient colors={['#0F766E', '#0891B2']} style={styles.overviewCard}>
                        <View style={styles.overviewRow}>
                            {[
                                { value: members.reduce((a, m) => a + (m.meds?.length || 0), 0), label: 'Total Medicines' },
                                { value: members.reduce((a, m) => a + (m.prescriptions || 0), 0), label: 'Rx Scanned' },
                                { value: members.reduce((a, m) => a + (m.meds?.filter(d => d.daysLeft <= 7).length || 0), 0), label: 'Need Refill' },
                            ].map((s, i) => (
                                <View key={i} style={styles.overviewStat}>
                                    <Text style={styles.overviewVal}>{s.value}</Text>
                                    <Text style={styles.overviewLabel}>{s.label}</Text>
                                </View>
                            ))}
                        </View>
                        <Text style={styles.overviewNote}>
                            💡 Set up daily reminders for each profile in Notification Settings
                        </Text>
                    </LinearGradient>
                </View>
            </ScrollView>

            {/* Add Member Modal */}
            <Modal visible={addModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add Family Member</Text>
                            <TouchableOpacity onPress={() => setAddModal(false)}>
                                <Feather name="x" size={20} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.inputLabel}>Name *</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={form.name}
                            onChangeText={t => setForm(f => ({ ...f, name: t }))}
                            placeholder="e.g. Riya, Dad, Arya"
                            placeholderTextColor={COLORS.textMuted}
                        />

                        <Text style={[styles.inputLabel, { marginTop: 14 }]}>Relation</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                {RELATION_OPTIONS.map(r => (
                                    <TouchableOpacity
                                        key={r}
                                        style={[styles.relationChip, form.relation === r && styles.relationChipActive]}
                                        onPress={() => setForm(f => ({ ...f, relation: r }))}
                                    >
                                        <Text style={[styles.relationChipText, form.relation === r && styles.relationChipTextActive]}>{r}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>

                        <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.inputLabel}>Age</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    value={form.age}
                                    onChangeText={t => setForm(f => ({ ...f, age: t }))}
                                    placeholder="e.g. 64"
                                    placeholderTextColor={COLORS.textMuted}
                                    keyboardType="number-pad"
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.inputLabel}>Blood Group</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    value={form.bloodGroup}
                                    onChangeText={t => setForm(f => ({ ...f, bloodGroup: t }))}
                                    placeholder="e.g. O+"
                                    placeholderTextColor={COLORS.textMuted}
                                    autoCapitalize="characters"
                                />
                            </View>
                        </View>

                        <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={addMember} disabled={saving}>
                            <LinearGradient colors={GRADIENTS.teal} style={styles.saveBtnGrad}>
                                <Feather name="user-plus" size={17} color="#fff" />
                                <Text style={styles.saveBtnText}>{saving ? 'Adding...' : 'Add Profile'}</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
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
    addBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 14, paddingVertical: 8,
        borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    },
    addBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
    avatarRow: { paddingHorizontal: 20, gap: 16, paddingBottom: 4 },
    avatarWrap: { alignItems: 'center', gap: 6 },
    avatarSmall: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
    avatarSmallActive: { borderWidth: 3, borderColor: '#fff' },
    avatarSmallText: { fontSize: 20, fontWeight: '900', color: '#fff' },
    avatarActiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#5EEAD4', marginTop: -4 },
    avatarSmallName: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
    avatarAdd: {
        width: 52, height: 52, borderRadius: 26,
        backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center',
        borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)', borderStyle: 'dashed',
    },

    section: { paddingHorizontal: 20, marginTop: 24 },
    sectionTitle: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 12 },
    quickActions: { flexDirection: 'row', gap: 10 },
    qaCard: { flex: 1, alignItems: 'center', gap: 8 },
    qaIcon: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', ...SHADOWS.colored },
    qaLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },

    memberCard: {
        backgroundColor: COLORS.white, borderRadius: 20, marginHorizontal: 20, marginBottom: 12,
        padding: 16, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
        overflow: 'hidden', position: 'relative',
    },
    memberCardActive: { borderColor: COLORS.primary + '50', backgroundColor: COLORS.successBg + '60' },
    activeBar: {
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
        backgroundColor: COLORS.primary, borderTopLeftRadius: 20, borderBottomLeftRadius: 20,
    },
    memberCardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    avatar: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontSize: 22, fontWeight: '900', color: '#fff' },
    memberName: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
    memberRelation: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
    memberAge: { fontSize: 13, color: COLORS.textMuted },
    activeBadge: {
        backgroundColor: COLORS.successBg, paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: 6, borderWidth: 1, borderColor: COLORS.successBorder,
    },
    activeBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.primary },
    deleteBtn: {
        width: 34, height: 34, borderRadius: 10,
        backgroundColor: COLORS.dangerBg, justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: COLORS.dangerBorder,
    },
    memberStats: { flexDirection: 'row', backgroundColor: COLORS.background, borderRadius: 12, padding: 10, gap: 0 },
    statItem: { flex: 1, alignItems: 'center', gap: 3 },
    statVal: { fontSize: 18, fontWeight: '900' },
    statLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', textAlign: 'center' },
    upcomingRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 10 },
    upcomingLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
    upcomingChip: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: COLORS.successBg, paddingHorizontal: 8, paddingVertical: 4,
        borderRadius: 8, borderWidth: 1, borderColor: COLORS.border,
    },
    upcomingText: { fontSize: 11, fontWeight: '600', color: COLORS.primary },
    upcomingMore: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },

    overviewCard: { borderRadius: 20, padding: 20, ...SHADOWS.colored },
    overviewRow: { flexDirection: 'row', marginBottom: 16 },
    overviewStat: { flex: 1, alignItems: 'center' },
    overviewVal: { fontSize: 28, fontWeight: '900', color: '#fff' },
    overviewLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: '600', marginTop: 3, textAlign: 'center' },
    overviewNote: { fontSize: 13, color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: 19 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalCard: {
        backgroundColor: COLORS.background, borderTopLeftRadius: 28, borderTopRightRadius: 28,
        padding: 24, paddingBottom: 40,
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: '900', color: COLORS.textPrimary },
    inputLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
    modalInput: {
        backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.border,
        borderRadius: 14, paddingHorizontal: 14, height: 50, fontSize: 15,
        color: COLORS.textPrimary, ...SHADOWS.sm,
    },
    relationChip: {
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
        borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.white,
    },
    relationChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    relationChipText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
    relationChipTextActive: { color: '#fff' },
    saveBtn: { marginTop: 24, borderRadius: 14, overflow: 'hidden', ...SHADOWS.colored },
    saveBtnGrad: { height: 54, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
    saveBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});
