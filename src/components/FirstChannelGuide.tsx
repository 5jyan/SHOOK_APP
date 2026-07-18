import { SummaryTheme } from '@/constants/SummaryTheme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface FirstChannelGuideProps {
  visible: boolean;
  onConfirm: () => void;
}

export function FirstChannelGuide({ visible, onConfirm }: FirstChannelGuideProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onConfirm}
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityRole="button"
          accessibilityLabel="안내 닫기"
          onPress={onConfirm}
        />
        <View
          testID="first-channel-guide"
          accessibilityViewIsModal
          style={[styles.sheet, { paddingBottom: Math.max(20, insets.bottom + 12) }]}
        >
          <View style={styles.handle} />
          <View style={styles.iconSurface}>
            <MaterialCommunityIcons name="check" size={22} color={SummaryTheme.colors.onAccent} />
          </View>
          <Text style={styles.title}>채널을 추가했어요</Text>
          <Text style={styles.description}>
            최근 영상 최대 3개의 요약을 먼저 준비해요. 이후 새 영상도 자동으로 요약하고, 완료되면 알려드릴게요.
          </Text>
          <Pressable
            testID="first-channel-guide-confirm"
            accessibilityRole="button"
            onPress={onConfirm}
            style={({ pressed }) => [styles.confirmButton, pressed && styles.confirmButtonPressed]}
          >
            <Text style={styles.confirmButtonText}>확인</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: SummaryTheme.colors.scrim,
  },
  sheet: {
    width: '100%',
    maxWidth: 752,
    alignSelf: 'center',
    alignItems: 'center',
    paddingTop: 10,
    paddingHorizontal: 24,
    backgroundColor: SummaryTheme.colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: SummaryTheme.colors.border,
  },
  handle: {
    width: 36,
    height: 4,
    marginBottom: 22,
    borderRadius: 2,
    backgroundColor: SummaryTheme.colors.border,
  },
  iconSurface: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: SummaryTheme.colors.accent,
  },
  title: {
    color: SummaryTheme.colors.textPrimary,
    fontSize: 21,
    lineHeight: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  description: {
    maxWidth: 360,
    marginTop: 10,
    color: SummaryTheme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
  },
  confirmButton: {
    width: '100%',
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    borderRadius: 16,
    backgroundColor: SummaryTheme.colors.accent,
  },
  confirmButtonPressed: { opacity: 0.78 },
  confirmButtonText: {
    color: SummaryTheme.colors.onAccent,
    fontSize: 16,
    fontWeight: '800',
  },
});
