import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar,
} from 'react-native';
import { COLORS } from './src/theme';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

// Screens
import LandingScreen from './src/screens/LandingScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import ScannerScreen from './src/screens/ScannerScreen';
import DrugInteractionScreen from './src/screens/DrugInteractionScreen';
import DoseTrackerScreen from './src/screens/DoseTrackerScreen';
import AskAIScreen from './src/screens/AskAIScreen';
import MedicalHistoryScreen from './src/screens/MedicalHistoryScreen';
import PharmacyScreen from './src/screens/PharmacyScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ConfirmMedicinesScreen from './src/screens/ConfirmMedicinesScreen';
import PrescriptionDetailScreen from './src/screens/PrescriptionDetailScreen';
import PrescriptionTimelineScreen from './src/screens/PrescriptionTimelineScreen';
import FamilyProfileScreen from './src/screens/FamilyProfileScreen';
import MedicineExplainerScreen from './src/screens/MedicineExplainerScreen';
import RefillReminderScreen from './src/screens/RefillReminderScreen';
import SymptomLookupScreen from './src/screens/SymptomLookupScreen';

// ─── Bottom tab config ──────────────────────────────────────────────────────
const TABS = [
  {
    key: 'DASHBOARD', label: 'Home',
    icon: (active) => <Feather name="home" size={22} color={active ? COLORS.primary : COLORS.inactiveTab} />,
  },
  {
    key: 'DRUG_INTERACTION', label: 'Drug Check',
    icon: (active) => <MaterialCommunityIcons name="shield-alert-outline" size={22} color={active ? COLORS.primary : COLORS.inactiveTab} />,
  },
  {
    key: 'SCANNER', label: 'Scan',
    icon: (active) => (
      <View style={[styles.scanTabIcon, active && styles.scanTabIconActive]}>
        <Feather name="camera" size={22} color={active ? COLORS.white : COLORS.inactiveTab} />
      </View>
    ),
    center: true,
  },
  {
    key: 'DOSE_TRACKER', label: 'Doses',
    icon: (active) => <Ionicons name="timer-outline" size={22} color={active ? COLORS.primary : COLORS.inactiveTab} />,
  },
  {
    key: 'ASK_AI', label: 'Ask AI',
    icon: (active) => <MaterialCommunityIcons name="robot-outline" size={22} color={active ? COLORS.primary : COLORS.inactiveTab} />,
  },
];

// Screen name → tab header title mapping
const SCREEN_TITLES = {
  DASHBOARD: null,
  SCANNER: 'Scan Prescription',
  DRUG_INTERACTION: 'Drug Interaction',
  DOSE_TRACKER: 'Dose Tracker',
  ASK_AI: 'Ask AI',
  HISTORY: 'Medical History',
  PHARMACY: 'Nearby Pharmacies',
  PROFILE: 'Profile Settings',
  CONFIRM_MEDICINES: 'Confirm Scan',
  PRESCRIPTION_DETAIL: 'Prescription Details',
  PRESCRIPTION_TIMELINE: 'Prescription Timeline',
  FAMILY_PROFILE: 'Family Profiles',
  MEDICINE_EXPLAINER: 'Medicine Guide',
  REFILL_REMINDER: 'Refill Reminders',
  SYMPTOM_LOOKUP: 'Symptom Lookup',
};

// Screens that show the bottom tab bar
const TAB_SCREENS = new Set(['DASHBOARD', 'SCANNER', 'DRUG_INTERACTION', 'DOSE_TRACKER', 'ASK_AI']);

// Screens that need the shared header
const NEEDS_HEADER = new Set(['HISTORY', 'PHARMACY', 'PROFILE', 'CONFIRM_MEDICINES', 'PRESCRIPTION_DETAIL']);

// Screens that manage their own full header (no shared back header)
const SELF_HEADER = new Set(['PRESCRIPTION_TIMELINE', 'FAMILY_PROFILE', 'MEDICINE_EXPLAINER', 'REFILL_REMINDER', 'SYMPTOM_LOOKUP']);

export default function App() {
  const [screen, setScreen] = useState('LANDING');
  const [user, setUser] = useState(null);
  const [routeParams, setRouteParams] = useState({});

  const navigate = (s, params = {}) => {
    setScreen(s);
    setRouteParams(params);
  };

  const handleSetUser = (u) => {
    setUser(u);
  };

  // ── Render current screen content ─────────────────────────────────────
  const renderScreen = () => {
    switch (screen) {
      case 'LANDING': return <LandingScreen navigate={navigate} />;
      case 'ONBOARDING': return <OnboardingScreen navigate={navigate} />;
      case 'LOGIN': return <LoginScreen navigate={navigate} setUser={handleSetUser} />;
      case 'SIGNUP': return <SignupScreen navigate={navigate} setUser={handleSetUser} />;
      case 'DASHBOARD': return <DashboardScreen user={user} navigate={navigate} currentScreen={screen} />;
      case 'SCANNER': return <ScannerScreen navigate={navigate} user={user} route={{ params: routeParams }} />;
      case 'DRUG_INTERACTION': return <DrugInteractionScreen navigate={navigate} />;
      case 'DOSE_TRACKER': return <DoseTrackerScreen user={user} navigate={navigate} currentScreen={screen} />;
      case 'ASK_AI': return <AskAIScreen navigate={navigate} />;
      case 'HISTORY': return <MedicalHistoryScreen user={user} navigate={navigate} />;
      case 'PHARMACY': return <PharmacyScreen navigate={navigate} />;
      case 'PROFILE': return <ProfileScreen user={user} setUser={handleSetUser} navigate={navigate} />;
      case 'CONFIRM_MEDICINES': return <ConfirmMedicinesScreen route={{ params: routeParams }} navigation={{ navigate }} />;
      case 'PRESCRIPTION_DETAIL': return <PrescriptionDetailScreen route={{ params: routeParams }} navigation={{ navigate }} />;
      case 'PRESCRIPTION_TIMELINE': return <PrescriptionTimelineScreen user={user} navigate={navigate} />;
      case 'FAMILY_PROFILE': return <FamilyProfileScreen user={user} navigate={navigate} />;
      case 'MEDICINE_EXPLAINER': return <MedicineExplainerScreen navigate={navigate} user={user} medicines={routeParams.medicines} />;
      case 'REFILL_REMINDER': return <RefillReminderScreen user={user} navigate={navigate} />;
      case 'SYMPTOM_LOOKUP': return <SymptomLookupScreen navigate={navigate} user={user} />;
      default: return <LandingScreen navigate={navigate} />;
    }
  };

  const showTabs = TAB_SCREENS.has(screen);
  const showHeader = NEEDS_HEADER.has(screen);
  const isSelfHeader = SELF_HEADER.has(screen);
  const title = SCREEN_TITLES[screen];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* Simple back-header for non-tab sub-screens */}
      {showHeader && (
        <SafeAreaView style={styles.headerSafe}>
          <View style={styles.pageHeader}>
            <TouchableOpacity onPress={() => navigate('DASHBOARD')} style={styles.backBtn}>
              <Feather name="arrow-left" size={22} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.pageTitle}>{title}</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      )}

      {/* Main content */}
      <View style={{ flex: 1 }}>
        {renderScreen()}
      </View>

      {/* Bottom tab bar */}
      {showTabs && (
        <SafeAreaView style={styles.tabBarSafe}>
          <View style={styles.tabBar}>
            {TABS.map(tab => {
              const active = screen === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.tabItem, tab.center && styles.tabItemCenter]}
                  onPress={() => navigate(tab.key)}
                  activeOpacity={0.7}
                >
                  {tab.icon(active)}
                  <Text style={[
                    styles.tabLabel,
                    active && styles.tabLabelActive,
                    tab.center && { marginTop: -6 }
                  ]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  headerSafe: { backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  pageHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.lightGray, justifyContent: 'center', alignItems: 'center',
  },
  pageTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  tabBarSafe: { backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.border },
  tabBar: {
    flexDirection: 'row', alignItems: 'center', height: 60,
  },
  tabItem: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3,
  },
  tabItemCenter: { marginTop: -20 },
  tabLabel: { fontSize: 10, fontWeight: '600', color: COLORS.inactiveTab },
  tabLabelActive: { color: COLORS.primary },
  scanTabIcon: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: COLORS.lightGray, justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: COLORS.background,
  },
  scanTabIconActive: { backgroundColor: COLORS.primary },
});
