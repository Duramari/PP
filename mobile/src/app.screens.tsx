// ═══════════════════════════════════════════════════════════════
// DIALBEE MOBILE APP — React Native + Expo
// Screens: Home, Search, Business Profile, Dashboard, Agent
// ═══════════════════════════════════════════════════════════════

// ── package.json ──────────────────────────────────────────────
const PACKAGE_JSON = {
  "name": "dialbee-mobile",
  "version": "1.0.0",
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "build:android": "eas build --platform android",
    "build:ios": "eas build --platform ios",
  },
  "dependencies": {
    "expo": "~50.0.0",
    "expo-router": "~3.4.0",
    "expo-location": "~16.5.0",
    "expo-notifications": "~0.27.0",
    "expo-image-picker": "~14.7.0",
    "expo-secure-store": "~12.8.0",
    "react": "18.2.0",
    "react-native": "0.73.2",
    "@react-navigation/native": "^6.1.10",
    "@react-navigation/bottom-tabs": "^6.5.15",
    "@react-navigation/stack": "^6.3.21",
    "react-native-safe-area-context": "^4.8.2",
    "react-native-screens": "~3.29.0",
    "react-native-gesture-handler": "~2.14.0",
    "react-native-reanimated": "~3.6.0",
    "@tanstack/react-query": "^5.17.0",
    "zustand": "^4.4.7",
    "axios": "^1.6.5",
    "react-native-maps": "^1.10.0",
    "@gorhom/bottom-sheet": "^4.6.0",
    "react-native-flash-message": "^0.4.2",
    "react-native-skeleton-placeholder": "^5.2.4",
    "dayjs": "^1.11.10",
  },
};

// ── app/_layout.tsx (Root Layout) ─────────────────────────────
import React from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import FlashMessage from 'react-native-flash-message';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, staleTime: 60000 } },
});

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="business/[slug]" options={{ presentation: 'card' }} />
          <Stack.Screen name="search" />
          <Stack.Screen name="auth" />
        </Stack>
        <FlashMessage position="top" />
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}

// ── app/(tabs)/index.tsx (Home Screen) ─────────────────────────
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, FlatList, Image, StatusBar, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { useQuery } from '@tanstack/react-query';

const COLORS = { primary: '#e8421a', bg: '#f5f5f5', card: '#fff', text: '#1a1a1a', muted: '#888' };

const CATEGORIES = [
  { slug:'restaurants',  name:'Restaurants',  icon:'🍽️', color:'#ff6b35' },
  { slug:'plumbers',     name:'Plumbers',      icon:'🔧', color:'#3b82f6' },
  { slug:'electricians', name:'Electricians',  icon:'⚡', color:'#f59e0b' },
  { slug:'hospitals',    name:'Hospitals',     icon:'🏥', color:'#e84393' },
  { slug:'lawyers',      name:'Lawyers',       icon:'⚖️', color:'#8b5cf6' },
  { slug:'beauty-salons',name:'Salons',        icon:'💅', color:'#ec4899' },
  { slug:'auto-repair',  name:'Auto Repair',   icon:'🚗', color:'#64748b' },
  { slug:'hotels',       name:'Hotels',        icon:'🏨', color:'#f97316' },
];

export default function HomeScreen() {
  const [query, setQuery]   = useState('');
  const [city, setCity]     = useState('Lagos');
  const [country, setCountry] = useState('NG');

  const handleSearch = useCallback(() => {
    if (query.trim() || city) {
      router.push({ pathname: '/search', params: { q: query, city, country } });
    }
  }, [query, city, country]);

  const handleCategoryPress = (cat: typeof CATEGORIES[0]) => {
    router.push({ pathname: '/search', params: { q: cat.name, city, country, category: cat.slug } });
  };

  const getLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    const loc = await Location.getCurrentPositionAsync({});
    const geo  = await Location.reverseGeocodeAsync(loc.coords);
    if (geo[0]?.city) setCity(geo[0].city);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.primary }}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[0]}>

        {/* ── Hero Header ── */}
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <Text style={styles.logo}>Dialbee</Text>
            <TouchableOpacity onPress={getLocation} style={styles.locationBtn}>
              <Text style={{ color: '#fff', fontSize: 12 }}>📍 {city}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.heroTitle}>Find Local Businesses</Text>
          <Text style={styles.heroSub}>Trusted · Verified · Near You</Text>

          {/* Search Box */}
          <View style={styles.searchBox}>
            <TextInput
              style={styles.searchInput}
              placeholder="What are you looking for?"
              placeholderTextColor="#aaa"
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Search</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.content}>

          {/* Categories */}
          <Text style={styles.sectionTitle}>Popular Categories</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.slug}
                style={styles.categoryCard}
                onPress={() => handleCategoryPress(cat)}
                activeOpacity={0.7}
              >
                <View style={[styles.categoryIcon, { backgroundColor: cat.color + '20' }]}>
                  <Text style={{ fontSize: 26 }}>{cat.icon}</Text>
                </View>
                <Text style={styles.categoryName}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* For Business Banner */}
          <TouchableOpacity style={styles.bizBanner} onPress={() => router.push('/dashboard')}>
            <View>
              <Text style={styles.bizBannerTitle}>List Your Business Free</Text>
              <Text style={styles.bizBannerSub}>Get discovered by local customers</Text>
            </View>
            <Text style={{ fontSize: 28 }}>🏢</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── app/search.tsx (Search Results Screen) ─────────────────────
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, FlatList } from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';

function SearchScreen() {
  const params  = useLocalSearchParams<{ q: string; city: string; country: string }>();
  const [query, setQuery]   = useState(params.q ?? '');
  const [city,  setCity]    = useState(params.city ?? 'Lagos');
  const [sortBy, setSortBy] = useState('relevance');

  const { data, fetchNextPage, hasNextPage, isLoading, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['search', query, city, sortBy],
      queryFn:  ({ pageParam = 1 }) =>
        fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/v1/businesses/search?q=${query}&city=${city}&sortBy=${sortBy}&page=${pageParam}&limit=20`)
          .then(r => r.json())
          .then(d => d.data),
      getNextPageParam: (last: any) => last?.page < last?.totalPages ? last.page + 1 : undefined,
    });

  const businesses = data?.pages.flatMap((p: any) => p.data) ?? [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      {/* Search Bar */}
      <View style={styles.searchHeader}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
          <Text style={{ fontSize: 20 }}>←</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.headerInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search businesses..."
          onSubmitEditing={() => {}}
          returnKeyType="search"
        />
      </View>

      {/* Sort tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sortBar}>
        {['relevance', 'rating', 'distance', 'newest'].map(s => (
          <TouchableOpacity key={s} onPress={() => setSortBy(s)}
            style={[styles.sortChip, sortBy === s && styles.sortChipActive]}>
            <Text style={[styles.sortChipText, sortBy === s && { color: '#fff' }]}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={businesses}
          keyExtractor={(item: any) => item.id}
          renderItem={({ item, index }) => (
            <BusinessCard biz={item} position={index + 1} />
          )}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.5}
          ListFooterComponent={() =>
            isFetchingNextPage ? <ActivityIndicator size="small" color={COLORS.primary} style={{ padding: 16 }} /> : null
          }
          contentContainerStyle={{ padding: 12, gap: 10 }}
        />
      )}
    </SafeAreaView>
  );
}

// ── Business Card Component ─────────────────────────────────────
function BusinessCard({ biz, position }: { biz: any; position: number }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <TouchableOpacity
      style={styles.bizCard}
      onPress={() => router.push(`/business/${biz.slug}`)}
      activeOpacity={0.9}
    >
      {biz.subscription_tier !== 'free' && (
        <View style={[styles.tierBadge, { backgroundColor: biz.subscription_tier === 'premium' ? '#3b82f620' : '#7c3aed20' }]}>
          <Text style={[styles.tierText, { color: biz.subscription_tier === 'premium' ? '#2563eb' : '#6d28d9' }]}>
            {biz.subscription_tier === 'premium' ? '⭐ Premium' : '👑 Enterprise'}
          </Text>
        </View>
      )}

      <View style={styles.bizCardBody}>
        {/* Logo */}
        <View style={styles.bizLogo}>
          {biz.logo_url
            ? <Image source={{ uri: biz.logo_url }} style={{ width: 52, height: 52, borderRadius: 10 }} />
            : <Text style={{ fontSize: 26 }}>🏢</Text>
          }
        </View>

        {/* Info */}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.bizRank} numberOfLines={1}>
              {position}. {biz.name}
            </Text>
            {biz.verification_status === 'verified' && <Text style={{ color: '#0284c7', fontSize: 14 }}>✓</Text>}
          </View>
          <Text style={styles.bizCategory}>{biz.category_name} · {biz.city}</Text>
          {biz.avg_rating > 0 && (
            <Text style={styles.bizRating}>⭐ {biz.avg_rating.toFixed(1)} ({biz.total_reviews})</Text>
          )}
          {biz.is_open_now !== undefined && (
            <Text style={{ fontSize: 11, color: biz.is_open_now ? '#16a34a' : '#dc2626', marginTop: 2 }}>
              ● {biz.is_open_now ? 'Open Now' : 'Closed'}
            </Text>
          )}
        </View>

        {/* Actions */}
        <View style={styles.bizActions}>
          <TouchableOpacity
            style={styles.callBtn}
            onPress={() => setShowModal(true)}
          >
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>Quote</Text>
          </TouchableOpacity>
          {biz.phone_primary && (
            <TouchableOpacity style={styles.callBtnOutline}>
              <Text style={{ color: COLORS.primary, fontSize: 11, fontWeight: '700' }}>Call</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── app/business/[slug].tsx (Business Profile) ────────────────
function BusinessProfileScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [tab, setTab] = useState<'overview' | 'reviews' | 'photos'>('overview');
  const [showLeadForm, setShowLeadForm] = useState(false);

  const { data: biz, isLoading } = useQuery({
    queryKey: ['business', slug],
    queryFn: () =>
      fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/v1/businesses/${slug}`)
        .then(r => r.json()).then(d => d.data),
  });

  if (isLoading || !biz) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator color={COLORS.primary} /></View>;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* Header image */}
      <View style={styles.profileHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={{ color: '#fff', fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        {biz.cover_url
          ? <Image source={{ uri: biz.cover_url }} style={StyleSheet.absoluteFill} />
          : <View style={{ flex: 1, backgroundColor: COLORS.primary + '40' }} />
        }
        <View style={styles.profileOverlay} />
      </View>

      <ScrollView>
        {/* Business info */}
        <View style={styles.profileInfo}>
          <View style={styles.profileLogoRow}>
            <View style={styles.profileLogo}>
              <Text style={{ fontSize: 30 }}>🏢</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>{biz.name}</Text>
              <Text style={styles.profileCat}>{biz.category_name} · {biz.city_name}</Text>
              {biz.avg_rating > 0 && (
                <Text style={styles.profileRating}>⭐ {biz.avg_rating.toFixed(1)} · {biz.total_reviews} reviews</Text>
              )}
            </View>
          </View>

          {/* CTA buttons */}
          <View style={styles.ctaRow}>
            <TouchableOpacity style={styles.ctaPrimary} onPress={() => setShowLeadForm(true)}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>💬 Get Free Quote</Text>
            </TouchableOpacity>
            {biz.phone_primary && (
              <TouchableOpacity style={styles.ctaSecondary}>
                <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: 14 }}>📞 Call</Text>
              </TouchableOpacity>
            )}
            {biz.whatsapp && (
              <TouchableOpacity style={[styles.ctaSecondary, { borderColor: '#25d366' }]}>
                <Text style={{ color: '#25d366', fontWeight: '700', fontSize: 14 }}>WhatsApp</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Tabs */}
          <View style={styles.tabBar}>
            {(['overview', 'reviews', 'photos'] as const).map(t => (
              <TouchableOpacity key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
                <Text style={[styles.tabText, tab === t && { color: COLORS.primary, fontWeight: '700' }]}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab content */}
          {tab === 'overview' && (
            <View style={{ padding: 16 }}>
              {biz.description && <Text style={{ color: '#555', lineHeight: 22, marginBottom: 16 }}>{biz.description}</Text>}
              {[
                { label: '📍 Address', val: biz.address_line1 },
                { label: '📞 Phone', val: biz.phone_primary },
                { label: '🌐 Website', val: biz.website },
                { label: '📅 Est.', val: biz.year_established ? `Since ${biz.year_established}` : null },
              ].filter(i => i.val).map((item, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 }}>
                  <Text style={{ fontSize: 14, color: '#555', flex: 1 }}>
                    <Text style={{ fontWeight: '700' }}>{item.label}: </Text>{item.val}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {tab === 'reviews' && (
            <View style={{ padding: 16 }}>
              <Text style={{ fontWeight: '700', color: '#333', marginBottom: 12 }}>
                Rating: {biz.avg_rating}/5 · {biz.total_reviews} reviews
              </Text>
              <Text style={{ color: '#aaa', fontSize: 12 }}>Reviews loaded from API...</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Lead Form Modal (simplified) */}
      {showLeadForm && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Get Free Quote</Text>
            <Text style={styles.modalSub}>from {biz.name}</Text>
            <TouchableOpacity onPress={() => setShowLeadForm(false)} style={styles.modalClose}>
              <Text style={{ color: '#fff', fontWeight: '800' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  hero:          { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 24 },
  heroTop:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  logo:          { color: '#fff', fontWeight: '900', fontSize: 24, letterSpacing: -0.5 },
  locationBtn:   { backgroundColor: 'rgba(255,255,255,.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  heroTitle:     { color: '#fff', fontWeight: '900', fontSize: 26, marginBottom: 4 },
  heroSub:       { color: 'rgba(255,255,255,.8)', fontSize: 14, marginBottom: 20 },
  searchBox:     { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', elevation: 8, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8 },
  searchInput:   { flex: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#333' },
  searchBtn:     { backgroundColor: COLORS.primary, paddingHorizontal: 20, justifyContent: 'center' },
  content:       { backgroundColor: '#f5f5f5', padding: 16 },
  sectionTitle:  { fontWeight: '800', fontSize: 18, color: '#1a1a1a', marginBottom: 14, marginTop: 4 },
  categoryGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  categoryCard:  { width: '22%', backgroundColor: '#fff', borderRadius: 14, padding: 10, alignItems: 'center', gap: 6, elevation: 2 },
  categoryIcon:  { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  categoryName:  { fontSize: 10, fontWeight: '700', color: '#333', textAlign: 'center' },
  bizBanner:     { backgroundColor: '#1e293b', borderRadius: 16, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bizBannerTitle:{ color: '#fff', fontWeight: '800', fontSize: 16, marginBottom: 4 },
  bizBannerSub:  { color: '#94a3b8', fontSize: 12 },

  // Search screen
  searchHeader:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  headerInput:   { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14 },
  sortBar:       { backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  sortChip:      { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#e0e0e0', marginRight: 8 },
  sortChipActive:{ backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  sortChipText:  { fontSize: 12, fontWeight: '600', color: '#555' },

  // Business card
  bizCard:       { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6 },
  tierBadge:     { paddingHorizontal: 12, paddingVertical: 4, flexDirection: 'row' },
  tierText:      { fontSize: 11, fontWeight: '700' },
  bizCardBody:   { flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 12 },
  bizLogo:       { width: 52, height: 52, borderRadius: 10, backgroundColor: '#fff3f0', alignItems: 'center', justifyContent: 'center' },
  bizRank:       { fontWeight: '800', fontSize: 14, color: '#1a1a1a', flex: 1 },
  bizCategory:   { fontSize: 12, color: '#888', marginTop: 2 },
  bizRating:     { fontSize: 12, color: '#555', marginTop: 3, fontWeight: '600' },
  bizActions:    { gap: 6 },
  callBtn:       { backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  callBtnOutline:{ borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },

  // Profile
  profileHeader: { height: 200, backgroundColor: '#f0f0f0', overflow: 'hidden' },
  backBtn:       { position: 'absolute', top: 16, left: 16, zIndex: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,.4)', alignItems: 'center', justifyContent: 'center' },
  profileOverlay:{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,.2)' },
  profileInfo:   { flex: 1 },
  profileLogoRow:{ flexDirection: 'row', gap: 14, padding: 16, alignItems: 'flex-start' },
  profileLogo:   { width: 64, height: 64, borderRadius: 14, backgroundColor: '#fff3f0', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fde8e0' },
  profileName:   { fontWeight: '800', fontSize: 18, color: '#1a1a1a', lineHeight: 22 },
  profileCat:    { fontSize: 13, color: '#888', marginTop: 2 },
  profileRating: { fontSize: 13, color: '#555', fontWeight: '600', marginTop: 3 },
  ctaRow:        { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 16 },
  ctaPrimary:    { flex: 1, backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  ctaSecondary:  { flex: 1, borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  tabBar:        { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  tab:           { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive:     { borderBottomColor: COLORS.primary },
  tabText:       { fontSize: 13, fontWeight: '500', color: '#888' },

  // Modal
  modalOverlay:  { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,.5)', justifyContent: 'flex-end' },
  modal:         { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, minHeight: 300 },
  modalTitle:    { fontWeight: '800', fontSize: 20, color: '#1a1a1a', marginBottom: 4 },
  modalSub:      { fontSize: 13, color: '#888', marginBottom: 20 },
  modalClose:    { backgroundColor: COLORS.primary, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 'auto' },
});

export { HomeScreen, SearchScreen, BusinessProfileScreen, BusinessCard };
