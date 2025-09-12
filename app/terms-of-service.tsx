import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ModalHeader } from '@/components/AppHeader';

export default function TermsOfServiceScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ModalHeader title="서비스 이용약관" />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>서비스 이용약관</Text>
        
        <View style={styles.metaInfo}>
          <Text style={styles.metaText}>최종 업데이트: 2025년 1월 3일</Text>
          <Text style={styles.metaText}>시행일: 2025년 1월 3일</Text>
        </View>

        <Text style={styles.intro}>
          본 약관은 Shook 서비스(이하 "서비스")의 이용과 관련하여 서비스 제공자와 이용자 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. 서비스 소개 및 정의</Text>
          
          <Text style={styles.categoryTitle}>서비스 정의</Text>
          <Text style={styles.description}>
            Shook은 YouTube 채널을 모니터링하여 새로운 영상 업로드 시 AI 기반 요약을 제공하고, 실시간 알림을 통해 사용자에게 전달하는 모바일 애플리케이션 서비스입니다.
          </Text>
          
          <Text style={styles.categoryTitle}>주요 용어</Text>
          <Text style={styles.listItem}>"서비스": Shook 모바일 앱 및 관련 웹 서비스</Text>
          <Text style={styles.listItem}>"사용자" 또는 "이용자": 서비스를 이용하는 개인</Text>
          <Text style={styles.listItem}>"계정": Google OAuth를 통해 생성된 사용자 식별 정보</Text>
          <Text style={styles.listItem}>"구독": 특정 YouTube 채널의 새 영상 알림을 받기 위한 설정</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. 서비스 제공 및 변경</Text>
          
          <Text style={styles.categoryTitle}>핵심 기능</Text>
          <Text style={styles.listItem}>YouTube 채널 구독 및 모니터링</Text>
          <Text style={styles.listItem}>새 영상 업로드 실시간 감지</Text>
          <Text style={styles.listItem}>AI 기반 영상 내용 요약 (한국어)</Text>
          <Text style={styles.listItem}>푸시 알림을 통한 즉시 알림</Text>
          <Text style={styles.listItem}>요약 히스토리 관리 및 검색</Text>

          <Text style={styles.categoryTitle}>서비스 제공 한계</Text>
          <Text style={styles.listItem}>YouTube API 의존: YouTube 정책 변경 시 영향 받을 수 있음</Text>
          <Text style={styles.listItem}>AI 요약 품질: 완벽하지 않을 수 있으며, 참고용으로만 활용</Text>
          <Text style={styles.listItem}>실시간성: 네트워크 상황에 따라 알림 지연 가능</Text>
          <Text style={styles.listItem}>언어 지원: 한국어 요약 최적화 (기타 언어는 품질 제한적)</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. AI 요약 서비스 특약</Text>
          
          <Text style={styles.categoryTitle}>요약 방식</Text>
          <Text style={styles.listItem}>입력 데이터: YouTube 영상 제목 + 자막 (사용 가능한 경우)</Text>
          <Text style={styles.listItem}>AI 모델: Anthropic Claude (최신 버전)</Text>
          <Text style={styles.listItem}>요약 언어: 한국어 (영상 원언어 무관)</Text>
          <Text style={styles.listItem}>요약 길이: 100-300자 내외</Text>

          <Text style={styles.categoryTitle}>주의사항</Text>
          <Text style={styles.listItem}>정확성 보장 불가: AI가 생성한 요약이므로 오류 가능성 존재</Text>
          <Text style={styles.listItem}>주관적 해석: AI의 관점에서 요약된 내용일 수 있음</Text>
          <Text style={styles.listItem}>원본 확인 권장: 중요한 정보는 반드시 원본 영상 확인</Text>
          <Text style={styles.listItem}>책임 제한: 요약 내용의 부정확성에 대한 책임 제한</Text>

          <Text style={styles.categoryTitle}>이용 규칙</Text>
          <Text style={styles.listItem}>개인적 이용: 개인의 학습 및 정보 취득 목적으로만 사용</Text>
          <Text style={styles.listItem}>상업적 이용 금지: 요약 내용의 재판매, 재배포 금지</Text>
          <Text style={styles.listItem}>저작권 준수: 원본 영상 제작자의 권리 존중</Text>
          <Text style={styles.listItem}>인용 시 출처 표기: 요약 내용 인용 시 원본 영상 링크 필수 표기</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. 사용자의 권리와 의무</Text>
          
          <Text style={styles.categoryTitle}>사용자의 권리</Text>
          <Text style={styles.listItem}>약관에 따른 서비스 무료 이용</Text>
          <Text style={styles.listItem}>개인정보 자기결정권 행사</Text>
          <Text style={styles.listItem}>서비스 품질에 대한 의견 제시</Text>
          <Text style={styles.listItem}>계정 삭제 및 서비스 탈퇴</Text>

          <Text style={styles.categoryTitle}>금지 행위</Text>
          <Text style={styles.listItem}>타인 계정 무단 사용, 계정 양도/판매</Text>
          <Text style={styles.listItem}>서비스 해킹, 역공학, 자동화 도구 사용</Text>
          <Text style={styles.listItem}>AI 요약 내용의 상업적 재배포</Text>
          <Text style={styles.listItem}>과도한 API 호출, 서비스 부하 유발 행위</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. 요금 및 결제</Text>
          
          <Text style={styles.categoryTitle}>현재 요금 정책</Text>
          <Text style={styles.listItem}>기본 서비스: 완전 무료 제공</Text>
          <Text style={styles.listItem}>광고: 현재 없음 (향후 도입 가능성 있음)</Text>
          <Text style={styles.listItem}>프리미엄 기능: 계획 중 (유료화 시 30일 전 공지)</Text>

          <Text style={styles.categoryTitle}>향후 유료화 정책</Text>
          <Text style={styles.listItem}>기존 사용자: 일정 기간 무료 혜택 제공 예정</Text>
          <Text style={styles.listItem}>기본 기능: 계속 무료 제공 (구독, 기본 요약)</Text>
          <Text style={styles.listItem}>프리미엄 기능: 고급 요약, 통계, 무제한 구독 등</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. 책임 및 면책</Text>
          
          <Text style={styles.categoryTitle}>서비스 제공자의 책임</Text>
          <Text style={styles.listItem}>서비스의 안정적 제공을 위한 최선의 노력</Text>
          <Text style={styles.listItem}>개인정보 보호 및 보안 조치 이행</Text>
          <Text style={styles.listItem}>사용자 문의에 대한 신속한 대응</Text>
          <Text style={styles.listItem}>서비스 중단 시 사전 공지</Text>

          <Text style={styles.categoryTitle}>면책 사항</Text>
          <Text style={styles.listItem}>AI 요약 정확성: AI 생성 콘텐츠의 오류나 부정확성</Text>
          <Text style={styles.listItem}>외부 서비스: YouTube, Google 등 외부 서비스 장애</Text>
          <Text style={styles.listItem}>사용자 과실: 잘못된 사용으로 인한 손해</Text>
          <Text style={styles.listItem}>불가항력: 천재지변, 법령 변경 등으로 인한 서비스 중단</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. 고객 지원 및 연락처</Text>
          <Text style={styles.listItem}>일반 문의: support@shookapp.com</Text>
          <Text style={styles.listItem}>개인정보 관련: privacy@shookapp.com</Text>
          <Text style={styles.listItem}>기술 지원: tech@shookapp.com</Text>
          <Text style={styles.listItem}>응답 시간: 평일 24시간 이내, 주말 48시간 이내</Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.categoryTitle}>준거법 및 관할법원</Text>
          <Text style={styles.listItem}>준거법: 대한민국 법률</Text>
          <Text style={styles.listItem}>관할법원: 서울중앙지방법원</Text>
          <Text style={styles.listItem}>국제 사용자: 현지 법률과 충돌 시 현지법 우선 적용</Text>
          
          <Text style={styles.footerText}>
            사용자의 권익 보호와 안전한 서비스 이용을 위해 본 약관을 충분히 읽어보시고 동의해 주시기 바랍니다.
          </Text>
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
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginTop: 20,
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 24,
    marginBottom: 16,
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
    marginTop: 24,
  },
  copyright: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
  },
});