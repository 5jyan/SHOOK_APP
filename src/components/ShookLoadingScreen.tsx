import { SummaryTheme } from '@/constants/SummaryTheme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

interface ShookLoadingScreenProps {
  message?: string;
}

function LoadingBar({ delay, height }: { delay: number; height: number }) {
  const progress = useSharedValue(0);

  React.useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 460, easing: Easing.out(Easing.cubic) }),
          withTiming(0, { duration: 460, easing: Easing.in(Easing.cubic) }),
        ),
        -1,
      ),
    );
  }, [delay, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + progress.value * 0.65,
    transform: [{ scaleY: 0.62 + progress.value * 0.38 }],
  }));

  return <Animated.View style={[styles.bar, { height }, animatedStyle]} />;
}

export function ShookLoadingScreen({ message = '잠시만 기다려주세요' }: ShookLoadingScreenProps) {
  return (
    <View
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityLabel={message}
    >
      <View style={styles.loaderSurface}>
        <View style={styles.bars}>
          <LoadingBar delay={0} height={18} />
          <LoadingBar delay={130} height={28} />
          <LoadingBar delay={260} height={22} />
        </View>
      </View>
      <Text style={styles.message}>{message}</Text>
      <Text style={styles.supportingText}>콘텐츠를 준비하고 있어요</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 240,
    backgroundColor: SummaryTheme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loaderSurface: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: SummaryTheme.colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: SummaryTheme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  bars: {
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  bar: {
    width: 5,
    borderRadius: 3,
    backgroundColor: SummaryTheme.colors.textPrimary,
  },
  message: {
    color: SummaryTheme.colors.textPrimary,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  supportingText: {
    marginTop: 6,
    color: SummaryTheme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
