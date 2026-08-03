import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { usePathname } from 'expo-router';
import React, { type ComponentProps, type ReactNode, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { recipeImages } from '@/src/assets';
import { gradients, palette, radii, shadows, spacing } from '@/src/theme';
import type { Nutrition, Recipe } from '@/src/types';
import { NutritionSummary } from '@/src/components/nutrition';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export function Icon({ name, size = 22, color = palette.text }: { name: IconName; size?: number; color?: string }) {
  if (name === 'chevron-right') return null;
  return <MaterialCommunityIcons name={name} size={size} color={color} />;
}

export function Screen({ children, scroll = true, contentStyle, resetKey, footer, ...props }: ScrollViewProps & { children: ReactNode; scroll?: boolean; contentStyle?: StyleProp<ViewStyle>; resetKey?: string | number; footer?: ReactNode }) {
  const pathname = usePathname();
  const scrollRef = useRef<ScrollView>(null);
  const content = <View style={[styles.screenInner, contentStyle]}>{children}</View>;

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.scrollTo(0, 0);
  }, [pathname, resetKey]);

  return (
    <View style={styles.screen}>
      <LinearGradient colors={gradients.background} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={styles.glowTop} />
      <View pointerEvents="none" style={styles.glowBottom} />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        {scroll ? <ScrollView ref={scrollRef} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} {...props}>{content}</ScrollView> : content}
        {footer}
      </SafeAreaView>
    </View>
  );
}

export function LogoMark({ size = 64 }: { size?: number }) {
  return (
    <View style={[styles.logoMark, { width: size, height: size, borderRadius: size / 2 }]}>
      <Image source={require('@/assets/images/icon.png')} style={{ width: size, height: size, borderRadius: size / 2 }} accessibilityLabel="Creamy Tuner mark" />
    </View>
  );
}

export function BrandWordmark({ large = false }: { large?: boolean }) {
  return (
    <View style={styles.wordmarkRow} accessibilityLabel="Creamy Tuner">
      <Text style={[styles.wordmark, large && styles.wordmarkLarge]}>Creamy</Text>
      <Text style={[styles.wordmark, styles.wordmarkAccent, large && styles.wordmarkLarge]}> Tuner</Text>
    </View>
  );
}

export function AppHeader({ title, subtitle, left, right }: { title: string; subtitle?: string; left?: ReactNode; right?: ReactNode }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerSide}>{left}</View>
      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
      </View>
      <View style={[styles.headerSide, styles.headerRight]}>{right}</View>
    </View>
  );
}

export function IconButton({ icon, onPress, label, color = palette.text }: { icon: IconName; onPress?: () => void; label: string; color?: string }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}><Icon name={icon} color={color} /></Pressable>;
}

export function GlassCard({ children, style, onPress, accessibilityLabel }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; accessibilityLabel?: string }) {
  const flattenedStyle = StyleSheet.flatten(style);
  const body = (
    <View style={[styles.card, style, onPress && styles.pressableCard]}>
      <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill} />
      <LinearGradient colors={onPress ? gradients.cardAction : gradients.card} style={StyleSheet.absoluteFill} />
      <View style={styles.cardContent}>{children}</View>
    </View>
  );
  if (!onPress) return body;
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} style={({ pressed }) => [{ width: flattenedStyle?.width, flex: flattenedStyle?.flex, alignSelf: flattenedStyle?.alignSelf }, pressed && styles.pressed]}>{body}</Pressable>;
}

export function GradientButton({ title, onPress, icon, disabled = false, variant = 'primary', accessibilityLabel }: { title: string; onPress: () => void; icon?: IconName; disabled?: boolean; variant?: 'primary' | 'secondary' | 'danger'; accessibilityLabel?: string }) {
  const colors = variant === 'primary' ? gradients.primary : variant === 'danger' ? ['#5D2339', '#A42D50'] as const : ['#293553', '#202B48'] as const;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? title} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.buttonOuter, pressed && styles.pressed, disabled && styles.disabled]}>
      <LinearGradient colors={colors} style={styles.button}>
        <Text style={styles.buttonText}>{title}</Text>
        {icon ? <Icon name={icon} size={18} /> : null}
      </LinearGradient>
    </Pressable>
  );
}

export function Pill({ label, active = false, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.pill, active && styles.pillActive, pressed && styles.pressed]} accessibilityRole={onPress ? 'button' : undefined}>
      {active ? <LinearGradient colors={['#C89BFF', '#A56AEE']} style={[StyleSheet.absoluteFill, { borderRadius: radii.pill }]} /> : null}
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function ActionCard({ icon, title, subtitle, onPress, tone = 'purple' }: { icon: IconName; title: string; subtitle: string; onPress: () => void; tone?: 'purple' | 'blue' | 'pink' | 'gold' }) {
  const iconColor = tone === 'blue' ? palette.cyan : tone === 'gold' ? palette.warning : tone === 'pink' ? palette.pink : palette.lavender;
  return (
    <GlassCard onPress={onPress} accessibilityLabel={title} style={styles.actionCard}>
      <View style={[styles.actionIcon, { backgroundColor: `${iconColor}20` }]}><Icon name={icon} size={30} color={iconColor} /></View>
      <Text style={styles.actionTitle}>{title}</Text>
      <Text style={styles.actionSubtitle}>{subtitle}</Text>
    </GlassCard>
  );
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? <Pressable onPress={onAction}><Text style={styles.sectionAction}>{action}</Text></Pressable> : null}
    </View>
  );
}

export function NutritionStrip({ nutrition, compact = false }: { nutrition: Nutrition; compact?: boolean }) {
  return <NutritionSummary nutrition={nutrition} compact={compact} />;
}

export function RecipeCard({ recipe, onPress, onFavorite, wide = false }: { recipe: Recipe; onPress: () => void; onFavorite?: () => void; wide?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.recipeCard, wide && styles.recipeCardWide, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={`Open ${recipe.name}`}>
      <ImageBackground source={recipeImages[recipe.imageKey]} style={styles.recipeImage} imageStyle={styles.recipeImageRadius}>
        <LinearGradient colors={['transparent', 'rgba(5, 8, 24, 0.95)']} style={StyleSheet.absoluteFill} />
        {recipe.isTemplate ? <View style={styles.templateBadge}><Text style={styles.templateBadgeText}>Starter template</Text></View> : null}
        {onFavorite ? <Pressable onPress={(event) => { event.stopPropagation(); onFavorite(); }} style={styles.recipeFavorite} accessibilityLabel={recipe.favorite ? 'Remove favorite' : 'Add favorite'}><Icon name={recipe.favorite ? 'heart' : 'heart-outline'} size={21} color={recipe.favorite ? palette.pink : palette.white} /></Pressable> : null}
        <View style={styles.recipeCardCopy}>
          <Text style={styles.recipeCardTitle} numberOfLines={2}>{recipe.name}</Text>
          <Text style={styles.recipeCardMeta}>{Math.round(recipe.nutrition.calories)} cal · {Math.round(recipe.nutrition.protein)}g protein</Text>
        </View>
      </ImageBackground>
    </Pressable>
  );
}

export function SearchField({ value, onChangeText, placeholder = 'Search ingredients...' }: { value: string; onChangeText: (text: string) => void; placeholder?: string }) {
  return (
    <View style={styles.searchField}>
      <Icon name="magnify" size={20} color={palette.textMuted} />
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={palette.textFaint} style={styles.searchInput} accessibilityLabel={placeholder} />
      {value ? <Pressable onPress={() => onChangeText('')} accessibilityLabel="Clear search"><Icon name="close-circle" size={18} color={palette.textMuted} /></Pressable> : null}
    </View>
  );
}

export function LoadingScreen() {
  return <Screen scroll={false} contentStyle={styles.loading}><LogoMark /><ActivityIndicator color={palette.pink} size="large" /><Text style={styles.muted}>Preparing your pint lab…</Text></Screen>;
}

export function EmptyState({ icon, title, message, action, onAction }: { icon: IconName; title: string; message: string; action?: string; onAction?: () => void }) {
  return <GlassCard style={styles.empty}><Icon name={icon} size={44} color={palette.lavender} /><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyMessage}>{message}</Text>{action && onAction ? <GradientButton title={action} onPress={onAction} /> : null}</GlassCard>;
}

export const textStyles = StyleSheet.create({
  title: { color: palette.text, fontSize: 30, lineHeight: 35, fontWeight: '800' },
  heading: { color: palette.text, fontSize: 22, lineHeight: 27, fontWeight: '800' },
  body: { color: palette.textMuted, fontSize: 16, lineHeight: 24 },
  caption: { color: palette.textMuted, fontSize: 13, lineHeight: 19 },
});

const styles = StyleSheet.create({
  screen: { flex: 1, overflow: 'hidden', backgroundColor: palette.ink },
  safe: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: spacing.xl },
  screenInner: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  glowTop: { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(177, 43, 211, 0.10)', top: -120, right: -100 },
  glowBottom: { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(42, 116, 203, 0.08)', bottom: -100, left: -130 },
  header: { minHeight: 64, flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs },
  headerSide: { width: 50, alignItems: 'flex-start' },
  headerRight: { alignItems: 'flex-end' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { color: palette.text, fontSize: 22, lineHeight: 28, fontWeight: '800', textAlign: 'center' },
  headerSubtitle: { color: palette.textMuted, fontSize: 14, lineHeight: 19, marginTop: 2, textAlign: 'center' },
  iconButton: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.055)' },
  logoMark: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', ...shadows.glow },
  wordmarkRow: { flexDirection: 'row', alignItems: 'baseline' },
  wordmark: { color: palette.text, fontSize: 25, fontWeight: '900', letterSpacing: -1 },
  wordmarkLarge: { fontSize: 34, letterSpacing: -1.5 },
  wordmarkAccent: { color: palette.pink },
  card: { borderRadius: radii.md, borderWidth: 1, borderColor: palette.border, overflow: 'hidden', backgroundColor: palette.panel },
  pressableCard: { width: '100%', borderColor: 'rgba(174, 190, 238, 0.28)' },
  cardContent: { flex: 1, zIndex: 1 },
  buttonOuter: { borderRadius: radii.pill, overflow: 'hidden', ...shadows.glow },
  button: { minHeight: 52, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, borderRadius: radii.pill },
  buttonText: { color: palette.white, fontSize: 15, fontWeight: '800' },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
  disabled: { opacity: 0.45 },
  pill: { minHeight: 44, overflow: 'hidden', borderWidth: 1, borderColor: palette.border, paddingHorizontal: spacing.md, paddingVertical: 9, borderRadius: radii.pill, backgroundColor: 'rgba(17,25,49,0.8)', justifyContent: 'center' },
  pillActive: { borderColor: 'rgba(226,201,255,0.7)' },
  pillText: { color: palette.textMuted, fontSize: 14, lineHeight: 19, fontWeight: '700', zIndex: 1 },
  pillTextActive: { color: '#14122B' },
  actionCard: { minHeight: 172, padding: spacing.md, alignItems: 'center', justifyContent: 'center' },
  actionIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  actionTitle: { color: palette.text, fontSize: 17, lineHeight: 22, fontWeight: '800', textAlign: 'center' },
  actionSubtitle: { color: palette.textMuted, fontSize: 14, lineHeight: 19, textAlign: 'center', marginTop: 5 },
  sectionTitleRow: { marginTop: spacing.lg, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: palette.text, fontSize: 21, lineHeight: 27, fontWeight: '800' },
  sectionAction: { color: palette.pink, fontSize: 15, fontWeight: '700' },
  nutritionStrip: { flexDirection: 'row', borderRadius: radii.md, borderWidth: 1, borderColor: palette.border, backgroundColor: 'rgba(10,16,37,0.76)', paddingVertical: spacing.sm, paddingHorizontal: spacing.xs },
  nutritionCompact: { borderWidth: 0, backgroundColor: 'rgba(10,16,37,0.84)' },
  nutritionMetric: { width: 82, alignItems: 'center' },
  metricLabel: { color: palette.textMuted, fontSize: 13, lineHeight: 17 },
  metricValue: { color: palette.text, fontSize: 17, fontWeight: '800', marginTop: 2 },
  metricNote: { color: palette.textFaint, fontSize: 13, lineHeight: 18, marginTop: 1 },
  recipeCard: { width: '47.5%', aspectRatio: 0.83, borderRadius: radii.md, overflow: 'hidden', borderWidth: 1, borderColor: palette.border, backgroundColor: 'transparent' },
  recipeCardWide: { width: '100%', aspectRatio: 1.65 },
  recipeImage: { width: '100%', height: '100%', justifyContent: 'flex-end' },
  recipeImageRadius: { borderRadius: radii.md },
  recipeFavorite: { position: 'absolute', top: spacing.sm, right: spacing.sm, width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: 'rgba(8,11,28,0.62)' },
  templateBadge: { position: 'absolute', top: spacing.sm, left: spacing.sm, paddingHorizontal: spacing.xs, paddingVertical: 5, borderRadius: radii.pill, backgroundColor: 'rgba(9,13,32,0.78)', borderWidth: 1, borderColor: 'rgba(241,78,155,0.5)' },
  templateBadgeText: { color: palette.pink, fontSize: 13, fontWeight: '900' },
  recipeCardCopy: { padding: spacing.sm },
  recipeCardTitle: { color: palette.text, fontSize: 16, lineHeight: 21, fontWeight: '800' },
  recipeCardMeta: { color: palette.textMuted, fontSize: 13, lineHeight: 18, marginTop: 4 },
  searchField: { minHeight: 48, borderRadius: radii.md, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panelSoft, paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  searchInput: { color: palette.text, flex: 1, fontSize: 16, paddingVertical: spacing.sm },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  muted: { color: palette.textMuted, fontSize: 16 },
  empty: { padding: spacing.xl, alignItems: 'center', gap: spacing.sm },
  emptyTitle: { color: palette.text, fontSize: 19, fontWeight: '800' },
  emptyMessage: { color: palette.textMuted, fontSize: 16, lineHeight: 24, textAlign: 'center', marginBottom: spacing.sm },
});
