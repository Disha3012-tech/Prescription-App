import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList,
    SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator,
    Animated, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SHADOWS } from '../theme';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { API_URL, COUNTRIES } from '../config';

const SUGGESTIONS = [
    { icon: '💊', text: 'What are Paracetamol side effects?' },
    { icon: '🍽️', text: 'Can I take ibuprofen on empty stomach?' },
    { icon: '📋', text: 'What does "bd" mean on a prescription?' },
    { icon: '🔄', text: 'Generic vs brand medicines?' },
    { icon: '💉', text: 'Is it safe to split tablets?' },
    { icon: '🌡️', text: 'How to store medicines properly?' },
];

const SYSTEM_PROMPT = `You are a friendly, knowledgeable medical assistant helping patients understand their prescriptions and medicines. 
Rules:
- Explain everything in simple, clear English (10th-grade level)
- When mentioning Indian brand names, also mention generic equivalents
- Always add a brief disclaimer when giving medical advice
- Never diagnose conditions — only explain medicines, dosages, and general health info
- Be warm, empathetic, and reassuring
- Keep responses concise — 3-4 sentences max unless more detail is clearly needed
- Use symbols (like •, 💊, ⚠️) and bold text (**important**) to make information scanable`;

const WELCOME_MESSAGE = `Hey there! 👋 I'm your personal **Health AI**.\n\nAsk me anything about:\n• 💊 **Medicines** — dosage, side effects, interactions\n• 🔄 **Generics** — cheaper alternatives with same effect\n• 📋 **Prescriptions** — decode doctor shorthand\n• 🌡️ **Health tips** — storage, timing, diet\n\n⚠️ *I'm here to inform, not diagnose. Always consult your doctor for medical decisions.*\n\nWhat would you like to know?`;

const formatText = (text, isUser) => {
    if (!text) return null;
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            const content = part.substring(2, part.length - 2);
            return <Text key={index} style={[styles.boldText, isUser && styles.boldTextUser]}>{content}</Text>;
        }
        if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
            const content = part.substring(1, part.length - 1);
            return <Text key={index} style={styles.italicText}>{content}</Text>;
        }
        return <Text key={index}>{part}</Text>;
    });
};

export default function AskAIScreen({ goBack }) {
    const [messages, setMessages] = useState([
        { id: '0', role: 'assistant', content: WELCOME_MESSAGE },
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const flatRef = useRef(null);
    const inputRef = useRef(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const dot1 = useRef(new Animated.Value(0)).current;
    const dot2 = useRef(new Animated.Value(0)).current;
    const dot3 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }, []);

    useEffect(() => {
        if (loading) {
            const animDot = (dot, delay) => Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(dot, { toValue: -6, duration: 300, useNativeDriver: true }),
                    Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
                ])
            ).start();
            animDot(dot1, 0); animDot(dot2, 150); animDot(dot3, 300);
        }
    }, [loading]);

    useEffect(() => {
        if (messages.length > 1) {
            setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 120);
        }
    }, [messages]);

    const sendMessage = async (text) => {
        const userText = (text || input).trim();
        if (!userText || loading) return;

        const userMsg = { id: Date.now().toString(), role: 'user', content: userText };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const history = [...messages.slice(-9), userMsg]
                .filter(m => m.role !== 'assistant' || m.id !== '0')
                .map(m => ({ role: m.role, content: m.content }));

            const response = await fetch(`${API_URL}chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: history }),
            });

            const data = await response.json();
            if (data.status !== 'success') throw new Error(data.detail || 'Chat error');

            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.content,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }]);
        } catch (e) {
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "Connection issue — please check your internet and try again.",
                isError: true,
            }]);
        } finally {
            setLoading(false);
        }
    };

    const clearChat = () => setMessages([{ id: '0', role: 'assistant', content: WELCOME_MESSAGE }]);

    const renderMessage = ({ item, index }) => {
        const isUser = item.role === 'user';
        return (
            <Animated.View style={[
                styles.msgRow,
                isUser && styles.msgRowUser,
                { opacity: fadeAnim },
            ]}>
                {!isUser && (
                    <LinearGradient colors={['#0D9488', '#0891B2']} style={styles.aiAvatar}>
                        <MaterialCommunityIcons name="robot-outline" size={14} color="#fff" />
                    </LinearGradient>
                )}
                <View style={[
                    styles.bubble,
                    isUser ? styles.bubbleUser : styles.bubbleAI,
                    item.isError && styles.bubbleError,
                ]}>
                    <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>
                        {formatText(item.content, isUser)}
                    </Text>
                    {item.timestamp && !isUser && (
                        <Text style={styles.bubbleTime}>{item.timestamp}</Text>
                    )}
                </View>
            </Animated.View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <LinearGradient colors={['#0A1628', '#0F2535']} style={styles.header}>
                <TouchableOpacity onPress={() => goBack()} style={styles.backBtn}>
                    <Feather name="arrow-left" size={20} color="rgba(255,255,255,0.8)" />
                </TouchableOpacity>
                <View style={styles.headerLeft}>
                    <LinearGradient colors={['#0D9488', '#0891B2']} style={styles.headerAvatar}>
                        <MaterialCommunityIcons name="robot-outline" size={20} color="#fff" />
                    </LinearGradient>
                    <View>
                        <Text style={styles.headerName}>Health Assistant</Text>
                        <View style={styles.onlineRow}>
                            <Animated.View style={[styles.onlineDot, {
                                transform: [{ scale: dot1 }],
                                opacity: loading ? dot1.interpolate({ inputRange: [-6, 0], outputRange: [1, 0.4] }) : 1,
                            }]} />
                            <Text style={styles.onlineText}>
                                {loading ? 'Thinking...' : 'AI · Online'}
                            </Text>
                        </View>
                    </View>
                </View>
                <TouchableOpacity style={styles.clearBtn} onPress={clearChat}>
                    <Feather name="refresh-cw" size={16} color="rgba(255,255,255,0.7)" />
                </TouchableOpacity>
            </LinearGradient>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={0}
            >
                {/* Messages */}
                <FlatList
                    ref={flatRef}
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={m => m.id}
                    contentContainerStyle={styles.messagesList}
                    showsVerticalScrollIndicator={false}
                    ListFooterComponent={loading ? (
                        <View style={styles.typingRow}>
                            <LinearGradient colors={['#0D9488', '#0891B2']} style={styles.aiAvatar}>
                                <MaterialCommunityIcons name="robot-outline" size={14} color="#fff" />
                            </LinearGradient>
                            <View style={styles.typingBubble}>
                                <Animated.View style={[styles.typingDot, { transform: [{ translateY: dot1 }] }]} />
                                <Animated.View style={[styles.typingDot, { transform: [{ translateY: dot2 }] }]} />
                                <Animated.View style={[styles.typingDot, { transform: [{ translateY: dot3 }] }]} />
                            </View>
                        </View>
                    ) : null}
                />

                {/* Suggestions */}
                {messages.length <= 1 && (
                    <View style={styles.suggestionsWrapper}>
                        <Text style={styles.suggestLabel}>✨ Suggested</Text>
                        <FlatList
                            data={SUGGESTIONS}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            keyExtractor={(_, i) => i.toString()}
                            contentContainerStyle={styles.suggList}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={styles.suggChip} onPress={() => sendMessage(item.text)}>
                                    <Text style={styles.suggEmoji}>{item.icon}</Text>
                                    <Text style={styles.suggText}>{item.text}</Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                )}

                {/* Disclaimer */}
                <View style={styles.disclaimer}>
                    <Ionicons name="information-circle-outline" size={12} color={COLORS.textMuted} />
                    <Text style={styles.disclaimerText}>Not a substitute for professional medical advice.</Text>
                </View>

                {/* Input */}
                <View style={styles.inputBar}>
                    <View style={styles.inputWrapper}>
                        <TextInput
                            ref={inputRef}
                            style={styles.textInput}
                            placeholder="Ask about any medicine..."
                            placeholderTextColor={COLORS.textMuted}
                            value={input}
                            onChangeText={setInput}
                            multiline
                            maxLength={500}
                            onSubmitEditing={() => sendMessage()}
                        />
                    </View>
                    <TouchableOpacity
                        style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
                        onPress={() => sendMessage()}
                        disabled={!input.trim() || loading}
                    >
                        <LinearGradient
                            colors={(!input.trim() || loading) ? ['#94A3B8', '#94A3B8'] : ['#0D9488', '#0891B2']}
                            style={styles.sendGradient}
                        >
                            {loading
                                ? <ActivityIndicator size="small" color="#fff" />
                                : <Feather name="send" size={16} color="#fff" />
                            }
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F7FFFD' },

    header: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingHorizontal: 20, paddingVertical: 14,
    },
    backBtn: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    headerAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    headerName: { fontSize: 16, fontWeight: '800', color: '#fff' },
    onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
    onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#34D399' },
    onlineText: { fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: '500' },
    clearBtn: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    },

    messagesList: { paddingHorizontal: 16, paddingVertical: 16, gap: 12 },

    msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, maxWidth: '88%' },
    msgRowUser: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },

    aiAvatar: {
        width: 30, height: 30, borderRadius: 15,
        justifyContent: 'center', alignItems: 'center', flexShrink: 0,
    },

    bubble: {
        paddingHorizontal: 14, paddingVertical: 11, borderRadius: 20, flexShrink: 1,
        ...SHADOWS.sm,
    },
    bubbleAI: {
        backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.border,
        borderBottomLeftRadius: 5,
    },
    bubbleUser: {
        borderBottomRightRadius: 5,
        backgroundColor: COLORS.primary,
    },
    bubbleError: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
    bubbleText: { fontSize: 15, color: COLORS.textPrimary, lineHeight: 22 },
    bubbleTextUser: { color: '#fff' },
    bubbleTime: { fontSize: 10, color: COLORS.textMuted, marginTop: 6, alignSelf: 'flex-end' },
    boldText: { fontWeight: '800', color: COLORS.textPrimary },
    boldTextUser: { color: '#fff' },
    italicText: { fontStyle: 'italic', color: COLORS.textSecondary },

    typingRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 4, paddingHorizontal: 16 },
    typingBubble: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14,
        borderRadius: 20, borderBottomLeftRadius: 5, borderWidth: 1, borderColor: COLORS.border,
    },
    typingDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: COLORS.primaryLight },

    suggestionsWrapper: { paddingTop: 8 },
    suggestLabel: {
        fontSize: 11, fontWeight: '700', color: COLORS.textSecondary,
        paddingHorizontal: 16, marginBottom: 8, letterSpacing: 0.4,
    },
    suggList: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
    suggChip: {
        flexDirection: 'row', alignItems: 'center', gap: 7,
        backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 10,
        borderRadius: 22, borderWidth: 1, borderColor: COLORS.border, maxWidth: 220,
        ...SHADOWS.sm,
    },
    suggEmoji: { fontSize: 14 },
    suggText: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '500', flexShrink: 1 },

    disclaimer: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
        paddingHorizontal: 16, paddingVertical: 5,
    },
    disclaimerText: { fontSize: 10, color: COLORS.textMuted },

    inputBar: {
        flexDirection: 'row', alignItems: 'flex-end', gap: 10,
        paddingHorizontal: 16, paddingVertical: 12, paddingBottom: Platform.OS === 'ios' ? 24 : 12,
        backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: COLORS.border,
    },
    inputWrapper: {
        flex: 1, backgroundColor: COLORS.lightGray, borderRadius: 22,
        borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 16, paddingVertical: 10,
    },
    textInput: {
        fontSize: 15, color: COLORS.textPrimary, maxHeight: 100, lineHeight: 21,
    },
    sendBtn: { flexShrink: 0 },
    sendGradient: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center' },
    sendBtnDisabled: { opacity: 0.6 },
});
