import { ModalHeader } from '@/components/AppHeader';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TermsOfServiceScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ModalHeader title="서비스 이용약관" />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.metaInfo}>
          <Text style={styles.metaText}>시행일: 2025년 10월 12일</Text>
          <Text style={styles.metaText}>서비스 제공자: Saul Park</Text>
          <Text style={styles.metaText}>연락처: saulpark12@gmail.com</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>제1조 (목적)</Text>
          <Text style={styles.text}>
            이 약관은 Shook(이하 "서비스")의 이용조건 및 절차, 회원과 서비스 제공자의 권리, 의무, 책임사항을 규정함을 목적으로 합니다.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>제2조 (서비스의 내용)</Text>
          <Text style={styles.text}>
            서비스 제공자는 YouTube 채널 모니터링 및 AI 요약 서비스를 제공합니다.
          </Text>
          <Text style={styles.subText}>
            • YouTube 채널 구독 및 관리{'\n'}
            • 새 영상 업로드 알림{'\n'}
            • AI 기반 영상 요약 생성{'\n'}
            • 푸시 알림 서비스
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>제3조 (회원가입)</Text>
          <Text style={styles.text}>
            카카오 계정을 통해 회원가입이 가능하며, 회원은 정확한 정보를 제공해야 합니다.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>제4조 (서비스 이용)</Text>
          <Text style={styles.text}>
            회원은 서비스를 선량한 관리자의 주의로 이용해야 하며, 다음 행위를 해서는 안 됩니다:
          </Text>
          <Text style={styles.subText}>
            • 타인의 권리 침해{'\n'}
            • 서비스의 안정성을 해치는 행위{'\n'}
            • 관련 법령 위반
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>제5조 (AI 생성 콘텐츠)</Text>
          <Text style={styles.text}>
            AI가 생성한 요약 내용의 정확성을 보장하지 않으며, 참고용으로만 사용하시기 바랍니다.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>제6조 (서비스 변경 및 중단)</Text>
          <Text style={styles.text}>
            서비스 제공자는 서비스 개선을 위해 내용을 변경하거나 일시 중단할 수 있으며, 가능한 사전에 공지합니다. 다만, 천재지변이나 긴급한 시스템 점검의 경우 사전 공지 없이 서비스를 중단할 수 있습니다.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>제7조 (면책조항)</Text>
          <Text style={styles.text}>
            서비스 제공자는 다음의 경우 책임을 지지 않습니다:
          </Text>
          <Text style={styles.subText}>
            • 천재지변, 전쟁, 불가항력적 사유{'\n'}
            • YouTube API 등 외부 서비스의 장애{'\n'}
            • 회원의 귀책사유로 인한 서비스 이용 장애{'\n'}
            • AI 생성 콘텐츠의 부정확성
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>제8조 (약관 변경)</Text>
          <Text style={styles.text}>
            약관 변경 시 앱 내 공지를 통해 최소 7일 전에 알려드리며, 계속 이용하시면 변경된 약관에 동의한 것으로 봅니다. 중요한 변경사항은 30일 전에 공지합니다.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>제9조 (분쟁 해결)</Text>
          <Text style={styles.text}>
            서비스 이용과 관련한 분쟁은 양 당사자 간 합의로 해결하며, 합의가 이루어지지 않을 경우 대한민국 법에 따라 해석되고 관할법원은 민사소송법에 따릅니다.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>제10조 (문의 및 고객지원)</Text>
          <Text style={styles.text}>
            서비스 이용 관련 문의사항은 다음으로 연락해주시기 바랍니다:
          </Text>
          <Text style={styles.subText}>
            • 이메일: saulpark12@gmail.com{'\n'}
            • 앱 내 설정 메뉴를 통한 문의
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            본 약관은 2025년 1월 3일부터 적용됩니다.
          </Text>
          <Text style={styles.copyright}>© 2025 Shook by Saul Park. All rights reserved.</Text>
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
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  metaInfo: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  metaText: {
    fontSize: 14,
    color: '#666666',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  text: {
    fontSize: 14,
    color: '#555555',
    lineHeight: 20,
    marginBottom: 8,
  },
  subText: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginLeft: 12,
  },
  footer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  footerText: {
    fontSize: 13,
    color: '#888888',
    lineHeight: 18,
    marginBottom: 12,
  },
  copyright: {
    fontSize: 12,
    color: '#aaaaaa',
    textAlign: 'center',
  },
});