# Google OAuth 2.0 Setup for Expo React Native

## The Problem
You're getting "doesn't comply with Google's OAuth 2.0 policy" because:
1. Test credentials don't work for real OAuth
2. You need your own Google Cloud project
3. Proper client IDs for each platform (iOS, Android, Web)

## Complete Setup Guide

### Step 1: Google Cloud Console Setup

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Create a new project or select existing one

2. **Enable APIs**
   - Go to "APIs & Services" > "Library"
   - Enable "Google+ API" 
   - Enable "Google Identity API"

### Step 2: Create OAuth 2.0 Credentials

#### A. Web Application (for Expo Web)
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Application type: **Web application**
4. Name: "Shook Web"
5. Authorized redirect URIs:
   ```
   https://auth.expo.io/@your-expo-username/shook_app
   http://localhost:19006
   ```
6. **Copy the Web Client ID** → This goes in your backend .env as `GOOGLE_CLIENT_ID`

#### B. Android Application (for Expo Go/Android)
1. Click "Create Credentials" > "OAuth 2.0 Client IDs"
2. Application type: **Android**
3. Name: "Shook Android"
4. Package name: **For Expo Go**: `host.exp.exponent`
5. SHA-1 certificate fingerprint: **For Expo Go**: 
   ```
   A5:C9:EE:04:C6:E5:80:7E:15:8A:AA:C9:4B:BC:A3:CF:50:BD:86:C7
   ```
6. **Copy the Android Client ID**

#### C. iOS Application (for Expo Go/iOS)
1. Click "Create Credentials" > "OAuth 2.0 Client IDs"
2. Application type: **iOS**
3. Name: "Shook iOS"
4. Bundle ID: **For Expo Go**: `host.exp.Exponent`
5. **Copy the iOS Client ID**

### Step 3: Update Environment Variables

#### Mobile App (.env in shook_app)
```env
EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS=your-ios-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID=your-android-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB=your-web-client-id.apps.googleusercontent.com
```

#### Backend (.env in Shook/server)
```env
GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
```

### Step 4: OAuth Consent Screen
1. Go to "OAuth consent screen"
2. Choose "External" (for testing)
3. Fill in required fields:
   - App name: "Shook"
   - User support email: your email
   - Developer contact: your email
4. Add test users (your email) during development
5. Eventually submit for verification for production

## Alternative: Use Expo's AuthSession with Web Client Only

If the above is too complex, we can simplify by using only the web client ID for all platforms:

### Simplified Setup
1. Create only a **Web Application** client in Google Cloud Console
2. Use that single client ID for all platforms
3. Configure authorized redirect URIs for Expo

### Redirect URIs for Web Client
```
https://auth.expo.io/@your-expo-username/shook_app
http://localhost:19006
exp://localhost:19000
custom-scheme://auth
```

## Testing Steps

1. **Create your Google Cloud project and credentials**
2. **Update both .env files** with your real client IDs
3. **Restart both servers** (mobile and backend)
4. **Try Google Sign-In** - should work with your credentials

## Common Issues

1. **Wrong Package Name**: Must be `host.exp.exponent` for Expo Go
2. **Wrong Bundle ID**: Must be `host.exp.Exponent` for Expo Go
3. **Wrong SHA-1**: Must be Expo Go's SHA-1 fingerprint
4. **Client ID Mismatch**: Backend and mobile must use compatible client IDs
5. **Redirect URI Mismatch**: Must match exactly what Expo sends

## Quick Test Configuration

If you just want to test quickly, you can use your existing web client ID from your Shook web app for all platforms temporarily.