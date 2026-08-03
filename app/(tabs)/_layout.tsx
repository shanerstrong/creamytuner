import { router, Tabs } from 'expo-router';
import { useEffect } from 'react';

import { Icon, LoadingScreen, type IconName } from '@/src/components/ui';
import { CURRENT_ONBOARDING_VERSION } from '@/src/domain/tutorial';
import { useApp } from '@/src/providers/app-provider';

export default function TabLayout() {
  const { ready, settings } = useApp();
  const tutorialComplete = settings.onboarded && settings.onboardingVersion >= CURRENT_ONBOARDING_VERSION;
  useEffect(() => {
    if (ready && !tutorialComplete) router.replace('/');
  }, [ready, tutorialComplete]);
  if (!ready || !tutorialComplete) return <LoadingScreen />;
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
