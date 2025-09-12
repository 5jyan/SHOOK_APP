import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ModalHeader } from '@/components/AppHeader';

export default function PrivacyPolicyScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ModalHeader title="개인정보처리방침" />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>개인정보처리방침</Text>
        
        <View style={styles.metaInfo}>
          <Text style={styles.metaText}>최종 업데이트: 2025년 1월 3일</Text>
          <Text style={styles.metaText}>시행일: 2025년 1월 3일</Text>
        </View>

        <Text style={styles.intro}>
          Shook(이하 "서비스" 또는 "앱")은 사용자의 개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 하기 위하여 다음과 같이 개인정보처리방침을 수립·공개합니다.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. 개인정보 수집 및 이용</Text>
          
          <Text style={styles.subsectionTitle}>1.1 수집하는 개인정보의 항목</Text>
          
          <Text style={styles.categoryTitle}>필수 수집 정보</Text>
          <Text style={styles.listItem}>Google 계정 정보: 이메일 주소, 이름, 프로필 사진, Google 고유 ID</Text>
          <Text style={styles.listItem}>기기 정보: 기기 식별자, 플랫폼 정보 (iOS/Android), 앱 버전</Text>
          <Text style={styles.listItem}>푸시 알림 정보: FCM 토큰 (알림 전송용)</Text>

          <Text style={styles.categoryTitle}>선택 수집 정보</Text>
          <Text style={styles.listItem}>YouTube 채널 구독 정보: 사용자가 모니터링을 요청한 채널 목록</Text>
          <Text style={styles.listItem}>앱 사용 기록: 마지막 동기화 시간, 캐시 사용 통계</Text>
          <Text style={styles.listItem}>오류 로그: 앱 개선을 위한 익명화된 오류 정보</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. AI 처리 및 외부 서비스 이용</Text>
          
          <Text style={styles.categoryTitle}>YouTube Data API v3 이용</Text>
          <Text style={styles.listItem}>목적: 공개 채널 정보 및 영상 메타데이터 수집</Text>
          <Text style={styles.listItem}>처리 데이터: 채널명, 영상 제목, 업로드 날짜 (공개 정보만)</Text>
          <Text style={styles.listItem}>개인정보 전송: 없음 (공개 API 사용)</Text>

          <Text style={styles.categoryTitle}>AI 요약 서비스 (Anthropic Claude)</Text>
          <Text style={styles.listItem}>목적: 영상 내용 요약 생성</Text>
          <Text style={styles.listItem}>전송 데이터: 영상 제목, 자막 텍스트 (개인정보 미포함)</Text>
          <Text style={styles.listItem}>처리 방식: 실시간 처리 후 즉시 삭제</Text>
          <Text style={styles.listItem}>개인식별 정보: 전송되지 않음</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. 사용자의 권리 및 행사 방법</Text>
          
          <Text style={styles.categoryTitle}>앱 내에서 직접 관리</Text>
          <Text style={styles.listItem}>계정 정보 확인: 설정 {'>'} 계정 정보</Text>
          <Text style={styles.listItem}>구독 채널 관리: 채널 탭에서 추가/삭제</Text>
          <Text style={styles.listItem}>알림 설정 변경: 설정 {'>'} 알림 설정</Text>
          <Text style={styles.listItem}>캐시 삭제: 설정 {'>'} 저장공간 관리</Text>
          
          <Text style={styles.categoryTitle}>이메일을 통한 요청</Text>
          <Text style={styles.listItem}>개인정보 열람, 정정 및 삭제, 처리 정지, 계정 완전 삭제</Text>
          <Text style={styles.listItem}>연락처: privacy@shookapp.com</Text>
          <Text style={styles.listItem}>처리 기간: 요청 후 10일 이내</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. 개인정보 보호 조치</Text>
          
          <Text style={styles.categoryTitle}>기술적 보호조치</Text>
          <Text style={styles.listItem}>전송 암호화: 모든 데이터 전송 시 TLS 1.3 암호화 적용</Text>
          <Text style={styles.listItem}>저장 암호화: 데이터베이스 암호화 저장 (AES-256)</Text>
          <Text style={styles.listItem}>접근 제어: IP 기반 접근 제한, 다단계 인증</Text>
          <Text style={styles.listItem}>보안 모니터링: AWS CloudWatch를 통한 실시간 보안 감시</Text>

          <Text style={styles.categoryTitle}>관리적 보호조치</Text>
          <Text style={styles.listItem}>접근 권한 최소화: 필요 최소한의 직원만 접근 권한 부여</Text>
          <Text style={styles.listItem}>정기 보안 교육: 개발팀 대상 분기별 보안 교육 실시</Text>
          <Text style={styles.listItem}>데이터 처리 로그: 모든 개인정보 접근 및 처리 기록 보관</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. 개인정보보호 담당자</Text>
          <Text style={styles.listItem}>성명: 박사울 (Saul Park)</Text>
          <Text style={styles.listItem}>직책: 개발자 및 서비스 운영자</Text>
          <Text style={styles.listItem}>연락처: privacy@shookapp.com</Text>
          <Text style={styles.listItem}>처리시간: 평일 오전 9시-오후 6시</Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            개인정보처리방침에 대한 문의나 의견이 있으시면 언제든지 연락해 주세요.
          </Text>
          <Text style={styles.contactEmail}>privacy@shookapp.com</Text>
          <Text style={styles.copyright}>© 2025 Shook. All rights reserved.</Text>
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
    paddingHorizontal: 24,
    paddingVertical: 32,
    paddingBottom: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  metaInfo: {
    marginBottom: 32,
  },
  metaText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  intro: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 26,
    marginBottom: 40,
  },
  section: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 24,
    letterSpacing: -0.3,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 24,
    marginBottom: 16,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginTop: 20,
    marginBottom: 12,
  },
  listItem: {
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 24,
    marginBottom: 8,
    marginLeft: 16,
  },
  footer: {
    marginTop: 40,
    paddingTop: 32,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  footerText: {
    fontSize: 15,
    color: '#6b7280',
    lineHeight: 24,
    marginBottom: 16,
  },
  contactEmail: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
    marginBottom: 24,
  },
  copyright: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
  },
});