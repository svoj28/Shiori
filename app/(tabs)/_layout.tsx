import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Platform, StyleSheet, View } from 'react-native'
import { BlurView } from 'expo-blur'

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

const TABS: {
  name: string
  title: string
  icon: IoniconsName
  iconFocused: IoniconsName
  accent: string
}[] = [
  { name: 'index',      title: 'Anime',       icon: 'play-circle-outline', iconFocused: 'play-circle',  accent: '#7C5CFC' },
  { name: 'manga',      title: 'Manga',        icon: 'book-outline',        iconFocused: 'book',         accent: '#16A881' },
  { name: 'lightnovel', title: 'Light Novel',  icon: 'library-outline',     iconFocused: 'library',      accent: '#D4860A' },
  { name: 'explore',    title: 'Search',       icon: 'search-outline',      iconFocused: 'search',       accent: '#A78BFA' },
  { name: 'profile',    title: 'Profile',      icon: 'person-outline',      iconFocused: 'person',       accent: '#EC4899' },
]

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarBackground: () =>
          Platform.OS === 'ios' ? (
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0f0f1a' }]} />
          ),
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.35)',
        tabBarLabelStyle: styles.label,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      {TABS.map(tab => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused, color }) => (
              <View style={[styles.iconWrap, focused && { backgroundColor: tab.accent + '22' }]}>
                <Ionicons
                  name={focused ? tab.iconFocused : tab.icon}
                  size={22}
                  color={focused ? tab.accent : color}
                />
              </View>
            ),
            tabBarActiveTintColor: tab.accent,
          }}
        />
      ))}
    </Tabs>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    position:        'absolute',
    borderTopWidth:  0,
    elevation:       0,
    height:          Platform.OS === 'ios' ? 80 : 64,
    paddingBottom:   Platform.OS === 'ios' ? 20 : 8,
    paddingTop:      8,
    backgroundColor: 'transparent',
  },
  tabItem: {
    gap: 2,
  },
  label: {
    fontSize:    10,
    fontWeight:  '500',
    letterSpacing: 0.2,
  },
  iconWrap: {
    width:         40,
    height:        32,
    borderRadius:  10,
    alignItems:    'center',
    justifyContent:'center',
  },
})