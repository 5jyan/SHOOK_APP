# Google OAuth Setup Guide

## Current Issue
You're getting "Google OAuth 2.0 policy compliance" error because the client IDs in your `.env` file are placeholders.

## Step-by-Step Fix

### 1. Go to Google Cloud Console
- Visit: https://console.cloud.google.com/
- Create a new project or select existing one
- Enable Google+ API and Google Identity API

### 2. Create OAuth 2.0 Clients

#### For Android (Required for Expo Go):
1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth 2.0 Client IDs**
3. Application type: **Android**
4. Package name: `host.exp.exponent` (for Expo Go)
5. SHA-1 certificate fingerprint: 
   - For Expo Go: `A5:C9:EE:04:C6:E5:80:7E:15:8A:AA:C9:4B:BC:A3:CF:50:BD:86:C7`
6. Copy the generated Android Client ID

#### For iOS (Required for iOS Expo Go):
1. Click **Create Credentials > OAuth 2.0 Client IDs**
2. Application type: **iOS**
3. Bundle ID: `host.exp.Exponent` (for Expo Go)
4. Copy the generated iOS Client ID

#### For Web (Required for testing):
1. Click **Create Credentials > OAuth 2.0 Client IDs** 
2. Application type: **Web application**
3. Authorized redirect URIs:
   - `https://auth.expo.io/@your-username/shook_app`
   - `http://localhost:19006/` (for web testing)
4. Copy the generated Web Client ID

### 3. Update Your .env File
Replace the placeholder values with your real client IDs:

```
EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS=your-real-ios-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID=your-real-android-client-id.apps.googleusercontent.com  
EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB=your-real-web-client-id.apps.googleusercontent.com
```

### 4. Restart Expo Server
After updating .env:
```bash
npx @expo/cli start --clear
```

## Alternative: Use Expo's Google Auth Plugin

If manual setup is complex, we can use Expo's Google Auth plugin which handles OAuth configuration automatically.

## Quick Test with Public Expo Credentials

For immediate testing, I can provide a working configuration using public test credentials, but these should only be used for development testing, not production.