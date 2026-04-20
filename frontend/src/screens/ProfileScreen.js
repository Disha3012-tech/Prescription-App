import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, ActivityIndicator, 
    ScrollView, Platform, Modal, Animated, Dimensions, StatusBar
} from 'react-native';
import { COLORS, GRADIENTS, SHADOWS, RADIUS, FONT } from '../theme';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { API_URL } from '../config';

const { width, height } = Dimensions.get('window');

export default function ProfileScreen({ user, setUser, navigate }) {
    const [name, setName] = useState(user?.full_name || user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [phone, setPhone] = useState(user?.phone || '');

    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [focusedField, setFocusedField] = useState(null);

    // Custom Banner/Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [modalConfig, setModalConfig] = useState({ type: 'info', title: '', message: '', onConfirm: null });

    const showBanner = (type, title, message, onConfirm = null) => {
        setModalConfig({ type, title, message, onConfirm });
        setModalVisible(true);
    };

    const handleSaveRequest = () => {
        showBanner(
            'confirm',
            "Save Changes",
            "Are you sure you want to update your profile information?",
            executeUpdate
        );
    };

    const executeUpdate = async () => {
        setModalVisible(false);
        setSaving(true);
        try {
            const response = await fetch(`${API_URL}api/auth/users/${user?.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ full_name: name, email, phone })
            });
            const data = await response.json();
            if (response.ok) {
                setUser({ ...user, name: data.full_name, full_name: data.full_name, email: data.email, phone: data.phone });
                setTimeout(() => showBanner('success', "Success", "Profile updated successfully!"), 500);
            } else {
                showBanner('error', "Update Failed", data.detail || "Failed to update profile.");
            }
        } catch (err) {
            showBanner('error', "Network Error", "Could not connect to the server.");
        } finally {
            setSaving(false);
        }
    };

    const executeLogout = () => {
        setModalVisible(false);
        setUser(null);
        navigate('LANDING');
    };

    const handleLogout = () => {
        showBanner('confirm', "Log Out", "Are you sure you want to log out of your account?", executeLogout);
    };

    const executeDelete = async () => {
        setModalVisible(false);
        setDeleting(true);
        try {
            const response = await fetch(`${API_URL}api/auth/users/${user?.id}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                setUser(null);
                navigate('LANDING');
            } else {
                showBanner('error', "Error", "Failed to delete account. It may have already been deleted.");
            }
        } catch (err) {
            showBanner('error', "Network Error", "Could not connect to the server.");
        } finally {
            setDeleting(false);
        }
    };

    const handleDelete = () => {
        showBanner(
            'danger', 
            "Delete Account", 
            "This action is permanent. All your medical records, prescriptions, and data will be lost forever.",
            executeDelete
        );
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#F7FFFD', '#E6FAF7', '#F0F9FF']} style={StyleSheet.absoluteFill} />
            <StatusBar barStyle="dark-content" />
            
            <SafeAreaView style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    
                    <View style={styles.avatarContainer}>
                        <View style={styles.avatarGlow}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>{name ? name[0].toUpperCase() : 'U'}</Text>
                            </View>
                        </View>
                        <Text style={styles.userName}>{name || 'User'}</Text>
                        
                    </View>

                    <View style={styles.glassCard}>
                        <View style={styles.cardHeader}>
                            <MaterialCommunityIcons name="account-details-outline" size={20} color={COLORS.primary} />
                            <Text style={styles.cardHeaderText}>Personal Information</Text>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Full Name</Text>
                            <View style={[styles.inputContainer, focusedField === 'name' && styles.inputActive]}>
                                <Feather name="user" size={18} color={focusedField === 'name' ? COLORS.primary : COLORS.textMuted} style={styles.inputIcon} />
                                <TextInput 
                                    style={styles.input} 
                                    value={name} 
                                    onChangeText={setName} 
                                    placeholder="Your full name"
                                    onFocus={() => setFocusedField('name')}
                                    onBlur={() => setFocusedField(null)}
                                />
                            </View>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Email Address</Text>
                            <View style={[styles.inputContainer, focusedField === 'email' && styles.inputActive]}>
                                <Feather name="mail" size={18} color={focusedField === 'email' ? COLORS.primary : COLORS.textMuted} style={styles.inputIcon} />
                                <TextInput 
                                    style={styles.input} 
                                    value={email} 
                                    onChangeText={setEmail} 
                                    keyboardType="email-address" 
                                    autoCapitalize="none" 
                                    placeholder="Your email"
                                    onFocus={() => setFocusedField('email')}
                                    onBlur={() => setFocusedField(null)}
                                />
                            </View>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Phone Number</Text>
                            <View style={[styles.inputContainer, focusedField === 'phone' && styles.inputActive]}>
                                <Feather name="phone" size={18} color={focusedField === 'phone' ? COLORS.primary : COLORS.textMuted} style={styles.inputIcon} />
                                <TextInput 
                                    style={styles.input} 
                                    value={phone} 
                                    onChangeText={setPhone} 
                                    keyboardType="phone-pad" 
                                    placeholder="Your phone number"
                                    onFocus={() => setFocusedField('phone')}
                                    onBlur={() => setFocusedField(null)}
                                />
                            </View>
                        </View>

                        <TouchableOpacity 
                            style={styles.saveBtnWrapper} 
                            onPress={handleSaveRequest} 
                            disabled={saving}
                        >
                            <LinearGradient 
                                colors={[COLORS.primary, COLORS.primaryDark]} 
                                style={styles.saveBtn}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                {saving ? (
                                    <ActivityIndicator color={COLORS.white} />
                                ) : (
                                    <>
                                        <Feather name="check-circle" size={18} color={COLORS.white} />
                                        <Text style={styles.saveBtnText}>Save Changes</Text>
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.actionSection}>
                        <Text style={styles.sectionTitle}>Account Actions</Text>
                        
                        <TouchableOpacity style={styles.actionItem} onPress={handleLogout}>
                            <View style={[styles.actionIcon, { backgroundColor: COLORS.successBg }]}>
                                <Feather name="log-out" size={20} color={COLORS.primary} />
                            </View>
                            <Text style={styles.actionText}>Log Out</Text>
                            <Feather name="chevron-right" size={20} color={COLORS.textMuted} />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionItem} onPress={handleDelete} disabled={deleting}>
                            <View style={[styles.actionIcon, { backgroundColor: COLORS.dangerBg }]}>
                                <Feather name="trash-2" size={20} color={COLORS.dangerText} />
                            </View>
                            <Text style={[styles.actionText, { color: COLORS.dangerText }]}>Delete Account</Text>
                            <Feather name="chevron-right" size={20} color={COLORS.textMuted} />
                        </TouchableOpacity>
                    </View>

                </ScrollView>
            </SafeAreaView>

            {/* Custom Modal Popup */}
            <Modal visible={modalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <Animated.View style={styles.modalContent}>
                        <View style={[
                            styles.modalIconBox, 
                            { backgroundColor: modalConfig.type === 'error' || modalConfig.type === 'danger' ? COLORS.dangerBg : (modalConfig.type === 'confirm' ? COLORS.primaryGlow : COLORS.successBg) }
                        ]}>
                            <Feather 
                                name={modalConfig.type === 'error' || modalConfig.type === 'danger' ? 'alert-triangle' : (modalConfig.type === 'confirm' ? 'help-circle' : 'check-circle')} 
                                size={28} 
                                color={modalConfig.type === 'error' || modalConfig.type === 'danger' ? COLORS.dangerText : COLORS.primary} 
                            />
                        </View>

                        <Text style={styles.modalTitle}>{modalConfig.title}</Text>
                        <Text style={styles.modalMessage}>{modalConfig.message}</Text>

                        <View style={styles.modalButtons}>
                            {(modalConfig.type === 'confirm' || modalConfig.type === 'danger') && (
                                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setModalVisible(false)}>
                                    <Text style={styles.modalCancelText}>Cancel</Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity 
                                style={[
                                    styles.modalActionBtn, 
                                    { backgroundColor: modalConfig.type === 'danger' ? COLORS.dangerText : COLORS.primary }
                                ]} 
                                onPress={() => {
                                    if (modalConfig.onConfirm) {
                                        modalConfig.onConfirm();
                                    } else {
                                        setModalVisible(false);
                                    }
                                }}
                            >
                                <Text style={styles.modalActionText}>
                                    {modalConfig.type === 'confirm' || modalConfig.type === 'danger' ? 'Yes, Proceed' : 'Got it'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    content: { padding: 24, paddingBottom: 120 },
    
    avatarContainer: { alignItems: 'center', marginBottom: 32, marginTop: 10 },
    avatarGlow: {
        width: 100, height: 100, borderRadius: 50,
        backgroundColor: COLORS.primaryGlow,
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 16,
    },
    avatar: { 
        width: 84, height: 84, borderRadius: 42, 
        backgroundColor: COLORS.primary, 
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 4, borderColor: COLORS.white,
        ...SHADOWS.md,
    },
    avatarText: { fontSize: 36, fontWeight: '800', color: COLORS.white },
    userName: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
    userRole: { fontSize: 14, fontWeight: '600', color: COLORS.primary, marginTop: 4 },

    glassCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        borderRadius: 24, padding: 24,
        borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.8)',
        ...SHADOWS.md,
        marginBottom: 32,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 10 },
    cardHeaderText: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },

    formGroup: { marginBottom: 20 },
    label: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 8, marginLeft: 4 },
    inputContainer: { 
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: COLORS.white, 
        borderWidth: 1, borderColor: COLORS.border, 
        borderRadius: 16, paddingHorizontal: 16, height: 56,
    },
    inputActive: { borderColor: COLORS.primary, backgroundColor: COLORS.white },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, fontSize: 16, color: COLORS.textPrimary, fontWeight: '500' },

    saveBtnWrapper: { marginTop: 10, height: 56, borderRadius: 16, overflow: 'hidden', ...SHADOWS.colored },
    saveBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
    saveBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },

    actionSection: { marginBottom: 20 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 16, marginLeft: 4 },
    actionItem: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: COLORS.white,
        padding: 16, borderRadius: 20,
        marginBottom: 12,
        ...SHADOWS.sm,
    },
    actionIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    actionText: { flex: 1, fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },

    /* Modal Styles */
    modalOverlay: { flex: 1, backgroundColor: 'rgba(13, 31, 45, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    modalContent: { 
        backgroundColor: COLORS.white, width: '100%', maxWidth: 340, 
        borderRadius: 32, padding: 32, alignItems: 'center',
        ...SHADOWS.lg,
    },
    modalIconBox: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 12, textAlign: 'center' },
    modalMessage: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 24, marginBottom: 32 },
    modalButtons: { flexDirection: 'row', width: '100%', gap: 12 },
    modalCancelBtn: { flex: 1, paddingVertical: 16, borderRadius: 16, backgroundColor: COLORS.lightGray, alignItems: 'center' },
    modalCancelText: { color: COLORS.textSecondary, fontSize: 16, fontWeight: '700' },
    modalActionBtn: { flex: 1.5, paddingVertical: 16, borderRadius: 16, alignItems: 'center', ...SHADOWS.sm },
    modalActionText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
});