import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    SafeAreaView, StatusBar, Modal, TextInput, Alert,
    RefreshControl, Animated, ActivityIndicator, Pressable,
    KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, SHADOWS } from '../theme';
import { MaterialCommunityIcons, Feather, Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const RELATION_OPTIONS = ['Spouse', 'Child', 'Parent', 'Sibling', 'Grandparent', 'Other'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const AVATAR_COLORS = [
    GRADIENTS.teal,
    GRADIENTS.purple,
    ['#F43F5E', '#E11D48'],
    GRADIENTS.gold,
    ['#0EA5E9', '#0369A1'],
];

const RELATION_ICONS = {
    Spouse: 'heart-outline',
    Child: 'baby-face-outline',
    Parent: 'account-outline',
    Sibling: 'account-multiple-outline',
    Grandparent: 'human-cane',
    Other: 'account-question-outline',
};

const HEALTH_CONFIG = {
    Excellent: { color: '#10B981', bg: '#ECFDF5', icon: 'shield-check-outline' },
    Good: { color: '#3B82F6', bg: '#EFF6FF', icon: 'shield-outline' },
    'Needs Attention': { color: '#F59E0B', bg: '#FFFBEB', icon: 'shield-alert-outline' },
    Critical: { color: '#EF4444', bg: '#FEF2F2', icon: 'shield-off-outline' },
};

// ─────────────────────────────────────────────
// Skeleton loader
// ─────────────────────────────────────────────
const SkeletonBlock = ({ width, height, style }) => {
    const anim = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
                Animated.timing(anim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    return (
        <Animated.View
            style={[
                { width, height, borderRadius: 8, backgroundColor: '#E2E8F0', opacity: anim },
                style,
            ]}
        />
    );
};

const MemberCardSkeleton = () => (
    <View style={[styles.memberCard, { gap: 12 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <SkeletonBlock width={52} height={52} style={{ borderRadius: 26 }} />
            <View style={{ flex: 1, gap: 8 }}>
                <SkeletonBlock width="60%" height={16} />
                <SkeletonBlock width="40%" height={12} />
            </View>
        </View>
        <SkeletonBlock width="100%" height={52} style={{ borderRadius: 12 }} />
    </View>
);

// ─────────────────────────────────────────────
// Relation chip
// ─────────────────────────────────────────────
const RelationIcon = ({ relation, size = 16, color = 'rgba(255,255,255,0.8)' }) => (
    <MaterialCommunityIcons
        name={RELATION_ICONS[relation] || 'account-outline'}
        size={size}
        color={color}
    />
);

// ─────────────────────────────────────────────
// Health score ring (SVG-free, pure View approach)
// ─────────────────────────────────────────────
const HealthRing = ({ score, label }) => {
    const cfg = HEALTH_CONFIG[label] || HEALTH_CONFIG['Good'];
    return (
        <View style={[styles.healthRing, { borderColor: cfg.color, backgroundColor: cfg.bg }]}>
            <MaterialCommunityIcons name={cfg.icon} size={14} color={cfg.color} />
            <Text style={[styles.healthScore, { color: cfg.color }]}>{score}</Text>
            <Text style={[styles.healthLabel, { color: cfg.color }]}>{label}</Text>
        </View>
    );
};

// ─────────────────────────────────────────────
// Days-left pill
// ─────────────────────────────────────────────
const DaysLeftPill = ({ days }) => {
    if (days == null) return null;
    const urgent = days <= 7;
    return (
        <View style={[styles.daysLeftPill, urgent && styles.daysLeftPillUrgent]}>
            <MaterialCommunityIcons
                name={urgent ? 'alert' : 'clock-outline'}
                size={10}
                color={urgent ? '#EF4444' : COLORS.textMuted}
            />
            <Text style={[styles.daysLeftText, urgent && { color: '#EF4444' }]}>
                {days === 0 ? 'Out' : `${days}d left`}
            </Text>
        </View>
    );
};

// ─────────────────────────────────────────────
// Member card
// ─────────────────────────────────────────────
const MemberCard = ({ member, index, onSelect, onDelete, onEdit, isActive }) => {
    const grad = AVATAR_COLORS[index % AVATAR_COLORS.length];
    const urgentCount = member.urgent_meds_count || 0;
    const [expanded, setExpanded] = useState(false);
    const expandAnim = useRef(new Animated.Value(0)).current;

    const toggleExpand = () => {
        const toValue = expanded ? 0 : 1;
        Animated.spring(expandAnim, { toValue, useNativeDriver: false, tension: 80, friction: 12 }).start();
        setExpanded(!expanded);
    };

    const expandHeight = expandAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, Math.min((member.meds?.length || 0) * 56 + 16, 240)],
    });

    return (
        <View style={[styles.memberCard, isActive && styles.memberCardActive]}>
            {isActive && <View style={styles.activeBar} />}

            {/* Top row */}
            <TouchableOpacity
                style={styles.memberCardTop}
                onPress={() => onSelect(member)}
                activeOpacity={0.8}
            >
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
                        <RelationIcon relation={member.relation} size={14} color={COLORS.textMuted} />
                        <Text style={styles.memberRelation}>{member.relation}</Text>
                        {member.age && <Text style={styles.memberMeta}>· {member.age}y</Text>}
                        {member.blood_group && <Text style={styles.memberMeta}>· {member.blood_group}</Text>}
                    </View>
                </View>

                <HealthRing score={member.health_score} label={member.health_label} />
            </TouchableOpacity>

            {/* Stats row */}
            <View style={styles.memberStats}>
                {[
                    {
                        icon: 'pill',
                        value: member.meds_count || 0,
                        label: 'Medicines',
                        color: COLORS.primary,
                    },
                    {
                        icon: 'alert-circle-outline',
                        value: urgentCount,
                        label: 'Refill Now',
                        color: urgentCount > 0 ? '#EF4444' : COLORS.textMuted,
                    },
                    {
                        icon: 'file-document-outline',
                        value: member.prescriptions_count || 0,
                        label: 'Rx Scans',
                        color: COLORS.accent,
                    },
                ].map((s, i) => (
                    <View key={i} style={styles.statItem}>
                        <MaterialCommunityIcons name={s.icon} size={14} color={s.color} />
                        <Text style={[styles.statVal, { color: s.color }]}>{s.value}</Text>
                        <Text style={styles.statLabel}>{s.label}</Text>
                    </View>
                ))}
            </View>

            {/* Medicine list (expandable) */}
            {member.meds && member.meds.length > 0 && (
                <>
                    <TouchableOpacity style={styles.expandToggle} onPress={toggleExpand} activeOpacity={0.7}>
                        <View style={styles.upcomingLabel}>
                            <MaterialCommunityIcons name="pill" size={13} color={COLORS.primary} />
                            <Text style={styles.upcomingLabelText}>
                                {member.meds.length} Medicine{member.meds.length !== 1 ? 's' : ''}
                            </Text>
                        </View>
                        <MaterialCommunityIcons
                            name={expanded ? 'chevron-up' : 'chevron-down'}
                            size={16}
                            color={COLORS.textMuted}
                        />
                    </TouchableOpacity>

                    <Animated.View style={{ height: expandHeight, overflow: 'hidden' }}>
                        {member.meds.map((m, i) => {
                            const pct = Math.min(1, m.remaining / (m.total || 1));
                            const urgent = m.needs_refill;
                            return (
                                <View key={i} style={styles.medRow}>
                                    <View
                                        style={[
                                            styles.medDot,
                                            { backgroundColor: urgent ? '#FEE2E2' : '#ECFDF5' },
                                        ]}
                                    >
                                        <MaterialCommunityIcons
                                            name="pill"
                                            size={12}
                                            color={urgent ? '#EF4444' : '#10B981'}
                                        />
                                    </View>
                                    <View style={{ flex: 1, gap: 4 }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                            <Text style={styles.medName}>{m.name}</Text>
                                            <DaysLeftPill days={m.days_left_estimate} />
                                        </View>
                                        <View style={styles.medBarBg}>
                                            <View
                                                style={[
                                                    styles.medBarFill,
                                                    {
                                                        width: `${Math.round(pct * 100)}%`,
                                                        backgroundColor: urgent ? '#EF4444' : '#10B981',
                                                    },
                                                ]}
                                            />
                                        </View>
                                        <Text style={styles.medQty}>
                                            {m.remaining} / {m.total} remaining
                                        </Text>
                                    </View>
                                </View>
                            );
                        })}
                    </Animated.View>
                </>
            )}

            {/* Action buttons */}
            <View style={styles.cardActions}>
                <TouchableOpacity style={styles.cardActionBtn} onPress={() => onEdit(member)}>
                    <Feather name="edit-2" size={13} color={COLORS.primary} />
                    <Text style={[styles.cardActionText, { color: COLORS.primary }]}>Edit</Text>
                </TouchableOpacity>

                <View style={styles.cardActionDivider} />

                <TouchableOpacity
                    style={styles.cardActionBtn}
                    onPress={() =>
                        Alert.alert(
                            'Remove Profile',
                            `Remove ${member.name}?\n\nTheir medications and prescriptions will be kept in your history.`,
                            [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                    text: 'Remove',
                                    style: 'destructive',
                                    onPress: () => onDelete(member.id),
                                },
                            ]
                        )
                    }
                >
                    <Feather name="trash-2" size={13} color={COLORS.dangerText} />
                    <Text style={[styles.cardActionText, { color: COLORS.dangerText }]}>Remove</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

// ─────────────────────────────────────────────
// Add / Edit modal (shared)
// ─────────────────────────────────────────────
const MemberFormModal = ({ visible, onClose, onSave, initialData, saving }) => {
    const isEdit = !!initialData;
    const [form, setForm] = useState(
        initialData || { name: '', relation: 'Spouse', age: '', bloodGroup: '' }
    );

    useEffect(() => {
        setForm(initialData || { name: '', relation: 'Spouse', age: '', bloodGroup: '' });
    }, [initialData, visible]);

    const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        {/* Handle bar */}
                        <View style={styles.modalHandle} />

                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {isEdit ? `Edit ${initialData.name}` : 'Add Family Member'}
                            </Text>
                            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
                                <Feather name="x" size={18} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {/* Name */}
                        <Text style={styles.inputLabel}>Full Name *</Text>
                        <View style={styles.inputWrap}>
                            <Feather name="user" size={16} color={COLORS.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.modalInput}
                                value={form.name}
                                onChangeText={t => set('name', t)}
                                placeholder="e.g. Riya, Dad, Arya"
                                placeholderTextColor={COLORS.textMuted}
                                autoFocus={!isEdit}
                            />
                        </View>

                        {/* Relation */}
                        <Text style={[styles.inputLabel, { marginTop: 16 }]}>Relation</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={{ marginBottom: 4 }}
                        >
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                {RELATION_OPTIONS.map(r => (
                                    <TouchableOpacity
                                        key={r}
                                        style={[
                                            styles.relationChip,
                                            form.relation === r && styles.relationChipActive,
                                        ]}
                                        onPress={() => set('relation', r)}
                                    >
                                        <MaterialCommunityIcons
                                            name={RELATION_ICONS[r]}
                                            size={13}
                                            color={form.relation === r ? '#fff' : COLORS.textSecondary}
                                        />
                                        <Text
                                            style={[
                                                styles.relationChipText,
                                                form.relation === r && styles.relationChipTextActive,
                                            ]}
                                        >
                                            {r}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>

                        {/* Age + Blood Group */}
                        <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.inputLabel}>Age</Text>
                                <View style={styles.inputWrap}>
                                    <Feather
                                        name="calendar"
                                        size={15}
                                        color={COLORS.textMuted}
                                        style={styles.inputIcon}
                                    />
                                    <TextInput
                                        style={styles.modalInput}
                                        value={form.age}
                                        onChangeText={t => set('age', t)}
                                        placeholder="e.g. 64"
                                        placeholderTextColor={COLORS.textMuted}
                                        keyboardType="number-pad"
                                    />
                                </View>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.inputLabel}>Blood Group</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    <View style={{ flexDirection: 'row', gap: 6, paddingTop: 4 }}>
                                        {BLOOD_GROUPS.map(bg => (
                                            <TouchableOpacity
                                                key={bg}
                                                style={[
                                                    styles.bloodChip,
                                                    form.bloodGroup === bg && styles.bloodChipActive,
                                                ]}
                                                onPress={() =>
                                                    set('bloodGroup', form.bloodGroup === bg ? '' : bg)
                                                }
                                            >
                                                <Text
                                                    style={[
                                                        styles.bloodChipText,
                                                        form.bloodGroup === bg && { color: '#fff' },
                                                    ]}
                                                >
                                                    {bg}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </ScrollView>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                            onPress={() => onSave(form)}
                            disabled={saving}
                        >
                            <LinearGradient colors={GRADIENTS.teal} style={styles.saveBtnGrad}>
                                {saving ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Feather name={isEdit ? 'check' : 'user-plus'} size={17} color="#fff" />
                                )}
                                <Text style={styles.saveBtnText}>
                                    {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Profile'}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

// ─────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────
export default function FamilyProfilesScreen({ user, navigate }) {
    const [members, setMembers] = useState([]);
    const [familyStats, setFamilyStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeId, setActiveId] = useState(null);
    const [search, setSearch] = useState('');
    const [showSearch, setShowSearch] = useState(false);

    // Modal state
    const [modalMode, setModalMode] = useState(null); // 'add' | 'edit'
    const [editTarget, setEditTarget] = useState(null);
    const [saving, setSaving] = useState(false);

    // Animate header
    const headerAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(headerAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    }, []);

    useEffect(() => {
        fetchAll();
    }, []);

    // ── Fetch ──────────────────────────────────
    const fetchFamily = useCallback(async (searchTerm = '') => {
        if (!user?.id) return [];
        const url = `${API_URL}api/family/${user.id}${searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ''}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Family fetch: ${res.status}`);
        return res.json();
    }, [user?.id]);

    const fetchStats = useCallback(async () => {
        if (!user?.id) return null;
        const res = await fetch(`${API_URL}api/family/${user.id}/stats`);
        if (!res.ok) return null;
        return res.json();
    }, [user?.id]);

    const fetchAll = async (searchTerm = '') => {
        try {
            const [membersData, statsData] = await Promise.all([
                fetchFamily(searchTerm),
                fetchStats(),
            ]);
            setMembers(membersData);
            setFamilyStats(statsData);
            if (membersData.length > 0 && !activeId) {
                setActiveId(membersData[0].id);
            }
        } catch (e) {
            console.error('fetchAll error', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchAll(search);
    };

    const onSearchChange = (text) => {
        setSearch(text);
        fetchAll(text);
    };

    // ── Add ────────────────────────────────────
    const addMember = async (form) => {
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
            if (res.status === 409) {
                Alert.alert('Duplicate', data.detail || 'This member already exists.');
                return;
            }
            if (res.ok && data.status === 'success') {
                setModalMode(null);
                await fetchAll();
                setActiveId(data.id);
            } else if (res.status === 422) {
                const errData = await res.json().catch(() => ({}));
                console.error('Add member validation error:', errData);
                const detail = errData.detail;
                const msg = Array.isArray(detail) 
                    ? detail.map(d => `${d.loc[d.loc.length-1]}: ${d.msg}`).join('\n') 
                    : (detail || 'Input validation failed');
                Alert.alert('Validation Error', msg);
            } else {
                Alert.alert('Error', data.detail || 'Could not add family member.');
            }
        } catch (e) {
            Alert.alert('Error', 'Could not add family member. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    // ── Edit ───────────────────────────────────
    const startEdit = (member) => {
        setEditTarget({
            id: member.id,
            name: member.name,
            relation: member.relation,
            age: member.age || '',
            bloodGroup: member.blood_group || '',
        });
        setModalMode('edit');
    };

    const saveMember = async (form) => {
        if (!form.name.trim()) { Alert.alert('Name required'); return; }
        setSaving(true);
        try {
            const res = await fetch(`${API_URL}api/family/${editTarget.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: form.name.trim(),
                    relation: form.relation,
                    age: form.age || null,
                    blood_group: form.bloodGroup || null,
                }),
            });
            if (res.ok) {
                setModalMode(null);
                setEditTarget(null);
                fetchAll(search);
            } else if (res.status === 422) {
                const errData = await res.json().catch(() => ({}));
                console.error('Update member validation error:', errData);
                const detail = errData.detail;
                const msg = Array.isArray(detail)
                    ? detail.map(d => `${d.loc[d.loc.length-1]}: ${d.msg}`).join('\n')
                    : (detail || 'Input validation failed');
                Alert.alert('Validation Error', msg);
            } else {
                const err = await res.json().catch(() => ({}));
                Alert.alert('Error', err.detail || 'Could not save changes.');
            }
        } catch (e) {
            Alert.alert('Error', 'Could not save changes. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    // ── Delete ─────────────────────────────────
    const deleteMember = async (id) => {
        // Optimistic update
        setMembers(prev => prev.filter(m => m.id !== id));
        if (activeId === id) {
            setActiveId(members.find(m => m.id !== id)?.id || null);
        }
        try {
            const res = await fetch(`${API_URL}api/family/${id}?unlink_records=true`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Delete failed');
        } catch (e) {
            // Revert on failure
            fetchAll(search);
        }
    };

    const activeMember = members.find(m => m.id === activeId);
    const statsData = familyStats;

    // ─────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────
    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.midnight} />

            {/* Header */}
            <Animated.View style={{ opacity: headerAnim }}>
                <LinearGradient colors={GRADIENTS.hero} style={styles.header}>
                    <View style={styles.bgDeco} />
                    <View style={styles.bgDeco2} />

                    <View style={styles.headerTop}>
                        <TouchableOpacity
                            onPress={() => navigate('DASHBOARD')}
                            style={styles.backBtn}
                        >
                            <Feather name="arrow-left" size={20} color="rgba(255,255,255,0.8)" />
                        </TouchableOpacity>

                        <View style={{ flex: 1, paddingLeft: 14 }}>
                            <Text style={styles.headerTitle}>Family Profiles</Text>
                            <Text style={styles.headerSub}>
                                {members.length} profile{members.length !== 1 ? 's' : ''}
                                {statsData
                                    ? ` · ${statsData.overall_health_score}% health`
                                    : ''}
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={styles.iconBtn}
                            onPress={() => {
                                setShowSearch(s => !s);
                                if (showSearch) { setSearch(''); fetchAll(); }
                            }}
                        >
                            <Feather
                                name={showSearch ? 'x' : 'search'}
                                size={17}
                                color="rgba(255,255,255,0.85)"
                            />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.addBtn}
                            onPress={() => setModalMode('add')}
                        >
                            <Feather name="user-plus" size={15} color="#fff" />
                            <Text style={styles.addBtnText}>Add</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Search bar */}
                    {showSearch && (
                        <View style={styles.searchBar}>
                            <Feather name="search" size={15} color="rgba(255,255,255,0.5)" />
                            <TextInput
                                style={styles.searchInput}
                                value={search}
                                onChangeText={onSearchChange}
                                placeholder="Search family members…"
                                placeholderTextColor="rgba(255,255,255,0.4)"
                                autoFocus
                            />
                        </View>
                    )}

                    {/* Avatar row */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.avatarRow}
                    >
                        {members.map((m, i) => (
                            <TouchableOpacity
                                key={m.id}
                                onPress={() => setActiveId(m.id)}
                                style={styles.avatarWrap}
                            >
                                <LinearGradient
                                    colors={AVATAR_COLORS[i % AVATAR_COLORS.length]}
                                    style={[
                                        styles.avatarSmall,
                                        activeId === m.id && styles.avatarSmallActive,
                                    ]}
                                >
                                    <Text style={styles.avatarSmallText}>
                                        {m.name[0].toUpperCase()}
                                    </Text>
                                    {m.urgent_meds_count > 0 && (
                                        <View style={styles.urgentDot} />
                                    )}
                                </LinearGradient>
                                {activeId === m.id && <View style={styles.avatarActiveDot} />}
                                <Text style={styles.avatarSmallName} numberOfLines={1}>
                                    {m.name.split(' ')[0]}
                                </Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                            style={styles.avatarWrap}
                            onPress={() => setModalMode('add')}
                        >
                            <View style={styles.avatarAdd}>
                                <Feather name="plus" size={20} color={COLORS.primary} />
                            </View>
                            <Text style={styles.avatarSmallName}>Add</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </LinearGradient>
            </Animated.View>

            {/* Body */}
            <ScrollView
                contentContainerStyle={{ paddingBottom: 48 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={COLORS.primary}
                    />
                }
            >
                {/* Active member quick actions */}
                {activeMember && !loading && (
                    <View style={styles.section}>
                        <View style={styles.sectionRow}>
                            <Text style={styles.sectionTitle}>{activeMember.name}'s Dashboard</Text>
                            <TouchableOpacity onPress={() => startEdit(activeMember)}>
                                <Feather name="edit-2" size={14} color={COLORS.primary} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={styles.quickActions}>
                                {[
                                    {
                                        icon: 'scan-helper',
                                        label: 'Scan Rx',
                                        screen: 'SCANNER',
                                        color: GRADIENTS.teal,
                                    },
                                    {
                                        icon: 'pill',
                                        label: 'Medicines',
                                        screen: 'DOSE_TRACKER',
                                        color: GRADIENTS.purple,
                                    },
                                    {
                                        icon: 'file-document-outline',
                                        label: 'History',
                                        screen: 'HISTORY',
                                        color: ['#F43F5E', '#E11D48'],
                                    },
                                    {
                                        icon: 'refresh-circle-outline',
                                        label: 'Refills',
                                        screen: 'REFILL_REMINDER',
                                        color: ['#D97706', '#F59E0B'],
                                    },
                                    {
                                        icon: 'robot-outline',
                                        label: 'Ask AI',
                                        screen: 'ASK_AI',
                                        color: GRADIENTS.gold,
                                    },
                                ].map((a, i) => (
                                    <TouchableOpacity
                                        key={i}
                                        style={styles.qaCard}
                                        onPress={() =>
                                            navigate(a.screen, {
                                                memberId: activeMember.id,
                                                memberName: activeMember.name,
                                            })
                                        }
                                        activeOpacity={0.8}
                                    >
                                        <LinearGradient colors={a.color} style={styles.qaIcon}>
                                            <MaterialCommunityIcons name={a.icon} size={22} color="#fff" />
                                        </LinearGradient>
                                        <Text style={styles.qaLabel}>{a.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>
                    </View>
                )}

            {/* Member cards */}
            <View style={[styles.sectionRow, { paddingHorizontal: 20, marginTop: 8, marginBottom: 4 }]}>
                <Text style={styles.sectionTitle}>All Profiles</Text>
                <Text style={styles.countBadge}>{members.length}</Text>
            </View>

            {loading ? (
                <>
                    <MemberCardSkeleton />
                    <MemberCardSkeleton />
                </>
            ) : members.length === 0 ? (
                <View style={styles.emptyState}>
                    <LinearGradient colors={GRADIENTS.teal} style={styles.emptyIcon}>
                        <MaterialCommunityIcons name="account-group-outline" size={40} color="#fff" />
                    </LinearGradient>
                    <Text style={styles.emptyTitle}>
                        {search ? 'No results found' : 'No family members yet'}
                    </Text>
                    <Text style={styles.emptySubtitle}>
                        {search
                            ? `No one matches "${search}"`
                            : 'Add your family members to track their medications and prescriptions together.'}
                    </Text>
                    {!search && (
                        <TouchableOpacity
                            style={styles.emptyBtn}
                            onPress={() => setModalMode('add')}
                        >
                            <LinearGradient colors={GRADIENTS.teal} style={styles.emptyBtnGrad}>
                                <Feather name="user-plus" size={16} color="#fff" />
                                <Text style={styles.emptyBtnText}>Add First Member</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    )}
                </View>
            ) : (
                members.map((m, i) => (
                    <MemberCard
                        key={m.id}
                        member={m}
                        index={i}
                        isActive={m.id === activeId}
                        onSelect={member => setActiveId(member.id)}
                        onDelete={deleteMember}
                        onEdit={startEdit}
                    />
                ))
            )}

            {/* Family-wide overview */}
            {!loading && statsData && members.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Family Health Overview</Text>
                    <LinearGradient colors={['#0F766E', '#0891B2']} style={styles.overviewCard}>
                        <View style={styles.overviewRow}>
                            {[
                                { value: statsData.total_meds, label: 'Total Medicines' },
                                { value: statsData.total_prescriptions, label: 'Rx Scanned' },
                                { value: statsData.meds_needing_refill, label: 'Need Refill' },
                            ].map((s, i) => (
                                <View key={i} style={styles.overviewStat}>
                                    <Text style={styles.overviewVal}>{s.value}</Text>
                                    <Text style={styles.overviewLabel}>{s.label}</Text>
                                </View>
                            ))}
                        </View>

                        {/* Overall health bar */}
                        <View style={styles.overviewBarWrap}>
                            <View style={styles.overviewBarBg}>
                                <View
                                    style={[
                                        styles.overviewBarFill,
                                        { width: `${statsData.overall_health_score}%` },
                                    ]}
                                />
                            </View>
                            <Text style={styles.overviewBarLabel}>
                                Family health score: {statsData.overall_health_score}%
                            </Text>
                        </View>

                        <Text style={styles.overviewNote}>
                            💡 Set up daily reminders for each profile in Notification Settings
                        </Text>
                    </LinearGradient>
                </View>
            )}
        </ScrollView>

            {/* Add modal  */ }
    <MemberFormModal
        visible={modalMode === 'add'}
        onClose={() => setModalMode(null)}
        onSave={addMember}
        initialData={null}
        saving={saving}
    />

    {/* Edit modal */ }
    <MemberFormModal
        visible={modalMode === 'edit'}
        onClose={() => { setModalMode(null); setEditTarget(null); }}
        onSave={saveMember}
        initialData={editTarget}
        saving={saving}
    />
        </SafeAreaView>
    );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },

    // Header
    header: { paddingBottom: 20, overflow: 'hidden', position: 'relative' },
    bgDeco: {
        position: 'absolute', width: 200, height: 200, borderRadius: 100,
        backgroundColor: 'rgba(13,148,136,0.12)', top: -60, right: -60,
    },
    bgDeco2: {
        position: 'absolute', width: 120, height: 120, borderRadius: 60,
        backgroundColor: 'rgba(13,148,136,0.08)', bottom: -30, left: 40,
    },
    headerTop: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14, gap: 8,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    },
    iconBtn: {
        width: 38, height: 38, borderRadius: 19,
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

    // Search bar
    searchBar: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        marginHorizontal: 20, marginBottom: 10,
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderRadius: 12, paddingHorizontal: 14, height: 42,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    },
    searchInput: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '500' },

    // Avatars
    avatarRow: { paddingHorizontal: 20, gap: 16, paddingBottom: 4 },
    avatarWrap: { alignItems: 'center', gap: 6, maxWidth: 56 },
    avatarSmall: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
    avatarSmallActive: { borderWidth: 2.5, borderColor: '#fff' },
    avatarSmallText: { fontSize: 20, fontWeight: '900', color: '#fff' },
    avatarActiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#5EEAD4', marginTop: -4 },
    avatarSmallName: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
    avatarAdd: {
        width: 52, height: 52, borderRadius: 26,
        backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center',
        borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)', borderStyle: 'dashed',
    },
    urgentDot: {
        position: 'absolute', top: 2, right: 2,
        width: 10, height: 10, borderRadius: 5,
        backgroundColor: '#EF4444', borderWidth: 1.5, borderColor: '#fff',
    },

    // Sections
    section: { paddingHorizontal: 20, marginTop: 24 },
    sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    sectionTitle: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
    countBadge: {
        backgroundColor: COLORS.primary + '20', color: COLORS.primary,
        fontSize: 12, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: 8,
    },

    // Quick actions
    quickActions: { flexDirection: 'row', gap: 10 },
    qaCard: { flex: 1, alignItems: 'center', gap: 8 },
    qaIcon: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', ...SHADOWS.colored },
    qaLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },

    // Member card
    memberCard: {
        backgroundColor: COLORS.white, borderRadius: 20, marginHorizontal: 20, marginBottom: 12,
        padding: 16, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
        overflow: 'hidden', position: 'relative',
    },
    memberCardActive: { borderColor: COLORS.primary + '50', backgroundColor: COLORS.successBg + '40' },
    activeBar: {
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
        backgroundColor: COLORS.primary, borderTopLeftRadius: 20, borderBottomLeftRadius: 20,
    },
    memberCardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    avatar: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontSize: 22, fontWeight: '900', color: '#fff' },
    memberName: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
    memberRelation: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
    memberMeta: { fontSize: 12, color: COLORS.textMuted },
    activeBadge: {
        backgroundColor: COLORS.successBg, paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: 6, borderWidth: 1, borderColor: COLORS.successBorder,
    },
    activeBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.primary },

    // Health ring
    healthRing: {
        alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: 10, paddingVertical: 6,
        borderRadius: 12, borderWidth: 1.5, gap: 2, minWidth: 68,
    },
    healthScore: { fontSize: 18, fontWeight: '900', lineHeight: 22 },
    healthLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },

    // Stats
    memberStats: {
        flexDirection: 'row', backgroundColor: COLORS.background,
        borderRadius: 12, padding: 10, marginBottom: 10,
    },
    statItem: { flex: 1, alignItems: 'center', gap: 3 },
    statVal: { fontSize: 18, fontWeight: '900' },
    statLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', textAlign: 'center' },

    // Expandable medicines
    expandToggle: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 8, borderTopWidth: 1, borderTopColor: COLORS.border,
    },
    upcomingLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    upcomingLabelText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },

    // Med row
    medRow: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 10,
        paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    medDot: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    medName: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
    medBarBg: { height: 4, borderRadius: 2, backgroundColor: COLORS.border, overflow: 'hidden' },
    medBarFill: { height: 4, borderRadius: 2 },
    medQty: { fontSize: 10, color: COLORS.textMuted, fontWeight: '500' },

    // Days-left pill
    daysLeftPill: {
        flexDirection: 'row', alignItems: 'center', gap: 3,
        backgroundColor: COLORS.background, paddingHorizontal: 6, paddingVertical: 2,
        borderRadius: 6, borderWidth: 1, borderColor: COLORS.border,
    },
    daysLeftPillUrgent: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
    daysLeftText: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted },

    // Card action buttons
    cardActions: {
        flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.border,
        marginTop: 10, paddingTop: 10,
    },
    cardActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 4 },
    cardActionText: { fontSize: 12, fontWeight: '700' },
    cardActionDivider: { width: 1, backgroundColor: COLORS.border, marginVertical: 2 },

    // Empty state
    emptyState: { alignItems: 'center', paddingHorizontal: 40, paddingVertical: 48 },
    emptyIcon: { width: 80, height: 80, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 20, ...SHADOWS.colored },
    emptyTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 8, textAlign: 'center' },
    emptySubtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },
    emptyBtn: { marginTop: 24, borderRadius: 14, overflow: 'hidden', ...SHADOWS.colored },
    emptyBtnGrad: { height: 50, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24 },
    emptyBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },

    // Overview card
    overviewCard: { borderRadius: 20, padding: 20, ...SHADOWS.colored },
    overviewRow: { flexDirection: 'row', marginBottom: 16 },
    overviewStat: { flex: 1, alignItems: 'center' },
    overviewVal: { fontSize: 28, fontWeight: '900', color: '#fff' },
    overviewLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: '600', marginTop: 3, textAlign: 'center' },
    overviewBarWrap: { marginBottom: 14, gap: 6 },
    overviewBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden' },
    overviewBarFill: { height: 6, backgroundColor: '#5EEAD4', borderRadius: 3 },
    overviewBarLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
    overviewNote: { fontSize: 13, color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: 19 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalCard: {
        backgroundColor: COLORS.background, borderTopLeftRadius: 28, borderTopRightRadius: 28,
        padding: 24, paddingBottom: 40,
    },
    modalHandle: {
        width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border,
        alignSelf: 'center', marginBottom: 20,
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: '900', color: COLORS.textPrimary },
    modalCloseBtn: {
        width: 34, height: 34, borderRadius: 10, backgroundColor: COLORS.border,
        justifyContent: 'center', alignItems: 'center',
    },
    inputLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
    inputWrap: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.border,
        borderRadius: 14, paddingHorizontal: 14, height: 50, ...SHADOWS.sm,
    },
    inputIcon: { marginRight: 10 },
    modalInput: { flex: 1, fontSize: 15, color: COLORS.textPrimary },
    relationChip: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 12, paddingVertical: 8,
        borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.white,
    },
    relationChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    relationChipText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
    relationChipTextActive: { color: '#fff' },
    bloodChip: {
        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
        borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.white,
    },
    bloodChipActive: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
    bloodChipText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
    saveBtn: { marginTop: 24, borderRadius: 14, overflow: 'hidden', ...SHADOWS.colored },
    saveBtnGrad: { height: 54, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
    saveBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});
