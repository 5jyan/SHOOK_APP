import React from 'react';
import { View, Text, ScrollView, Pressable, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';
import { cn } from '@/lib/utils';

export default function SettingsScreen() {
  const { user } = useAuthStore();
  const { signOut, isLoading } = useGoogleAuth();

  const handleLogout = () => {
    Alert.alert(
      '로그아웃',
      '정말 로그아웃하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '로그아웃',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/auth');
          },
        },
      ]
    );
  };

  const settingsItems = [
    {
      title: '알림 설정',
      description: '푸시 알림 및 알림 주기를 설정합니다',
      onPress: () => {
        // TODO: Navigate to notification settings
      },
    },
    {
      title: '계정 정보',
      description: '계정 정보를 확인하고 수정합니다',
      onPress: () => {
        // TODO: Navigate to account settings
      },
    },
    {
      title: '앱 정보',
      description: '버전 정보 및 서비스 약관을 확인합니다',
      onPress: () => {
        // TODO: Navigate to app info
      },
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 px-4">
        <View className="py-6">
          <Text className="text-2xl font-bold text-foreground mb-2">설정</Text>
          <Text className="text-muted-foreground mb-6">
            앱 설정 및 계정 관리
          </Text>

          {/* User Info */}
          <View className="bg-card rounded-lg p-4 border border-border mb-6">
            <View className="flex-row items-center space-x-4">
              {user?.picture && (
                <Image 
                  source={{ uri: user.picture }}
                  className="w-16 h-16 rounded-full"
                  resizeMode="cover"
                />
              )}
              <View className="flex-1">
                <Text className="text-lg font-semibold text-card-foreground">
                  {user?.username || 'Unknown User'}
                </Text>
                {user?.email && (
                  <Text className="text-sm text-muted-foreground">
                    {user.email}
                  </Text>
                )}
                <View className="flex-row items-center mt-1">
                  <Text className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                    Google 계정으로 로그인됨
                  </Text>
                  {user?.verified && (
                    <Text className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded ml-2">
                      인증됨
                    </Text>
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* Settings Items */}
          <View className="space-y-2 mb-6">
            {settingsItems.map((item, index) => (
              <Pressable
                key={index}
                onPress={item.onPress}
                className={cn(
                  "bg-card rounded-lg p-4 border border-border",
                  "active:bg-muted"
                )}
              >
                <Text className="text-card-foreground font-medium mb-1">
                  {item.title}
                </Text>
                <Text className="text-muted-foreground text-sm">
                  {item.description}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Logout Button */}
          <Pressable
            onPress={handleLogout}
            disabled={isLoading}
            className={cn(
              "bg-destructive rounded-lg p-4",
              isLoading && "opacity-50"
            )}
          >
            <Text className="text-destructive-foreground font-semibold text-center">
              {isLoading ? '로그아웃 중...' : '로그아웃'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}