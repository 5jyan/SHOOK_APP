import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { BackendTestButton } from '@/components/BackendTestButton';
import { PushNotificationTestButton } from '@/components/PushNotificationTestButton';
import { CacheStatsButton } from '@/components/CacheStatsButton';
import { ManualMonitoringButton } from '@/components/ManualMonitoringButton';
import { TouchableOpacity } from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';

export default function DeveloperToolsScreen() {
  const handleBackPress = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>개발자 도구</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.description}>
            개발 및 테스트를 위한 도구들입니다. 이 기능들은 앱의 내부 동작을 확인하고 디버깅하는 데 사용됩니다.
          </Text>

          {/* Developer Tools Section */}
          <View style={styles.toolsContainer}>
            <Text style={styles.sectionTitle}>모니터링 도구</Text>
            <ManualMonitoringButton />
            
            <Text style={styles.sectionTitle}>백엔드 연결</Text>
            <BackendTestButton />
            
            <Text style={styles.sectionTitle}>푸시 알림</Text>
            <PushNotificationTestButton />
            
            <Text style={styles.sectionTitle}>캐시 관리</Text>
            <CacheStatsButton />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
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
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  placeholder: {
    width: 32, // Same width as back button for centering
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  content: {
    paddingVertical: 24,
  },
  description: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 24,
    marginBottom: 32,
    textAlign: 'center',
  },
  toolsContainer: {
    gap: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
});