# Shook Push Notification System 완전 분석

## 목차
1. [시스템 개요](#시스템-개요)
2. [Push Notification 발송 플로우](#push-notification-발송-플로우)
3. [Frontend 알림 해제 플로우](#frontend-알림-해제-플로우)
4. [Backend API 엔드포인트](#backend-api-엔드포인트)
5. [Database 스키마](#database-스키마)
6. [YouTube 모니터링과 알림 연동](#youtube-모니터링과-알림-연동)
7. [디버깅 가이드](#디버깅-가이드)

## 시스템 개요

Shook의 Push Notification 시스템은 **YouTube 채널 모니터링**과 **Expo Push Notification**을 연동하여 사용자에게 새로운 영상 알림을 전달합니다.

### 주요 컴포넌트
- **Frontend**: React Native + Expo Push Notifications
- **Backend**: Express.js + Expo Server SDK
- **Database**: PostgreSQL (pushTokens 테이블)
- **External Services**: YouTube Data API, Expo Push Service

---

## Push Notification 발송 플로우

### 1. YouTube 모니터링 트리거
```
YouTube RSS Feed → 새 영상 감지 → AI 요약 생성 → Push Notification 발송
```

**상세 플로우:**

#### 1.1 YouTube 모니터링 서비스 (5분마다)
```typescript
// server/services/youtube-monitor-service.ts
class YouTubeMonitorService {
  async checkAllChannels(): Promise<void> {
    // 1. 모든 활성 채널의 RSS 피드 확인
    const channels = await storage.getAllActiveChannels();
    
    for (const channel of channels) {
      // 2. RSS XML 파싱하여 새 영상 확인
      const latestVideo = await this.parseRSSFeed(channel.channelId);
      
      // 3. 새 영상이면 처리 시작
      if (latestVideo.videoId !== channel.recentVideoId) {
        await this.processNewVideo(channel.channelId, latestVideo);
      }
    }
  }
}
```

#### 1.2 새 영상 처리 파이프라인
```typescript
async processNewVideo(channelId: string, video: VideoInfo) {
  // 1. 트랜스크립트 추출 (SupaData API)
  const transcript = await supaDataService.getTranscript(video.videoId);
  
  // 2. AI 요약 생성 (OpenAI API)
  const summary = await youtubeSummaryService.generateSummary(transcript);
  
  // 3. DB에 영상 정보 저장
  await storage.createVideo({
    videoId: video.videoId,
    channelId: channelId,
    title: video.title,
    summary: summary,
    processed: true
  });
  
  // 4. 🔔 Push Notification 발송
  await pushNotificationService.sendNewVideoSummaryNotification(
    channelId, 
    {
      videoId: video.videoId,
      title: video.title,
      channelName: video.channelName,
      summary: summary
    }
  );
}
```

### 2. Push Notification 발송 과정

#### 2.1 채널 구독자들에게 발송
```typescript
// server/services/push-notification-service.ts
async sendToChannelSubscribers(channelId: string, notification: PushNotificationPayload): Promise<number> {
  // 1. 해당 채널을 구독하는 사용자들과 그들의 활성 push token 조회
  const usersWithTokens = await storage.findUsersByChannelId(channelId);
  
  let successCount = 0;
  
  // 2. 각 사용자별로 알림 발송
  for (const userWithTokens of usersWithTokens) {
    if (userWithTokens.pushTokens.length > 0) {
      const success = await this.sendToTokens(userWithTokens.pushTokens, notification);
      if (success) successCount++;
    }
  }
  
  return successCount;
}
```

#### 2.2 실제 Push Token으로 발송
```typescript
private async sendToTokens(tokens: PushToken[], notification: PushNotificationPayload): Promise<boolean> {
  // 1. 유효한 Expo Push Token 필터링
  const validTokens = tokens
    .filter(tokenRecord => {
      return Expo.isExpoPushToken(tokenRecord.token) || 
             tokenRecord.token.startsWith('ExponentPushToken[dev-') ||
             tokenRecord.token.startsWith('ExponentPushToken[fallback-');
    })
    .map(tokenRecord => tokenRecord.token);
  
  // 2. Push Message 생성
  const messages: ExpoPushMessage[] = validTokens.map(token => ({
    to: token,
    title: notification.title,
    body: notification.body,
    data: notification.data || {},
    sound: notification.sound || 'default',
    badge: notification.badge,
    priority: 'high',
  }));
  
  // 3. Real vs Mock Token 분리
  const realMessages = messages.filter(msg => Expo.isExpoPushToken(msg.to) && 
    !msg.to.startsWith('ExponentPushToken[dev-') && 
    !msg.to.startsWith('ExponentPushToken[fallback-'));
  
  const mockMessages = messages.filter(msg => 
    msg.to.startsWith('ExponentPushToken[dev-') || 
    msg.to.startsWith('ExponentPushToken[fallback-'));
  
  // 4. 실제 Push 발송 (Expo Server SDK)
  let allTickets: ExpoPushTicket[] = [];
  
  if (realMessages.length > 0) {
    const chunks = this.expo.chunkPushNotifications(realMessages);
    
    for (const chunk of chunks) {
      const tickets = await this.expo.sendPushNotificationsAsync(chunk);
      allTickets.push(...tickets);
    }
  }
  
  // 5. 개발용 Mock 알림 로깅
  if (mockMessages.length > 0) {
    console.log('🔔 Mock notifications (development):', mockMessages);
  }
  
  // 6. 에러 처리 및 비활성 토큰 정리
  await this.processTickets(allTickets, tokens);
  
  return allTickets.length > 0;
}
```

### 3. Database 조회 최적화

#### 3.1 활성 토큰만 조회
```sql
-- storage.findUsersByChannelId() 내부 쿼리
SELECT * FROM push_tokens 
WHERE user_id IN (
  SELECT user_id FROM user_channels 
  WHERE channel_id = $1
) 
AND is_active = true;
```

#### 3.2 사용자별 토큰 그룹핑
```typescript
// 사용자별로 토큰 그룹핑하여 중복 발송 방지
const userTokenMap = new Map<number, PushToken[]>();
tokens.forEach(token => {
  if (!userTokenMap.has(token.userId)) {
    userTokenMap.set(token.userId, []);
  }
  userTokenMap.get(token.userId)!.push(token);
});
```

---

## Frontend 알림 해제 플로우

### 1. 사용자가 토글을 OFF로 설정

#### 1.1 UI 이벤트 처리
```typescript
// app/notification-settings.tsx
const handleToggleNotifications = async (value: boolean) => {
  // 1. 즉시 UI 상태 업데이트 (responsive UX)
  const oldUIState = isUIEnabled;
  setUIEnabled(value, true); // true = manual toggle
  
  if (!value) {
    // 2. 알림 해제 프로세스 시작
    await processNotificationDisable(oldUIState);
  }
};
```

#### 1.2 알림 해제 프로세스
```typescript
async function processNotificationDisable(oldUIState: boolean) {
  try {
    // 1. 현재 DB 토큰 상태 확인 (BEFORE)
    const beforeStatus = await apiService.getPushTokenStatus();
    console.log('🔴 [DISABLE] Token status BEFORE:', beforeStatus.data);
    
    // 2. 백엔드 unregister 호출
    const success = await notificationService.unregisterWithBackend();
    
    // 3. 결과 확인 (AFTER)
    const afterStatus = await apiService.getPushTokenStatus();
    console.log('🔴 [DISABLE] Token status AFTER:', afterStatus.data);
    
    if (!success) {
      // 4. 실패 시 UI 상태 복원
      setUIEnabled(oldUIState);
      Alert.alert('알림 해제 실패', '다시 시도해주세요.');
    } else {
      console.log('🔴 [DISABLE] 알림 해제 성공 - 더 이상 알림이 오지 않습니다');
    }
  } catch (error) {
    // 5. 에러 시 UI 상태 복원
    setUIEnabled(oldUIState);
    Alert.alert('오류 발생', error.message);
  }
}
```

### 2. NotificationService.unregisterWithBackend()

#### 2.1 Backend API 호출
```typescript
// src/services/notification.ts
async unregisterWithBackend(): Promise<boolean> {
  try {
    const deviceId = Constants.sessionId || 'unknown';
    
    // API 서비스를 통해 unregister 요청
    const response = await apiService.unregisterPushToken(deviceId);
    
    if (response.success) {
      // 1. 로컬 저장소에서 등록 상태 제거
      await AsyncStorage.removeItem('push_token_registered');
      
      // 2. 초기화 상태 리셋
      this.isInitialized = false;
      
      // 3. Zustand Store 상태 업데이트
      useNotificationStore.getState().setRegistered(false);
      
      return true;
    } else {
      // 실패 시 Store에 에러 상태 업데이트
      useNotificationStore.getState().setRegistered(true, response.error);
      return false;
    }
  } catch (error) {
    // 예외 발생 시 Store에 에러 정보 저장
    useNotificationStore.getState().setRegistered(true, error.message);
    return false;
  }
}
```

### 3. API Service 다중 엔드포인트 시도

#### 3.1 Multiple Endpoint Fallback
```typescript
// src/services/api.ts
async unregisterPushToken(deviceId: string): Promise<ApiResponse<RegisterPushTokenResponse>> {
  const endpoints = [
    `/api/push-tokens/${deviceId}`,      // DELETE method
    `/api/push/unregister`,              // POST method  
  ];
  
  let lastResult: ApiResponse<RegisterPushTokenResponse> | null = null;
  
  // 순차적으로 시도하여 하나라도 성공하면 OK
  for (const endpoint of endpoints) {
    try {
      const result = await this.makeRequest<RegisterPushTokenResponse>(endpoint, {
        method: endpoint.includes('/unregister') ? 'POST' : 'DELETE',
        ...(endpoint.includes('/unregister') ? {
          body: JSON.stringify({ deviceId })
        } : {})
      });
      
      lastResult = result;
      
      if (result.success) {
        console.log(`✅ Successfully unregistered via ${endpoint}`);
        break;
      }
    } catch (error) {
      console.warn(`❌ Failed to unregister via ${endpoint}:`, error.message);
    }
  }
  
  return lastResult || { success: false, error: 'All unregister attempts failed' };
}
```

### 4. Zustand Store 상태 관리

#### 4.1 Manual Override 메커니즘
```typescript
// src/stores/notification-store.ts
setUIEnabled: (enabled, isManual = false) =>
  set((state) => {
    state.isUIEnabled = enabled;
    
    if (isManual) {
      // 사용자가 수동으로 토글하는 경우 자동 업데이트 방지
      state.manualUIOverride = true;
      
      // 2초 후 자동 업데이트 재개
      setTimeout(() => {
        set((state) => {
          state.manualUIOverride = false;
        });
      }, 2000);
    }
  }),
```

#### 4.2 Backend State Sync
```typescript
async syncWithBackendState(): Promise<void> {
  // 1. 백엔드에서 현재 사용자의 모든 Push Token 조회
  const response = await apiService.getPushTokenStatus();
  
  if (response.success && Array.isArray(response.data)) {
    const tokens = response.data;
    const deviceId = Constants.sessionId || 'unknown';
    
    // 2. 현재 기기의 토큰 찾기
    const currentDeviceToken = tokens.find(token => token.deviceId === deviceId);
    
    // 3. 활성화 상태 확인
    const isRegisteredInDB = currentDeviceToken && currentDeviceToken.isActive;
    
    // 4. Store 상태를 DB 상태와 동기화
    useNotificationStore.getState().setRegistered(!!isRegisteredInDB);
    
    // 5. 시스템 권한도 함께 확인
    const permissions = await Notifications.getPermissionsAsync();
    useNotificationStore.getState().setPermissionStatus(permissions.status);
  }
}
```

---

## Backend API 엔드포인트

### 1. POST /api/push-tokens (토큰 등록)
```typescript
router.post("/", isAuthenticated, async (req, res) => {
  const userId = req.user!.id;
  const { token, deviceId, platform, appVersion } = req.body;
  
  // 1. 중복/오래된 토큰 정리
  await cleanupDuplicateTokens(userId, deviceId, token);
  
  // 2. 기존 토큰 확인
  const existingTokens = await storage.getPushTokensByUserId(userId);
  const existingToken = existingTokens.find(t => t.deviceId === deviceId);
  
  if (existingToken) {
    // 3a. 기존 토큰 업데이트
    await storage.updatePushToken(deviceId, {
      token, platform, appVersion, isActive: true
    });
  } else {
    // 3b. 새 토큰 생성
    await storage.createPushToken({
      userId, token, deviceId, platform, appVersion, isActive: true
    });
  }
  
  res.json({ success: true, message: "Push token registered successfully" });
});
```

### 2. DELETE /api/push-tokens/:deviceId (토큰 삭제)
```typescript
router.delete("/:deviceId", isAuthenticated, async (req, res) => {
  const userId = req.user!.id;
  const { deviceId } = req.params;
  
  // 1. 사용자 권한 확인
  const allTokens = await storage.getPushTokensByUserId(userId);
  const existingToken = allTokens.find(t => t.deviceId === deviceId);
  
  if (!existingToken) {
    // 이미 삭제된 경우 성공 처리 (Idempotent)
    return res.json({ 
      success: true, 
      message: "Push token already deleted or not found" 
    });
  }
  
  // 2. 즉시 비활성화 (알림 전송 중단)
  await storage.markPushTokenAsInactive(deviceId);
  
  // 3. 완전 삭제
  await storage.deletePushToken(deviceId);
  
  // 4. 검증
  const remainingTokens = await storage.getPushTokensByUserId(userId);
  console.log(`User ${userId} now has ${remainingTokens.length} active tokens`);
  
  res.json({ success: true, message: "Push token deleted successfully" });
});
```

### 3. POST /api/push/unregister (대체 해제 엔드포인트)
```typescript
router.post("/unregister", isAuthenticated, async (req, res) => {
  const userId = req.user!.id;
  const { deviceId } = req.body;
  
  if (!deviceId) {
    return res.status(400).json({ 
      success: false, 
      error: "Missing required field: deviceId" 
    });
  }
  
  // DELETE 엔드포인트와 동일한 로직 수행
  const existingTokens = await storage.getPushTokensByUserId(userId);
  const existingToken = existingTokens.find(t => t.deviceId === deviceId);
  
  if (!existingToken) {
    return res.json({ 
      success: true, 
      message: "Push token already unregistered or not found" 
    });
  }
  
  await storage.markPushTokenAsInactive(deviceId);
  await storage.deletePushToken(deviceId);
  
  res.json({ success: true, message: "Push token unregistered successfully" });
});
```

### 4. GET /api/push-tokens (상태 조회)
```typescript
router.get("/", isAuthenticated, async (req, res) => {
  const userId = req.user!.id;
  const pushTokens = await storage.getPushTokensByUserId(userId);
  
  res.json({ 
    success: true, 
    data: pushTokens.map(token => ({
      id: token.id,
      deviceId: token.deviceId,
      platform: token.platform,
      appVersion: token.appVersion,
      isActive: token.isActive,
      createdAt: token.createdAt,
      updatedAt: token.updatedAt,
      tokenPrefix: token.token.substring(0, 20) + '...'  // 보안상 일부만 노출
    }))
  });
});
```

---

## Database 스키마

### pushTokens 테이블
```sql
CREATE TABLE push_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,              -- Expo Push Token
  device_id TEXT NOT NULL,          -- Constants.sessionId (기기 고유 ID)
  platform TEXT NOT NULL,          -- 'ios' | 'android' | 'web'
  app_version TEXT NOT NULL,        -- App version
  is_active BOOLEAN DEFAULT true,   -- 활성 상태
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(device_id)                 -- 기기당 하나의 토큰만
);

-- 알림 발송 시 사용하는 인덱스
CREATE INDEX idx_push_tokens_user_active ON push_tokens(user_id, is_active);
CREATE INDEX idx_push_tokens_device ON push_tokens(device_id);
```

### 주요 쿼리들
```sql
-- 1. 채널 구독자의 활성 토큰 조회 (알림 발송용)
SELECT pt.* 
FROM push_tokens pt
JOIN user_channels uc ON pt.user_id = uc.user_id
WHERE uc.channel_id = $1 AND pt.is_active = true;

-- 2. 사용자의 모든 활성 토큰 (단일 사용자 알림용)
SELECT * FROM push_tokens 
WHERE user_id = $1 AND is_active = true;

-- 3. 토큰 비활성화
UPDATE push_tokens 
SET is_active = false, updated_at = NOW() 
WHERE device_id = $1;

-- 4. 토큰 완전 삭제
DELETE FROM push_tokens WHERE device_id = $1;
```

---

## YouTube 모니터링과 알림 연동

### 1. YouTube Monitor Service
```typescript
// server/services/youtube-monitor-service.ts
class YouTubeMonitorService {
  // 5분마다 실행되는 주 스케줄러
  async startMonitoring(): Promise<void> {
    setInterval(async () => {
      await this.checkAllChannels();
    }, 5 * 60 * 1000); // 5분
  }
  
  async checkAllChannels(): Promise<void> {
    const channels = await storage.getAllActiveChannels();
    
    for (const channel of channels) {
      try {
        await this.checkChannel(channel.channelId);
      } catch (error) {
        console.error(`Error monitoring channel ${channel.channelId}:`, error);
      }
    }
  }
  
  async checkChannel(channelId: string): Promise<void> {
    // 1. RSS 피드 파싱
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const response = await fetch(rssUrl);
    const xmlText = await response.text();
    const parsedFeed = await xml2js.parseStringPromise(xmlText);
    
    // 2. 최신 비디오 추출
    const entries = parsedFeed.feed.entry || [];
    if (entries.length === 0) return;
    
    const latestEntry = entries[0];
    const videoId = latestEntry['yt:videoId'][0];
    const title = latestEntry.title[0];
    const publishedAt = latestEntry.published[0];
    
    // 3. 이미 처리된 비디오인지 확인
    const channel = await storage.getYoutubeChannel(channelId);
    if (channel?.recentVideoId === videoId) {
      return; // 이미 처리됨
    }
    
    // 4. YouTube Shorts 필터링
    const videoDetails = await this.getVideoDetails(videoId);
    if (this.isShorts(videoDetails)) {
      console.log(`Skipping Shorts video: ${videoId}`);
      await storage.updateChannelRecentVideo(channelId, videoId);
      return;
    }
    
    // 5. 새 비디오 처리 시작
    await this.processNewVideo(channelId, {
      videoId,
      title,
      publishedAt,
      channelName: channel?.title || 'Unknown Channel'
    });
  }
  
  async processNewVideo(channelId: string, video: VideoInfo): Promise<void> {
    try {
      // 1. 트랜스크립트 추출
      const transcript = await supaDataService.getTranscript(video.videoId);
      
      // 2. AI 요약 생성
      const summary = await youtubeSummaryService.generateSummary({
        title: video.title,
        transcript: transcript,
        channelName: video.channelName
      });
      
      // 3. DB에 비디오 저장
      await storage.createVideo({
        videoId: video.videoId,
        channelId: channelId,
        title: video.title,
        publishedAt: new Date(video.publishedAt),
        transcript: transcript,
        summary: summary,
        processed: true
      });
      
      // 4. 채널의 recentVideoId 업데이트
      await storage.updateChannelRecentVideo(channelId, video.videoId);
      
      // 5. 🔔 Push Notification 발송!
      const notificationsSent = await pushNotificationService.sendNewVideoSummaryNotification(
        channelId,
        {
          videoId: video.videoId,
          title: video.title,
          channelName: video.channelName,
          summary: summary
        }
      );
      
      console.log(`✅ 새 영상 처리 완료: ${video.title}`);
      console.log(`🔔 ${notificationsSent}명의 사용자에게 알림 발송됨`);
      
    } catch (error) {
      console.error(`❌ 영상 처리 실패 (${video.videoId}):`, error);
      
      // 실패해도 recentVideoId는 업데이트하여 중복 처리 방지
      await storage.updateChannelRecentVideo(channelId, video.videoId);
    }
  }
}
```

### 2. Push Notification Payload
```typescript
interface PushNotificationPayload {
  title: string;        // "📺 {채널명}"
  body: string;         // "새 영상: {영상 제목}"
  data: {
    type: 'new_video_summary';
    videoId: string;
    channelId: string;
    channelName: string;
  };
  sound: 'default';
  badge: 1;
}

// 실제 발송 예시
const notification: PushNotificationPayload = {
  title: `📺 ${videoData.channelName}`,
  body: `새 영상: ${videoData.title}`,
  data: {
    type: 'new_video_summary',
    videoId: videoData.videoId,
    channelId: channelId,
    channelName: videoData.channelName,
  },
  sound: 'default',
  badge: 1
};
```

---

## 디버깅 가이드

### 1. 알림이 오지 않는 경우 체크리스트

#### Frontend 체크
```bash
# 1. 시스템 권한 확인
await Notifications.getPermissionsAsync()
# → { status: 'granted', granted: true } 이어야 함

# 2. Store 상태 확인  
useNotificationStore.getState()
# → { isRegistered: true, isUIEnabled: true, permissionStatus: 'granted' }

# 3. Push Token 생성 확인
await notificationService.getPushToken()
# → "ExponentPushToken[xxxx...]" 형태 문자열

# 4. Backend 등록 상태 확인
await apiService.getPushTokenStatus()
# → { success: true, data: [{ deviceId: 'xxx', isActive: true, ... }] }
```

#### Backend 체크
```bash
# 1. 사용자의 활성 토큰 조회
curl -X GET http://localhost:3000/api/push-tokens \
  -H "Cookie: connect.sid=xxxxx"

# 2. 채널 구독 상태 확인
SELECT uc.*, yc.title as channel_name 
FROM user_channels uc 
JOIN youtube_channels yc ON uc.channel_id = yc.channel_id 
WHERE uc.user_id = {userId};

# 3. YouTube 모니터링 로그 확인
# Console에서 "[YOUTUBE_MONITOR]" 검색

# 4. Push 발송 로그 확인  
# Console에서 "🔔 [PushNotificationService]" 검색
```

### 2. 알림이 계속 오는 경우 체크리스트

#### Database 직접 확인
```sql
-- 사용자의 모든 Push Token 확인
SELECT * FROM push_tokens WHERE user_id = {userId};

-- 비활성화되지 않은 토큰 찾기
SELECT * FROM push_tokens WHERE user_id = {userId} AND is_active = true;

-- 중복 토큰 확인
SELECT device_id, COUNT(*) as count 
FROM push_tokens 
WHERE user_id = {userId} 
GROUP BY device_id 
HAVING COUNT(*) > 1;
```

#### Frontend Debug 도구 사용
```typescript
// 🐛 Debug: Push Token 상태 확인 버튼 사용
// → app/notification-settings.tsx의 handleDebugPushTokens() 호출
// → 실시간 DB 토큰 상태를 팝업으로 표시
```

### 3. 개발 환경 Mock Token

개발 환경에서는 실제 Expo Push Token 대신 Mock Token을 사용:

```typescript
// Mock Token 형태
"ExponentPushToken[dev-{deviceType}-{deviceId}]"
"ExponentPushToken[fallback-{deviceType}-{deviceId}]"

// 실제 발송은 하지 않고 Console에 로깅만
console.log('🔔 Mock notifications (development):', {
  token: 'ExponentPushToken[dev-...]',
  title: '📺 채널명',
  body: '새 영상: 영상제목'
});
```

### 4. Production 환경 실제 Token

```typescript
// 실제 Expo Push Token 형태
"ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"

// Expo Server SDK를 통해 실제 발송
await this.expo.sendPushNotificationsAsync([
  {
    to: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
    title: '📺 채널명',
    body: '새 영상: 영상제목',
    data: { type: 'new_video_summary', videoId: 'xxx', ... },
    sound: 'default',
    badge: 1,
    priority: 'high'
  }
]);
```

### 5. 일반적인 문제 해결

#### 5.1 토큰이 삭제되지 않는 경우
```typescript
// 강제 삭제 (개발용)
await storage.deletePushToken(deviceId);

// DB에서 직접 확인
SELECT * FROM push_tokens WHERE device_id = '{deviceId}';
```

#### 5.2 중복 토큰 문제
```typescript
// 중복 정리 함수 실행
await cleanupDuplicateTokens(userId, deviceId, newToken);

// 수동 중복 제거
DELETE FROM push_tokens 
WHERE user_id = {userId} 
  AND device_id != '{currentDeviceId}'
  AND token = '{duplicateToken}';
```

#### 5.3 권한 문제
```typescript
// 시스템 권한 재요청
const permissions = await Notifications.requestPermissionsAsync({
  ios: {
    allowAlert: true,
    allowBadge: true,
    allowSound: true,
  },
});

// 시스템 설정 열기
await Notifications.openSettingsAsync();
```

---

## 요약

Shook의 Push Notification 시스템은 다음과 같은 완전한 파이프라인으로 구성됩니다:

1. **YouTube RSS 모니터링** (5분 간격) → 새 영상 감지
2. **AI 요약 생성** → OpenAI API로 한글 요약 생성  
3. **구독자 조회** → DB에서 해당 채널 구독자들의 **활성 Push Token** 조회
4. **Expo Push 발송** → 실제 디바이스로 알림 전달
5. **Frontend 처리** → 알림 수신 시 앱 내 데이터 동기화 및 네비게이션

**알림 해제 시**에는 Frontend에서 즉시 UI를 업데이트하고, Backend API를 통해 DB의 Push Token을 **비활성화 → 삭제** 하여 더 이상 알림이 발송되지 않도록 합니다.

모든 과정에서 **상세한 로깅**과 **디버그 도구**를 제공하여 문제 발생 시 정확한 원인을 파악할 수 있도록 구성되어 있습니다.