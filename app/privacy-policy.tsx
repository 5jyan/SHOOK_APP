import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ModalHeader } from '@/components/AppHeader';

export default function PrivacyPolicyScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ModalHeader title="개인정보처리방침" />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.metaInfo}>
          <Text style={styles.metaText}>시행일: 2025년 1월 3일</Text>
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
            Google 로그인을 통해 다음 정보를 수집합니다:
          </Text>
          <Text style={styles.subText}>
            • 이메일 주소{'\n'}
            • 이름{'\n'}
            • 프로필 사진{'\n'}
            • 서비스 이용 기록
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. 개인정보의 보유 및 이용기간</Text>
          <Text style={styles.text}>
            회원 탈퇴 시 또는 목적 달성 시까지 보유하며, 탈퇴 후 30일 내에 완전 삭제됩니다.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. 개인정보의 제3자 제공</Text>
          <Text style={styles.text}>
            회사는 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만, 다음의 경우는 예외입니다:
          </Text>
          <Text style={styles.subText}>
            • 이용자가 사전에 동의한 경우{'\n'}
            • 법령의 규정에 의한 경우{'\n'}
            • 서비스 제공을 위해 필요한 경우 (Google, YouTube API)
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. 개인정보 처리의 위탁</Text>
          <Text style={styles.text}>
            서비스 운영을 위해 다음 업체에 개인정보 처리를 위탁합니다:
          </Text>
          <Text style={styles.subText}>
            • Google (로그인 및 YouTube API){'\n'}
            • 클라우드 서비스 제공업체 (데이터 저장)
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
            • 앱 설정에서 직접 관리 가능
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
            연락처: 앱 내 설정 메뉴
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            개인정보 침해신고는 개인정보보호위원회(privacy.go.kr) 또는 개인정보 침해신고센터(privacy.go.kr/kor/nation/report)로 신고하실 수 있습니다.
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