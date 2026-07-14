import { ModalHeader } from '@/components/AppHeader';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PrivacyPolicyScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ModalHeader title="개인정보처리방침" />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.metaInfo}>
          <Text style={styles.metaText}>시행일: 2026년 7월 15일</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. 개인정보의 처리목적</Text>
          <Text style={styles.text}>
            Shook은 다음의 목적을 위하여 개인정보를 처리합니다:
          </Text>
          <Text style={styles.subText}>
            • 회원 관리 및 서비스 제공{'\n'}
            • YouTube 채널 구독 관리{'\n'}
            • AI 요약 서비스 제공{'\n'}
            • 푸시 알림 발송
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. 수집하는 개인정보</Text>
          <Text style={styles.text}>
            서비스 이용 과정에서 다음 정보를 처리합니다:
          </Text>
          <Text style={styles.subText}>
            • 카카오 연동 시 카카오 계정 식별자와 이메일 주소{'\n'}
            • 앱이 생성한 임의의 기기 식별자{'\n'}
            • 구독 채널과 서비스 이용 기록{'\n'}
            • Expo 푸시 토큰, 플랫폼 및 앱 버전
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. 개인정보의 보유 및 이용기간</Text>
          <Text style={styles.text}>
            서비스 제공 기간 동안 보유하며, 회원 탈퇴 시 계정 식별 정보, 구독 관계와 푸시 토큰을 삭제합니다. 법령상 보존 의무가 있는 정보는 해당 기간 동안 분리 보관 후 삭제합니다.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. 개인정보의 제3자 제공</Text>
          <Text style={styles.text}>
            회사는 이용자의 개인정보를 판매하지 않습니다. 서비스 제공에 필요한 범위에서 다음 외부 서비스를 이용합니다:
          </Text>
          <Text style={styles.subText}>
            • 카카오: 계정 로그인 및 연동{'\n'}
            • YouTube API: 공개 채널·영상 정보 조회{'\n'}
            • OpenAI: 영상 자막의 요약 생성{'\n'}
            • Expo: 푸시 알림 전달
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. 개인정보 처리의 위탁</Text>
          <Text style={styles.text}>
            서비스 운영을 위해 다음 업체에 개인정보 처리를 위탁합니다:
          </Text>
          <Text style={styles.subText}>
            • 카카오 (소셜 로그인){'\n'}
            • 데이터베이스 및 서버 인프라 제공업체{'\n'}
            • Expo, YouTube 및 OpenAI
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. 정보주체의 권리</Text>
          <Text style={styles.text}>
            언제든지 다음 권리를 행사할 수 있습니다:
          </Text>
          <Text style={styles.subText}>
            • 개인정보 열람, 정정·삭제 요구{'\n'}
            • 개인정보 처리정지 요구{'\n'}
            • 게스트 계정을 포함하여 앱 설정에서 회원 탈퇴 가능{'\n'}
            • 앱에 접근할 수 없는 경우 이메일로 삭제 요청 가능
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. 개인정보의 안전성 확보조치</Text>
          <Text style={styles.text}>
            개인정보 보호를 위해 다음과 같은 조치를 취하고 있습니다:
          </Text>
          <Text style={styles.subText}>
            • 데이터 암호화{'\n'}
            • 접근권한 제한{'\n'}
            • 정기적 보안점검{'\n'}
            • 개인정보 처리자 교육
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. 개인정보 보호책임자</Text>
          <Text style={styles.text}>
            개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리를 담당합니다.
          </Text>
          <Text style={styles.subText}>
            • 서비스명: Shook{'\n'}
            • 개발자: Saul Park{'\n'}
            • 이메일: saulpark12@gmail.com{'\n'}
            • 문의: 앱 내 설정 메뉴
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. 개인정보 침해 구제방법</Text>
          <Text style={styles.text}>
            개인정보 침해에 대한 신고나 상담이 필요하신 경우 아래 기관에 문의하실 수 있습니다:
          </Text>
          <Text style={styles.subText}>
            • 개인정보 침해신고센터: (국번없이) 118{'\n'}
            • 개인정보분쟁조정위원회: 1833-6972{'\n'}
            • 대검찰청 사이버범죄수사단: 02-3480-3573{'\n'}
            • 경찰청 사이버안전국: (국번없이) 182
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            본 개인정보처리방침은 2026년 7월 15일부터 적용됩니다.
          </Text>
          <Text style={styles.copyright}>© 2026 Shook by Saul Park. All rights reserved.</Text>
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
