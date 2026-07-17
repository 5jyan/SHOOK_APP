import { IconSymbol } from '@/components/ui/IconSymbol';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type HeaderVariant = 'tab' | 'modal';

interface AppHeaderProps {
  title: string;
  variant?: HeaderVariant;
  rightComponent?: React.ReactNode;
  onBackPress?: () => void;
}

export function AppHeader({
  title,
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
      <View style={styles.header}>
        {/* Tab Layout: Title left, Optional button right */}
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.rightContainer}>
          {rightComponent || <View style={styles.placeholder} />}
        </View>
      </View>
    );
  }

  // Modal Layout: Back button left, Title center, Optional button right
  return (
    <View style={[styles.header, styles.modalHeader]}>
      {/* Left Side - Back Button */}
      <View style={styles.leftContainer}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="뒤로가기"
          onPress={handleBackPress}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back-ios-new" size={32} color="#374151" />
        </TouchableOpacity>
      </View>

      {/* Center - Title */}
      <View style={styles.titleContainer}>
        <Text style={styles.title} numberOfLines={1}>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalHeader: {
    paddingVertical: 4,
  },
  leftContainer: {
    width: 44,
    alignItems: 'flex-start',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  rightContainer: {
    minWidth: 44,
    alignItems: 'flex-end',
  },
  // Unified title style - 20px for all variants
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginLeft: -10,
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
