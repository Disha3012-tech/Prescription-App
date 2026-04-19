import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ActivityIndicator,
  TouchableOpacity, Linking, ScrollView, Platform,
  useWindowDimensions, Animated, PanResponder, StatusBar,
} from 'react-native';
import { MapView, Marker, PROVIDER_GOOGLE } from '../components/Map';
import * as Location from 'expo-location';
import { COLORS } from '../theme';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { API_URL } from '../config';

const IS_WEB = Platform.OS === 'web';

// ── Haversine ─────────────────────────────────────────────────────────────────
const getDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatDistance = (km) =>
  km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;

// ── Hamburger Icon ────────────────────────────────────────────────────────────
const HamburgerIcon = () => (
  <View style={styles.hamburger}>
    <View style={styles.hLine} />
    <View style={styles.hLine} />
    <View style={styles.hLine} />
  </View>
);

// ── Pharmacy Card ─────────────────────────────────────────────────────────────
const PharmacyCard = React.memo(({ pharmacy, index, onNavigate, compact }) => {
  const isOpen = pharmacy.open_now;
  const statusColor = isOpen === true ? '#10B981' : isOpen === false ? '#EF4444' : '#94A3B8';
  const statusLabel = isOpen === true ? 'Open' : isOpen === false ? 'Closed' : 'Hours?';

  return (
    <View style={[styles.pharmacyCard, compact && styles.pharmacyCardCompact]}>
      <View style={styles.rankBadge}>
        <Text style={styles.rankText}>{index + 1}</Text>
      </View>

      <View style={[styles.pharmacyIcon, compact && styles.pharmacyIconCompact]}>
        <MaterialCommunityIcons name="pill" size={compact ? 18 : 22} color={COLORS.primary} />
      </View>

      <View style={styles.pharmacyInfo}>
        {/* Name + open badge on same row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text
            style={[styles.pharmacyName, compact && styles.pharmacyNameCompact, { flex: 1 }]}
            numberOfLines={1}
          >
            {pharmacy.title}
          </Text>
          <View style={[styles.openBadge, {
            backgroundColor: `${statusColor}18`,
            borderColor: `${statusColor}40`,
          }]}>
            <View style={[styles.openDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.openBadgeText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>

        {/* Distance */}
        <View style={styles.metaRow}>
          <View style={styles.distancePill}>
            <Feather name="navigation" size={10} color={COLORS.primary} />
            <Text style={styles.distancePillText}>{formatDistance(pharmacy.distanceKm)}</Text>
          </View>
        </View>

        {/* Address */}
        {pharmacy.address && pharmacy.address !== 'Address not specified' ? (
          <Text style={styles.addressText} numberOfLines={1}>{pharmacy.address}</Text>
        ) : null}
      </View>

      <TouchableOpacity
        style={styles.dirBtn}
        onPress={() => onNavigate(pharmacy)}
        activeOpacity={0.8}
      >
        <Feather name="navigation-2" size={15} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
});

// ── Sort Bar ──────────────────────────────────────────────────────────────────
const SORT_OPTIONS = [
  { key: 'distance', label: 'Nearest', icon: 'navigation' },
  { key: 'open', label: 'Open Now', icon: 'clock' },
];

const SortBar = ({ count, sortBy, setSortBy }) => (
  <View style={styles.sortBar}>
    <View>
      <Text style={styles.sheetTitle}>{count} Pharmacies</Text>
      <Text style={styles.sheetSub}>
        {sortBy === 'open' ? 'Open pharmacies first' : 'Sorted by distance'}
      </Text>
    </View>
    <View style={styles.sortRow}>
      {SORT_OPTIONS.map(({ key, label, icon }) => (
        <TouchableOpacity
          key={key}
          style={[styles.sortPill, sortBy === key && styles.sortPillActive]}
          onPress={() => setSortBy(key)}
          activeOpacity={0.7}
        >
          <Feather
            name={icon}
            size={11}
            color={sortBy === key ? '#FFF' : COLORS.textSecondary}
          />
          <Text style={[styles.sortPillText, sortBy === key && styles.sortPillTextActive]}>
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function PharmacyScreen() {
  const { height, width } = useWindowDimensions();
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pharmacies, setPharmacies] = useState([]);
  const [mapReady, setMapReady] = useState(false);
  const [sortBy, setSortBy] = useState('distance');

  // ── Web panel ────────────────────────────────────────────────
  const isMobileWeb = IS_WEB && width < 768;
  const [panelOpen, setPanelOpen] = useState(true);

  useEffect(() => {
    if (!IS_WEB) return;
    setPanelOpen(width >= 768);
  }, [width >= 768]); // eslint-disable-line

  // ── Snap points ───────────────────────────────────────────────
  const SNAP_TOP = height * 0.08;
  const SNAP_MID = height * 0.48;
  const SNAP_BOTTOM = height * 0.82;

  const sheetY = useRef(new Animated.Value(SNAP_MID)).current;
  const lastY = useRef(SNAP_MID);
  const scrollEnabledRef = useRef(false);
  const [scrollEnabled, setScrollEnabled] = useState(false);

  const snapTo = useCallback((y) => {
    lastY.current = y;
    const atTop = y === SNAP_TOP;
    scrollEnabledRef.current = atTop;
    setScrollEnabled(atTop);
    Animated.spring(sheetY, {
      toValue: y, useNativeDriver: true,
      damping: 22, stiffness: 200, mass: 0.75,
    }).start();
  }, [SNAP_TOP, sheetY]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        scrollEnabledRef.current ? g.dy > 6 : Math.abs(g.dy) > 5,
      onPanResponderGrant: () => sheetY.stopAnimation(),
      onPanResponderMove: (_, g) =>
        sheetY.setValue(Math.max(SNAP_TOP, Math.min(SNAP_BOTTOM, lastY.current + g.dy))),
      onPanResponderRelease: (_, g) => {
        const cur = lastY.current + g.dy;
        const vel = g.vy;
        let target;
        if (vel < -0.5) target = SNAP_TOP;
        else if (vel > 0.5) target = SNAP_BOTTOM;
        else {
          const d = [SNAP_TOP, SNAP_MID, SNAP_BOTTOM].map(s => Math.abs(cur - s));
          target = [SNAP_TOP, SNAP_MID, SNAP_BOTTOM][d.indexOf(Math.min(...d))];
        }
        snapTo(target);
      },
    })
  ).current;

  // ── Web mouse drag ────────────────────────────────────────────
  const isDragging = useRef(false);
  const dragStartY = useRef(0);
  const dragStartSheet = useRef(SNAP_MID);

  const onMouseDown = useCallback((e) => {
    isDragging.current = true;
    dragStartY.current = e.clientY;
    dragStartSheet.current = lastY.current;
    sheetY.stopAnimation();
  }, [sheetY]);

  const onMouseMove = useCallback((e) => {
    if (!isDragging.current) return;
    sheetY.setValue(Math.max(
      SNAP_TOP, Math.min(SNAP_BOTTOM, dragStartSheet.current + (e.clientY - dragStartY.current))
    ));
  }, [sheetY, SNAP_TOP, SNAP_BOTTOM]);

  const onMouseUp = useCallback((e) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const cur = dragStartSheet.current + (e.clientY - dragStartY.current);
    const d = [SNAP_TOP, SNAP_MID, SNAP_BOTTOM].map(s => Math.abs(cur - s));
    snapTo([SNAP_TOP, SNAP_MID, SNAP_BOTTOM][d.indexOf(Math.min(...d))]);
  }, [SNAP_TOP, SNAP_MID, SNAP_BOTTOM, snapTo]);

  useEffect(() => {
    if (!IS_WEB) return;
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  // ── Data fetching ─────────────────────────────────────────────
  useEffect(() => { fetchLocationAndPharmacies(); }, []);
  useEffect(() => {
    if (IS_WEB) { setMapReady(true); return; }
    const t = setTimeout(() => setMapReady(true), 2000);
    return () => clearTimeout(t);
  }, []);

  const fetchLocationAndPharmacies = async () => {
    setLoading(true); setErrorMsg(null); setMapReady(false);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Location permission denied. Please enable it in Settings.'); return;
      }
      if (!(await Location.hasServicesEnabledAsync())) {
        setErrorMsg('Location services are off. Please enable GPS.'); return;
      }
      let loc;
      try {
        loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      } catch {
        loc = await Location.getLastKnownPositionAsync();
        if (!loc) throw new Error('Unable to determine your location. Please try again.');
      }
      setLocation(loc.coords);

      const res = await fetch(
        `${API_URL}api/pharmacies/nearby?lat=${loc.coords.latitude}&lng=${loc.coords.longitude}&limit=20`
      );
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();

      setPharmacies(
        (data.pharmacies ?? []).map(p => ({
          ...p,
          distanceKm: p.distanceKm ?? getDistanceKm(
            loc.coords.latitude, loc.coords.longitude,
            p.latitude, p.longitude
          ),
        }))
      );
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load nearby pharmacies.');
    } finally {
      setLoading(false);
    }
  };

  // ── Sorted list ───────────────────────────────────────────────
  const sortedPharmacies = useMemo(() => {
    const arr = [...pharmacies];
    if (sortBy === 'open') {
      return arr.sort((a, b) => {
        const rank = v => v === true ? 0 : v === null ? 1 : 2;
        const diff = rank(a.open_now) - rank(b.open_now);
        return diff !== 0 ? diff : a.distanceKm - b.distanceKm;
      });
    }
    return arr.sort((a, b) => a.distanceKm - b.distanceKm);
  }, [pharmacies, sortBy]);

  // ── Directions ────────────────────────────────────────────────
  const openDirections = useCallback((pharmacy) => {
    const { latitude, longitude, title } = pharmacy;
    const label = encodeURIComponent(title || 'Pharmacy');
    const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;
    if (Platform.OS === 'ios') {
      Linking.openURL(`maps://?daddr=${latitude},${longitude}&q=${label}`)
        .catch(() => Linking.openURL(googleUrl));
    } else if (Platform.OS === 'android') {
      Linking.openURL(`google.navigation:q=${latitude},${longitude}`)
        .catch(() => Linking.openURL(googleUrl));
    } else {
      Linking.openURL(googleUrl);
    }
  }, []);

  // ── Map markers (use raw pharmacies — markers don't need sort order) ──
  const mapMarkers = pharmacies.map(pharmacy => (
    <Marker
      key={pharmacy.id}
      coordinate={{ latitude: pharmacy.latitude, longitude: pharmacy.longitude }}
      title={pharmacy.title}
      description={`${formatDistance(pharmacy.distanceKm)} away`}
      onCalloutPress={() => openDirections(pharmacy)}
    >
      <View style={styles.markerOuter}>
        <View style={styles.markerInner}>
          <MaterialCommunityIcons name="pill" size={14} color="#FFF" />
        </View>
        <View style={styles.markerTail} />
      </View>
    </Marker>
  ));

  // ── Shared states ─────────────────────────────────────────────
  const renderCenter = (content) => (
    <View style={styles.center}>{content}</View>
  );

  const loadingState = renderCenter(
    <View style={styles.loadingCard}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.loadingTitle}>Locating pharmacies…</Text>
      <Text style={styles.loadingText}>Finding the nearest ones to you</Text>
    </View>
  );

  const errorState = (msg, icon = 'alert-circle', iconColor = '#EF4444', iconBg = '#FEF2F2') =>
    renderCenter(
      <View style={styles.errorCard}>
        <View style={[styles.errorIconWrap, { backgroundColor: iconBg }]}>
          <Feather name={icon} size={32} color={iconColor} />
        </View>
        <Text style={styles.errorTitle}>
          {icon === 'map-pin' ? 'Location unavailable' : 'Something went wrong'}
        </Text>
        <Text style={styles.errorText}>{msg}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchLocationAndPharmacies}>
          <Feather name="refresh-cw" size={14} color="#FFF" />
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );

  const renderMapView = (mapStyle) => (
    <MapView
      style={mapStyle}
      provider={PROVIDER_GOOGLE}
      initialRegion={{
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }}
      showsUserLocation
      onMapReady={() => setMapReady(true)}
    >
      {mapMarkers}
    </MapView>
  );

  const renderList = (compact = false) =>
    sortedPharmacies.length === 0 ? (
      <View style={styles.emptyState}>
        <MaterialCommunityIcons name="map-marker-off" size={40} color={COLORS.textSecondary} />
        <Text style={styles.emptyText}>No pharmacies found nearby</Text>
      </View>
    ) : sortedPharmacies.map((p, i) => (
      <PharmacyCard
        key={p.id}
        pharmacy={p}
        index={i}
        onNavigate={openDirections}
        compact={compact}
      />
    ));

  // ── Render ────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconWrap}>
            <MaterialCommunityIcons name="map-marker-plus" size={20} color={COLORS.primary} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Nearby Pharmacies</Text>
            {location && <Text style={styles.headerSub}>Your current location</Text>}
          </View>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchLocationAndPharmacies}>
          <Feather name="refresh-cw" size={16} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {loading ? loadingState
        : errorMsg ? errorState(errorMsg)
          : !location ? errorState("We couldn't determine your location.", 'map-pin', COLORS.textSecondary, '#F8FAFC')

            : IS_WEB ? (
              /* ── WEB layout ── */
              <View style={styles.webBody}>

                {panelOpen && (
                  <View style={[styles.webPanel, isMobileWeb && styles.webPanelMobile]}>
                    <View style={styles.webPanelHeader}>
                      <SortBar count={sortedPharmacies.length} sortBy={sortBy} setSortBy={setSortBy} />
                    </View>
                    <View style={styles.sheetDivider} />
                    <ScrollView
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={styles.webListContent}
                    >
                      {renderList(true)}
                    </ScrollView>
                  </View>
                )}

                <View style={styles.webMapPanel}>
                  {renderMapView({ flex: 1 })}
                  {!mapReady && (
                    <View style={[StyleSheet.absoluteFillObject, styles.mapLoading]}>
                      <ActivityIndicator size="small" color={COLORS.primary} />
                      <Text style={styles.mapLoadingText}>Loading map…</Text>
                    </View>
                  )}
                </View>

                {isMobileWeb && panelOpen && (
                  <TouchableOpacity
                    style={styles.drawerOverlay}
                    onPress={() => setPanelOpen(false)}
                    activeOpacity={1}
                  />
                )}

                <TouchableOpacity
                  style={styles.floatingToggleBtn}
                  onPress={() => setPanelOpen(v => !v)}
                  activeOpacity={0.85}
                >
                  <HamburgerIcon />
                </TouchableOpacity>
              </View>

            ) : (
              /* ── NATIVE MOBILE layout ── */
              <View style={styles.mapContainer}>
                {renderMapView(StyleSheet.absoluteFillObject)}

                {!mapReady && (
                  <View style={styles.mapLoading}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                    <Text style={styles.mapLoadingText}>Loading map…</Text>
                  </View>
                )}

                <Animated.View style={[styles.bottomSheet, { height, transform: [{ translateY: sheetY }] }]}>
                  <View style={styles.handleArea} {...panResponder.panHandlers}>
                    <View style={styles.dragPillWrap}>
                      <View style={styles.dragPill} />
                    </View>
                    <SortBar count={sortedPharmacies.length} sortBy={sortBy} setSortBy={setSortBy} />
                    <View style={styles.hintRow}>
                      <Feather name="chevrons-up" size={13} color={COLORS.textSecondary} />
                      <Text style={styles.hintText}>Drag to reveal list or map</Text>
                      <Feather name="chevrons-down" size={13} color={COLORS.textSecondary} />
                    </View>
                  </View>

                  <View style={styles.sheetDivider} />

                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    scrollEnabled={scrollEnabled}
                    contentContainerStyle={styles.listContent}
                  >
                    {renderList(false)}
                  </ScrollView>
                </Animated.View>
              </View>
            )
      }
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 3, zIndex: 10,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: `${COLORS.primary}18`,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A', letterSpacing: -0.3 },
  headerSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  refreshBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: `${COLORS.primary}12`,
    justifyContent: 'center', alignItems: 'center',
  },

  // Hamburger
  hamburger: { gap: 4, justifyContent: 'center', alignItems: 'center' },
  hLine: { width: 16, height: 2, backgroundColor: '#FFF', borderRadius: 2 },

  // Floating toggle
  floatingToggleBtn: {
    position: 'absolute', top: 14, left: 14, zIndex: 5,
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22, shadowRadius: 10, elevation: 10,
  },

  // Center states
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingCard: {
    alignItems: 'center', backgroundColor: '#FFF', borderRadius: 24, padding: 36,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 20, elevation: 4, width: '100%',
  },
  loadingTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A', marginTop: 20, marginBottom: 6 },
  loadingText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
  errorCard: {
    alignItems: 'center', backgroundColor: '#FFF', borderRadius: 24, padding: 36,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 20, elevation: 4, width: '100%',
  },
  errorIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  errorTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 8 },
  errorText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.primary, paddingHorizontal: 28, paddingVertical: 13, borderRadius: 14,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
  },
  retryText: { color: '#FFF', fontWeight: '600', fontSize: 15 },

  // Web layout
  webBody: { flex: 1, flexDirection: 'row' },
  webPanel: {
    width: 360, backgroundColor: '#FFFFFF',
    borderRightWidth: 1, borderRightColor: '#F1F5F9',
    shadowColor: '#000', shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 6, zIndex: 10,
  },
  webPanelMobile: {
    position: 'absolute', top: 0, left: 0, bottom: 0, width: '85%',
    zIndex: 300,
    borderRightWidth: 1, borderRightColor: '#E2E8F0',
    shadowColor: '#000', shadowOffset: { width: 6, height: 0 },
    shadowOpacity: 0.18, shadowRadius: 20, elevation: 20,
  },
  webPanelHeader: { paddingHorizontal: 16, paddingVertical: 14 },
  webMapPanel: { flex: 1, position: 'relative', overflow: 'hidden' },
  webListContent: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 24 },
  drawerOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)', zIndex: 200,
  },

  // Map
  mapContainer: { flex: 1, position: 'relative' },
  mapLoading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#EFF6FF', gap: 12,
  },
  mapLoadingText: { fontSize: 14, color: COLORS.primary, fontWeight: '500' },

  // Markers
  markerOuter: { alignItems: 'center' },
  markerInner: {
    backgroundColor: COLORS.primary, width: 34, height: 34, borderRadius: 17,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2.5, borderColor: '#FFF',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4, shadowRadius: 6, elevation: 6,
  },
  markerTail: {
    width: 0, height: 0,
    borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 7,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderTopColor: COLORS.primary, marginTop: -1,
  },

  // Bottom sheet
  bottomSheet: {
    position: 'absolute', left: 0, right: 0, top: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    shadowColor: '#000', shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12, shadowRadius: 24, elevation: 20, zIndex: 100,
  },
  handleArea: {
    paddingHorizontal: 20, paddingBottom: 10,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    backgroundColor: '#FFFFFF',
  },
  dragPillWrap: { alignItems: 'center', paddingTop: 10, paddingBottom: 12 },
  dragPill: { width: 44, height: 5, backgroundColor: '#E2E8F0', borderRadius: 100 },
  hintRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6, paddingVertical: 4,
  },
  hintText: { fontSize: 11, color: '#94A3B8', letterSpacing: 0.2 },

  // Sort bar
  sortBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', letterSpacing: -0.4 },
  sheetSub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },
  sortRow: { flexDirection: 'row', gap: 6 },
  sortPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  sortPillActive: {
    backgroundColor: COLORS.primary, borderColor: COLORS.primary,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 6, elevation: 3,
  },
  sortPillText: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  sortPillTextActive: { color: '#FFF' },
  sheetDivider: { height: 1, backgroundColor: '#F1F5F9' },

  // List
  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 60 },
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyText: { fontSize: 15, color: COLORS.textSecondary },

  // Pharmacy card
  pharmacyCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 18, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  pharmacyCardCompact: { padding: 10, borderRadius: 14, marginBottom: 8 },
  rankBadge: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: '#F1F5F9',
    justifyContent: 'center', alignItems: 'center', marginRight: 8,
  },
  rankText: { fontSize: 11, fontWeight: '700', color: '#94A3B8' },
  pharmacyIcon: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: `${COLORS.primary}14`,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  pharmacyIconCompact: { width: 38, height: 38, borderRadius: 11, marginRight: 10 },
  pharmacyInfo: { flex: 1 },
  pharmacyName: { fontSize: 14, fontWeight: '700', color: '#0F172A', letterSpacing: -0.2 },
  pharmacyNameCompact: { fontSize: 13 },

  // Open badge
  openBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 20, borderWidth: 1,
  },
  openDot: { width: 5, height: 5, borderRadius: 3 },
  openBadgeText: { fontSize: 10, fontWeight: '700' },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
  distancePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: `${COLORS.primary}12`,
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20,
  },
  distancePillText: { fontSize: 11, color: COLORS.primary, fontWeight: '700' },

  dirBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4, marginLeft: 10,
  },
  addressText: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
});
