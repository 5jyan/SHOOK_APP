import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChannelsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 px-4">
        <View className="py-6">
          <Text className="text-2xl font-bold text-foreground mb-2">YouTube 채널</Text>
          <Text className="text-muted-foreground mb-6">
            모니터링할 YouTube 채널을 관리하세요
          </Text>
          
          {/* TODO: Implement channel list and management */}
          <View className="bg-card rounded-lg p-6 border border-border">
            <Text className="text-card-foreground text-center">
              채널 관리 기능이 곧 추가됩니다
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}