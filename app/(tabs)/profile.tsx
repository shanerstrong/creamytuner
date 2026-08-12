import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppHeader, GlassCard, Icon, LogoMark, Screen } from '@/src/components/ui';
import { machineById } from '@/src/data/machines';
import { useApp } from '@/src/providers/app-provider';
import {
  PhotoPermissionError,
  chooseProfilePhoto,
  openPhotoPermissionSettings,
  recoverPendingPhoto,
  removeLocalPhoto,
  type PintPhotoSource,
} from '@/src/services/pint-photo';
import { palette, radii, spacing } from '@/src/theme';

const links = [
  { icon: 'cog-outline' as const, label: 'Settings', subtitle: 'Units, export, and local data', route: '/settings' as const },
  { icon: 'ice-cream' as const, label: 'Default Machine', subtitle: 'Choose your active model', route: '/machines' as const },
  { icon: 'help-circle-outline' as const, label: 'Texture Help', subtitle: 'Troubleshoot a pint', route: '/troubleshoot' as const },
];

export default function ProfileScreen() {
  const { recipes, settings, updateSettings } = useApp();
  const machine = machineById(settings.machineId);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(settings.profileDisplayName);
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const recovered = useRef(false);

  useEffect(() => setName(settings.profileDisplayName), [settings.profileDisplayName]);

  useEffect(() => {
    if (Platform.OS !== 'android' || recovered.current) return;
    recovered.current = true;
    void (async () => {
      try {
        const uri = await recoverPendingPhoto('profile');
        if (!uri) return;
        const previous = settings.profilePhotoUri;
        await updateSettings({ profilePhotoUri: uri });
        if (previous && previous !== uri) removeLocalPhoto(previous, 'profile');
      } catch {
        // A pending picker failure should not block the rest of Profile.
      }
    })();
  }, [settings.profilePhotoUri, updateSettings]);

  const saveName = async () => {
    const next = name.trim().slice(0, 40);
    if (!next) {
      Alert.alert('Add a name', 'Enter at least one character for your display name.');
      return;
    }
    await updateSettings({ profileDisplayName: next });
    setName(next);
    setEditingName(false);
  };

  const handlePhotoError = (error: unknown) => {
    const message = error instanceof Error ? error.message : 'Please try again.';
    if (error instanceof PhotoPermissionError && error.canOpenSettings) {
      Alert.alert('Photo access needed', message, [{ text: 'Not now', style: 'cancel' }, { text: 'Open Settings', onPress: () => { void openPhotoPermissionSettings(); } }]);
      return;
    }
    if (error instanceof PhotoPermissionError && !error.canOpenSettings && message === 'Photo selection was canceled.') return;
    Alert.alert('Could not update photo', message);
  };

  const selectPhoto = async (source: PintPhotoSource) => {
    setPhotoBusy(true);
    try {
      const uri = await chooseProfilePhoto(source);
      if (!uri) return;
      const previous = settings.profilePhotoUri;
      await updateSettings({ profilePhotoUri: uri });
      if (previous && previous !== uri) removeLocalPhoto(previous, 'profile');
      setPhotoMenuOpen(false);
    } catch (error) {
      handlePhotoError(error);
    } finally {
      setPhotoBusy(false);
    }
  };

  const removePhoto = async () => {
    const previous = settings.profilePhotoUri;
    await updateSettings({ profilePhotoUri: '' });
    removeLocalPhoto(previous, 'profile');
    setPhotoMenuOpen(false);
  };

  return (
    <Screen>
      <AppHeader title="Profile" />
      <View style={styles.hero}>
        <Pressable onPress={() => setPhotoMenuOpen((value) => !value)} disabled={photoBusy} accessibilityRole="button" accessibilityLabel={settings.profilePhotoUri ? 'Edit profile photo' : 'Add profile photo'} style={styles.avatarButton}>
          {settings.profilePhotoUri ? <Image source={{ uri: settings.profilePhotoUri }} style={styles.avatar} accessibilityLabel={`${settings.profileDisplayName}'s profile photo`} /> : <View style={styles.avatarFallback}><LogoMark size={70} /></View>}
          <View style={styles.editBadge}>{photoBusy ? <ActivityIndicator size="small" color={palette.white} /> : <Icon name="camera-plus-outline" size={20} color={palette.white} />}</View>
        </Pressable>
        {photoBusy ? <Text style={styles.photoStatus} accessibilityLiveRegion="polite">Preparing your photo…</Text> : null}
        {photoMenuOpen ? <View style={styles.photoActions}>
          <Pressable onPress={() => { void selectPhoto('camera'); }} disabled={photoBusy} style={styles.photoAction} accessibilityRole="button" accessibilityLabel="Take profile photo"><Icon name="camera-outline" color={palette.cyan} /><Text style={styles.photoActionText}>Take photo</Text></Pressable>
          <Pressable onPress={() => { void selectPhoto('library'); }} disabled={photoBusy} style={styles.photoAction} accessibilityRole="button" accessibilityLabel="Choose profile photo from library"><Icon name="image-outline" color={palette.lavender} /><Text style={styles.photoActionText}>Choose photo</Text></Pressable>
          {settings.profilePhotoUri ? <Pressable onPress={() => { void removePhoto(); }} disabled={photoBusy} style={[styles.photoAction, styles.removePhotoAction]} accessibilityRole="button" accessibilityLabel="Remove profile photo"><Icon name="delete-outline" color={palette.danger} /><Text style={[styles.photoActionText, styles.removePhotoText]}>Remove</Text></Pressable> : null}
        </View> : null}
        {editingName ? <View style={styles.nameEditor}>
          <TextInput value={name} onChangeText={setName} maxLength={40} autoFocus selectTextOnFocus style={styles.nameInput} accessibilityLabel="Profile display name" returnKeyType="done" onSubmitEditing={() => { void saveName(); }} />
          <View style={styles.nameActions}>
            <Pressable onPress={() => { setName(settings.profileDisplayName); setEditingName(false); }} style={styles.nameButton} accessibilityRole="button"><Text style={styles.nameButtonText}>Cancel</Text></Pressable>
            <Pressable onPress={() => { void saveName(); }} style={[styles.nameButton, styles.nameSave]} accessibilityRole="button"><Text style={[styles.nameButtonText, styles.nameSaveText]}>Save</Text></Pressable>
          </View>
        </View> : <Pressable onPress={() => setEditingName(true)} style={styles.nameRow} accessibilityRole="button" accessibilityLabel={`Edit display name, currently ${settings.profileDisplayName}`}>
          <Text style={styles.title}>{settings.profileDisplayName}</Text><Icon name="pencil-outline" size={20} color={palette.cyan} />
        </Pressable>}
        <Text style={styles.subtitle}>Private, offline, and tuned to {machine.shortName}</Text>
        <Text style={styles.localNote}><Icon name="shield-lock-outline" size={14} color={palette.success} /> Name and photo stay on this device</Text>
      </View>
      <View style={styles.stats}>
        <GlassCard style={styles.stat}><Text style={styles.statValue}>{recipes.length}</Text><Text style={styles.statLabel}>Recipes</Text></GlassCard>
        <GlassCard style={styles.stat}><Text style={styles.statValue}>{recipes.filter((recipe) => recipe.favorite).length}</Text><Text style={styles.statLabel}>Favorites</Text></GlassCard>
        <GlassCard style={styles.stat}><Text style={styles.statValue}>{machine.capacityMl}</Text><Text style={styles.statLabel}>ml capacity</Text></GlassCard>
      </View>
      <View style={styles.links}>
        {links.map((link) => (
          <GlassCard key={link.label} onPress={() => router.push(link.route)} accessibilityLabel={link.label} style={styles.link}>
            <View style={styles.linkContent}>
              <View style={styles.linkIcon}><Icon name={link.icon} color={palette.lavender} /></View>
              <View style={styles.linkCopy}><Text style={styles.linkTitle}>{link.label}</Text><Text style={styles.linkSubtitle}>{link.subtitle}</Text></View>
            </View>
          </GlassCard>
        ))}
      </View>
      <Text style={styles.version}>Creamy Tuner Private Beta · v1.0.0</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingVertical: spacing.md, gap: spacing.xs },
  avatarButton: { width: 104, height: 104, borderRadius: 52, borderWidth: 2, borderColor: 'rgba(78,217,232,0.52)', alignItems: 'center', justifyContent: 'center', backgroundColor: palette.panelSoft },
  avatar: { width: 98, height: 98, borderRadius: 49, resizeMode: 'cover' },
  avatarFallback: { width: 98, height: 98, borderRadius: 49, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  editBadge: { position: 'absolute', right: -3, bottom: 2, width: 38, height: 38, borderRadius: 19, borderWidth: 3, borderColor: palette.ink, backgroundColor: palette.pink, alignItems: 'center', justifyContent: 'center' },
  photoStatus: { color: palette.cyan, fontSize: 14, lineHeight: 19, fontWeight: '800' },
  photoActions: { width: '100%', maxWidth: 470, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.xs, marginVertical: spacing.xs },
  photoAction: { minHeight: 46, minWidth: 130, paddingHorizontal: spacing.sm, borderRadius: radii.md, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panelRaised, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  photoActionText: { color: palette.text, fontSize: 14, lineHeight: 19, fontWeight: '800' },
  removePhotoAction: { borderColor: 'rgba(255,107,131,0.4)' },
  removePhotoText: { color: palette.danger },
  nameRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm },
  title: { color: palette.text, fontSize: 24, lineHeight: 30, fontWeight: '900' },
  nameEditor: { width: '100%', maxWidth: 360, gap: spacing.xs },
  nameInput: { minHeight: 50, borderRadius: radii.md, borderWidth: 1, borderColor: palette.cyan, backgroundColor: palette.panelSoft, color: palette.text, paddingHorizontal: spacing.sm, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  nameActions: { flexDirection: 'row', gap: spacing.xs },
  nameButton: { flex: 1, minHeight: 44, borderRadius: radii.md, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panelRaised, alignItems: 'center', justifyContent: 'center' },
  nameSave: { borderColor: 'rgba(78,217,232,0.5)', backgroundColor: 'rgba(78,217,232,0.12)' },
  nameButtonText: { color: palette.textMuted, fontSize: 15, fontWeight: '800' },
  nameSaveText: { color: palette.cyan },
  subtitle: { color: palette.textMuted, fontSize: 16, lineHeight: 22, textAlign: 'center' },
  localNote: { color: palette.success, fontSize: 13, lineHeight: 18, fontWeight: '800', textAlign: 'center' },
  stats: { flexDirection: 'row', gap: spacing.xs, marginVertical: spacing.md },
  stat: { flex: 1, padding: spacing.md, alignItems: 'center' },
  statValue: { color: palette.text, fontSize: 21, fontWeight: '900' },
  statLabel: { color: palette.textMuted, fontSize: 13, lineHeight: 18, marginTop: 3 },
  links: { gap: spacing.xs, marginTop: spacing.sm },
  link: { padding: spacing.md },
  linkContent: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  linkIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(174,134,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  linkCopy: { flex: 1 },
  linkTitle: { color: palette.text, fontSize: 16, lineHeight: 21, fontWeight: '800' },
  linkSubtitle: { color: palette.textMuted, fontSize: 14, lineHeight: 19, marginTop: 2 },
  version: { color: palette.textFaint, fontSize: 13, textAlign: 'center', marginTop: spacing.xl },
});
