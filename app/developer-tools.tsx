import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ModalHeader } from '@/components/AppHeader';
import { BackendTestButton } from '@/components/BackendTestButton';
import { PushNotificationTestButton } from '@/components/PushNotificationTestButton';
import { CacheStatsButton } from '@/components/CacheStatsButton';
import { ManualMonitoringButton } from '@/components/ManualMonitoringButton';
import { UIDebuggerButton } from '@/components/UIDebuggerButton';
import { AdvancedUIDebuggerButton } from '@/components/AdvancedUIDebuggerButton';
import { GlobalDebuggerButton } from '@/components/GlobalDebuggerButton';
import { ForceCacheResetButton } from '@/components/ForceCacheResetButton';

export default function DeveloperToolsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ModalHeader title="개발자 도구" />

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.description}>
            개발 및 테스트를 위한 도구들입니다. 이 기능들은 앱의 내부 동작을 확인하고 디버깅하는 데 사용됩니다.
          </Text>

          {/* Developer Tools Section */}
          <View style={styles.toolsContainer}>
            <Text style={styles.sectionTitle}>UI 디버깅</Text>
            <GlobalDebuggerButton />
            <UIDebuggerButton />
            <AdvancedUIDebuggerButton />

            <Text style={styles.sectionTitle}>모니터링 도구</Text>
            <ManualMonitoringButton />

            <Text style={styles.sectionTitle}>백엔드 연결</Text>
            <BackendTestButton />

            <Text style={styles.sectionTitle}>푸시 알림</Text>
            <PushNotificationTestButton />

            <Text style={styles.sectionTitle}>캐시 관리</Text>
            <CacheStatsButton />
            <ForceCacheResetButton />
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