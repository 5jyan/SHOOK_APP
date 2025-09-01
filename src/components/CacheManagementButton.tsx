// Enhanced Cache Management Button for Development
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Alert,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { videoCacheService } from '@/services/video-cache-enhanced';
import { cacheValidator } from '@/services/cache/CacheValidator';
import { cacheRecovery } from '@/services/cache/CacheRecovery';

interface CacheStatus {
  stats: any;
  validation: any;
  isLoading: boolean;
}

export function CacheManagementButton() {
  const [isVisible, setIsVisible] = useState(false);
  const [cacheStatus, setCacheStatus] = useState<CacheStatus>({
    stats: null,
    validation: null,
    isLoading: false
  });

  const refreshCacheStatus = useCallback(async () => {
    setCacheStatus(prev => ({ ...prev, isLoading: true }));
    
    try {
      const [stats, validation] = await Promise.all([
        videoCacheService.getCacheStats(),
        cacheValidator.validateCache()
      ]);
      
      setCacheStatus({
        stats,
        validation,
        isLoading: false
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to load cache status');
      setCacheStatus(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const handleClearCache = useCallback(async () => {
    Alert.alert(
      'Clear Cache',
      'Are you sure you want to clear all cached data?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await videoCacheService.clearCache();
              Alert.alert('Success', 'Cache cleared successfully');
              refreshCacheStatus();
            } catch (error) {
              Alert.alert('Error', 'Failed to clear cache');
            }
          }
        }
      ]
    );
  }, [refreshCacheStatus]);

  const handleValidateAndRepair = useCallback(async () => {
    Alert.alert(
      'Validate & Repair',
      'This will validate the cache and attempt to repair any issues found.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Proceed',
          onPress: async () => {
            try {
              const success = await videoCacheService.validateAndRepair();
              Alert.alert(
                success ? 'Success' : 'Warning',
                success ? 'Cache validation and repair completed' : 'Some issues could not be repaired'
              );
              refreshCacheStatus();
            } catch (error) {
              Alert.alert('Error', 'Validation and repair failed');
            }
          }
        }
      ]
    );
  }, [refreshCacheStatus]);

  const formatFileSize = (kb: number): string => {
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const formatDate = (timestamp: number): string => {
    if (timestamp === 0) return 'Never';
    return new Date(timestamp).toLocaleString();
  };

  const getValidationStatusColor = (status: string): string => {
    switch (status) {
      case 'healthy': return '#10b981';
      case 'warning': return '#f59e0b';
      case 'corrupted': return '#ef4444';
      default: return '#6b7280';
    }
  };

  if (!__DEV__) {
    return null; // Only show in development
  }

  return (
    <>
      <Pressable
        style={styles.triggerButton}
        onPress={() => {
          setIsVisible(true);
          refreshCacheStatus();
        }}
      >
        <Text style={styles.triggerButtonText}>📦 Cache</Text>
      </Pressable>

      {isVisible && (
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.header}>
              <Text style={styles.title}>Enhanced Cache Management</Text>
              <Pressable
                style={styles.closeButton}
                onPress={() => setIsVisible(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.content}>
              {cacheStatus.isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#4285f4" />
                  <Text style={styles.loadingText}>Loading cache status...</Text>
                </View>
              ) : (
                <>
                  {/* Cache Statistics */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📊 Cache Statistics</Text>
                    {cacheStatus.stats && (
                      <View style={styles.statsGrid}>
                        <View style={styles.statItem}>
                          <Text style={styles.statLabel}>Entries</Text>
                          <Text style={styles.statValue}>{cacheStatus.stats.totalEntries}</Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text style={styles.statLabel}>Size</Text>
                          <Text style={styles.statValue}>{formatFileSize(cacheStatus.stats.cacheSize)}</Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text style={styles.statLabel}>Status</Text>
                          <Text style={[
                            styles.statValue,
                            { color: getValidationStatusColor(cacheStatus.stats.validationStatus) }
                          ]}>
                            {cacheStatus.stats.validationStatus}
                          </Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text style={styles.statLabel}>Last Sync</Text>
                          <Text style={styles.statValueSmall}>{formatDate(cacheStatus.stats.lastSync)}</Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text style={styles.statLabel}>Last Validation</Text>
                          <Text style={styles.statValueSmall}>{formatDate(cacheStatus.stats.lastValidation)}</Text>
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Validation Results */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🔍 Validation Results</Text>
                    {cacheStatus.validation && (
                      <>
                        <View style={styles.validationOverview}>
                          <Text style={[
                            styles.validationStatus,
                            { color: cacheStatus.validation.isValid ? '#10b981' : '#ef4444' }
                          ]}>
                            {cacheStatus.validation.isValid ? '✓ Valid' : '⚠ Issues Found'}
                          </Text>
                          <Text style={styles.validationDetails}>
                            {cacheStatus.validation.issues.length} issues, {cacheStatus.validation.metrics.entriesChecked} entries checked
                          </Text>
                        </View>

                        {cacheStatus.validation.issues.length > 0 && (
                          <View style={styles.issuesList}>
                            <Text style={styles.issuesHeader}>Issues:</Text>
                            {cacheStatus.validation.issues.slice(0, 5).map((issue: any, index: number) => (
                              <View key={index} style={styles.issueItem}>
                                <Text style={[
                                  styles.issueSeverity,
                                  { 
                                    color: issue.severity === 'critical' ? '#ef4444' : 
                                          issue.severity === 'warning' ? '#f59e0b' : '#6b7280'
                                  }
                                ]}>
                                  {issue.severity.toUpperCase()}
                                </Text>
                                <Text style={styles.issueMessage}>{issue.message}</Text>
                              </View>
                            ))}
                            {cacheStatus.validation.issues.length > 5 && (
                              <Text style={styles.moreIssues}>
                                ... and {cacheStatus.validation.issues.length - 5} more issues
                              </Text>
                            )}
                          </View>
                        )}
                      </>
                    )}
                  </View>

                  {/* Actions */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🔧 Actions</Text>
                    <View style={styles.actionButtons}>
                      <Pressable style={styles.actionButton} onPress={refreshCacheStatus}>
                        <Text style={styles.actionButtonText}>🔄 Refresh</Text>
                      </Pressable>
                      <Pressable style={[styles.actionButton, styles.warningButton]} onPress={handleValidateAndRepair}>
                        <Text style={styles.actionButtonText}>🔧 Validate & Repair</Text>
                      </Pressable>
                      <Pressable style={[styles.actionButton, styles.dangerButton]} onPress={handleClearCache}>
                        <Text style={styles.actionButtonText}>🗑️ Clear Cache</Text>
                      </Pressable>
                    </View>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  triggerButton: {
    position: 'absolute',
    top: 100,
    right: 16,
    backgroundColor: '#4285f4',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  triggerButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1001,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    width: '100%',
    maxHeight: '80%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#6b7280',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statItem: {
    minWidth: '45%',
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  statValueSmall: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  validationOverview: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  validationStatus: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  validationDetails: {
    fontSize: 14,
    color: '#6b7280',
  },
  issuesList: {
    marginTop: 8,
  },
  issuesHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  issueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  issueSeverity: {
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
    minWidth: 60,
    textAlign: 'center',
  },
  issueMessage: {
    flex: 1,
    fontSize: 12,
    color: '#374151',
  },
  moreIssues: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    backgroundColor: '#4285f4',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 100,
    alignItems: 'center',
  },
  warningButton: {
    backgroundColor: '#f59e0b',
  },
  dangerButton: {
    backgroundColor: '#ef4444',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});