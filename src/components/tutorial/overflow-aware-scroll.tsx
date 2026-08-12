import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewProps } from 'react-native';

import { palette, spacing } from '@/src/theme';

const EDGE_TOLERANCE = 10;

export function OverflowAwareScroll({ children, contentContainerStyle, onContentSizeChange, onLayout, onScroll, testID = 'overflow-aware-scroll', ...props }: ScrollViewProps) {
  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const overflowing = contentHeight > viewportHeight + EDGE_TOLERANCE;
  const moreBelow = overflowing && offsetY + viewportHeight < contentHeight - EDGE_TOLERANCE;

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setViewportHeight(event.nativeEvent.layout.height);
    onLayout?.(event);
  }, [onLayout]);
  const handleContentSizeChange = useCallback((width: number, height: number) => {
    setContentHeight(height);
    onContentSizeChange?.(width, height);
  }, [onContentSizeChange]);
  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setOffsetY(Math.max(0, event.nativeEvent.contentOffset.y));
    onScroll?.(event);
  }, [onScroll]);

  return <View style={styles.root} testID={testID}>
    <View style={styles.scrollFrame}>
      <ScrollView {...props} testID={`${testID}-scroll`} style={[styles.scroll, props.style]} contentContainerStyle={[styles.content, contentContainerStyle]} showsVerticalScrollIndicator={false} persistentScrollbar={false} scrollEventThrottle={16} onLayout={handleLayout} onContentSizeChange={handleContentSizeChange} onScroll={handleScroll}>
        {children}
      </ScrollView>
      {moreBelow ? <LinearGradient pointerEvents="none" colors={['rgba(8,12,31,0)', 'rgba(8,12,31,0.96)']} style={styles.fade} /> : null}
    </View>
    {moreBelow ? <View style={styles.cueSlot} pointerEvents="none"><Text style={styles.cue} accessibilityLiveRegion="polite">More below {'\u2193'}</Text></View> : null}
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },
  scrollFrame: { flex: 1, minHeight: 0 },
  scroll: { flex: 1, minHeight: 0 },
  content: { flexGrow: 1, paddingEnd: 16, paddingBottom: spacing.lg },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 28 },
  cueSlot: { minHeight: 25, paddingVertical: 3, alignItems: 'center', justifyContent: 'center' },
  cue: { color: palette.cyan, fontSize: 13, lineHeight: 18, fontWeight: '900', letterSpacing: 0.3 },
});
