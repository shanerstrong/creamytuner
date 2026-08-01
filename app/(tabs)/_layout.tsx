import { Tabs } from 'expo-router';
import { Icon, type IconName } from '@/src/components/ui';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={() => null}
      screenOptions={{
        headerShown: false,
      }}>
      <Tabs.Screen name="home" options={tabOptions('Home', 'home-variant-outline', 'home-variant')} />
      <Tabs.Screen name="recipes" options={tabOptions('Recipes', 'silverware-fork-knife', 'silverware-fork-knife')} />
      <Tabs.Screen name="library" options={tabOptions('Library', 'bookshelf', 'bookshelf')} />
      <Tabs.Screen name="spin" options={tabOptions('Live Spin', 'record-circle-outline', 'record-circle')} />
      <Tabs.Screen name="profile" options={tabOptions('Profile', 'account-outline', 'account')} />
    </Tabs>
  );
}

function tabOptions(title: string, icon: IconName, activeIcon: IconName) {
  return {
    title,
    tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => <Icon name={focused ? activeIcon : icon} size={23} color={color} />,
  };
}
