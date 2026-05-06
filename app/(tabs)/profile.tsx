import React, { useState } from 'react'
import {
  View, Text, Pressable, StyleSheet,
  ScrollView, StatusBar, Switch,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'

const ACCENT = '#EC4899'

// ─── Stat box ─────────────────────────────────────────────────────────────────

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

// ─── Setting row ──────────────────────────────────────────────────────────────

function SettingRow({
  icon, label, value, onPress, toggle, toggleValue, accent,
}: {
  icon: string
  label: string
  value?: string
  onPress?: () => void
  toggle?: boolean
  toggleValue?: boolean
  accent?: string
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.settingRow, pressed && !toggle && styles.pressed]}
      disabled={toggle}
    >
      <View style={[styles.settingIconWrap, { backgroundColor: (accent ?? '#6B7280') + '22' }]}>
        <Ionicons name={icon as any} size={17} color={accent ?? '#6B7280'} />
      </View>
      <Text style={styles.settingLabel}>{label}</Text>
      <View style={styles.settingRight}>
        {toggle ? (
          <Switch
            value={toggleValue}
            onValueChange={onPress as any}
            trackColor={{ false: 'rgba(255,255,255,0.1)', true: ACCENT }}
            thumbColor="#fff"
          />
        ) : (
          <>
            {value && <Text style={styles.settingValue}>{value}</Text>}
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.25)" />
          </>
        )}
      </View>
    </Pressable>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const [notifications, setNotifications] = useState(true)
  const [darkMode,      setDarkMode]      = useState(true)
  const [autoPlay,      setAutoPlay]      = useState(false)

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        {/* Avatar card */}
        <LinearGradient
          colors={['#1E1B4B', '#0C0C18']}
          style={styles.avatarCard}
        >
          <View style={[styles.avatarRing, { borderColor: ACCENT }]}>
            <View style={styles.avatarInner}>
              <Ionicons name="person" size={40} color={ACCENT} />
            </View>
          </View>
          <Text style={styles.userName}>Shiori User</Text>
          <Text style={styles.userHandle}>@shiori · Member since 2024</Text>

          {/* Stats */}
          <View style={styles.statsRow}>
            <StatBox label="Anime"     value="48"  color="#7C5CFC" />
            <View style={styles.statDivider} />
            <StatBox label="Manga"     value="23"  color="#16A881" />
            <View style={styles.statDivider} />
            <StatBox label="Novels"    value="11"  color="#D4860A" />
          </View>
        </LinearGradient>

        {/* Library section */}
        <Text style={styles.sectionTitle}>My Library</Text>
        <View style={styles.card}>
          <SettingRow icon="bookmark"       label="Bookmarked"     value="82 items"  accent="#7C5CFC" onPress={() => {}} />
          <SettingRow icon="checkmark-done" label="Completed"      value="36 items"  accent="#22C55E" onPress={() => {}} />
          <SettingRow icon="time-outline"   label="In Progress"    value="14 items"  accent="#EAB308" onPress={() => {}} />
          <SettingRow icon="close-circle"   label="Dropped"        value="4 items"   accent="#EF4444" onPress={() => {}} />
        </View>

        {/* Preferences */}
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.card}>
          <SettingRow
            icon="notifications" label="Notifications"
            toggle toggleValue={notifications}
            onPress={() => setNotifications(v => !v)} accent={ACCENT}
          />
          <SettingRow
            icon="moon" label="Dark Mode"
            toggle toggleValue={darkMode}
            onPress={() => setDarkMode(v => !v)} accent="#6366F1"
          />
          <SettingRow
            icon="play-forward" label="Auto-play Next"
            toggle toggleValue={autoPlay}
            onPress={() => setAutoPlay(v => !v)} accent="#7C5CFC"
          />
          <SettingRow icon="language" label="Language" value="English" accent="#06B6D4" onPress={() => {}} />
        </View>

        {/* Account */}
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <SettingRow icon="person-circle" label="Edit Profile"    accent="#A78BFA"  onPress={() => {}} />
          <SettingRow icon="shield"        label="Privacy"         accent="#22C55E"  onPress={() => {}} />
          <SettingRow icon="help-circle"   label="Help & Support"  accent="#06B6D4"  onPress={() => {}} />
          <SettingRow icon="information-circle" label="About SHIORI" accent="#6B7280" onPress={() => {}} />
        </View>

        {/* Sign out */}
        <Pressable style={styles.signOutBtn} onPress={() => {}}>
          <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#0C0C18' },
  scroll: { paddingBottom: 20 },

  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  headerTitle: { color: '#fff', fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },

  avatarCard: {
    marginHorizontal: 16, borderRadius: 20,
    alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20,
    marginBottom: 24,
  },
  avatarRing: {
    width: 90, height: 90, borderRadius: 45,
    borderWidth: 2.5, alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  avatarInner: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(236,72,153,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  userName: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 4 },
  userHandle: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 22 },

  statsRow: { flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'center' },
  statBox: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 11 },
  statDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.1)' },

  sectionTitle: {
    color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '600',
    letterSpacing: 0.8, textTransform: 'uppercase',
    marginHorizontal: 20, marginBottom: 8,
  },
  card: {
    marginHorizontal: 16, backgroundColor: '#141420',
    borderRadius: 16, overflow: 'hidden', marginBottom: 20,
  },
  settingRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  pressed: { backgroundColor: 'rgba(255,255,255,0.04)' },
  settingIconWrap: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  settingLabel: { flex: 1, color: '#fff', fontSize: 14 },
  settingRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  settingValue: { color: 'rgba(255,255,255,0.35)', fontSize: 13 },

  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginHorizontal: 16, paddingVertical: 14,
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
    backgroundColor: 'rgba(239,68,68,0.07)',
  },
  signOutText: { color: '#EF4444', fontSize: 14, fontWeight: '600' },
})