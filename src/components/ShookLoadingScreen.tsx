import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming,
  interpolate,
  Easing
} from 'react-native-reanimated';

interface ShookLoadingScreenProps {
  message?: string;
}

export function ShookLoadingScreen({ message = '로딩 중...' }: ShookLoadingScreenProps) {
  const opacity = useSharedValue(0.3);
  const scale = useSharedValue(0.9);

  React.useEffect(() => {
    // 부드러운 페이드 인/아웃 애니메이션
    opacity.value = withRepeat(
      withTiming(1, {
        duration: 1000,
        easing: Easing.inOut(Easing.ease),
      }),
      -1, // 무한 반복
      true // 역방향 반복
    );

    // 살짝 확대/축소 애니메이션
    scale.value = withRepeat(
      withTiming(1.05, {
        duration: 1200,
        easing: Easing.inOut(Easing.ease),
      }),
      -1, // 무한 반복
      true // 역방향 반복
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoContainer, animatedStyle]}>
        <Image 
          source={require('../../assets/images/Shook.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    marginBottom: 32,
  },
  logo: {
    width: 120,
    height: 120,
  },
  message: {
    fontSize: 18,
    fontWeight: '500',
    color: '#6b7280',
    textAlign: 'center',
  },
});