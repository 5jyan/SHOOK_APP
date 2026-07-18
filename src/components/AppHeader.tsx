import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SummaryTheme } from '@/constants/SummaryTheme';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type HeaderVariant = 'tab' | 'modal';

interface AppHeaderProps {
  title: string;
  titlePrefix?: React.ReactNode;
  variant?: HeaderVariant;
  rightComponent?: React.ReactNode;
  onBackPress?: () => void;
}

export function AppHeader({
  title,
  titlePrefix,
  variant = 'tab',
  rightComponent,
  onBackPress
}: AppHeaderProps) {
  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  if (variant === 'tab') {
    return (
      <View style={[styles.header, styles.tabHeader]}>
        {/* Tab Layout: Title left, Optional button right */}
        <View style={styles.tabTitleRow}>
          {titlePrefix}
          <Text style={[styles.title, styles.tabTitle]} numberOfLines={1}>
            {title}
          </Text>
        </View>
        <View style={styles.rightContainer}>
          {rightComponent || <View style={styles.placeholder} />}
        </View>
      </View>
    );
  }

  // Subpage layout: same visual rhythm as the tab header, with back navigation.
  return (
    <View style={[styles.header, styles.modalHeader]}>
      <View style={styles.modalTitleRow}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="뒤로가기"
          onPress={handleBackPress}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back-ios-new" size={24} color={SummaryTheme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, styles.modalTitle]} numberOfLines={1}>
          {title}
        </Text>
      </View>

      {/* Right Side - Optional Button */}
      <View style={styles.rightContainer}>
        {rightComponent || <View style={styles.placeholder} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: SummaryTheme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: SummaryTheme.colors.border,
  },
  modalHeader: {
    minHeight: 68,
    backgroundColor: SummaryTheme.colors.background,
    borderBottomWidth: 0,
  },
  tabHeader: {
    backgroundColor: SummaryTheme.colors.background,
    borderBottomWidth: 0,
  },
  modalTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  rightContainer: {
    minWidth: 44,
    alignItems: 'flex-end',
  },
  title: {
    fontWeight: 'bold',
    color: SummaryTheme.colors.textPrimary,
  },
  tabTitle: {
    fontSize: 26,
    lineHeight: 34,
    letterSpacing: -0.6,
  },
  tabTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  modalTitle: {
    flexShrink: 1,
    fontSize: 26,
    lineHeight: 34,
    letterSpacing: -0.6,
  },
  backButton: {
    width: 36,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginLeft: -8,
    marginRight: 4,
  },
  placeholder: {
    width: 24,
    height: 24,
  },
});

// Pre-configured header variants for convenience
export const TabHeader = (props: Omit<AppHeaderProps, 'variant'>) => (
  <AppHeader {...props} variant="tab" />
);

export const ModalHeader = (props: Omit<AppHeaderProps, 'variant'>) => (
  <AppHeader {...props} variant="modal" />
);
