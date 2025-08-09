# Backend Integration Guide

## What We've Implemented

### 1. API Service (`src/services/api.ts`)
- **Health Check**: `GET /api/health`
- **Google Login**: `POST /api/auth/google`  
- **Logout**: `POST /api/auth/logout`
- **User Profile**: `GET /api/auth/me`

### 2. Updated Authentication Flow
The app now:
1. Tests backend connectivity first
2. Sends user data and access token to your backend
3. Receives session/user data from backend
4. Falls back to local mock if backend fails

### 3. Backend Test Button
Added to Settings screen to easily test connectivity

## Backend Endpoints You Need

Add these endpoints to your Express server:

### Health Check Endpoint
```javascript
// Add to your Express router
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Shook API'
  });
});
```

### Google Authentication Endpoint
```javascript
app.post('/api/auth/google', async (req, res) => {
  try {
    const { user, accessToken, provider } = req.body;
    
    console.log('📱 Mobile app login:', { 
      userId: user.id, 
      email: user.email, 
      provider 
    });
    
    // Your existing user creation/update logic
    // const dbUser = await createOrUpdateUser(user);
    
    // Create session
    // req.session.userId = dbUser.id;
    
    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        picture: user.picture,
        givenName: user.givenName,
        familyName: user.familyName,
        verified: user.verified,
      },
      sessionId: req.sessionID || 'mock-session-id'
    });
    
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});
```

### Logout Endpoint
```javascript
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    
    res.json({ success: true });
  });
});
```

## Testing Steps

1. **Start your backend server** on `http://192.168.0.156:3000`
2. **Add the health endpoint** to test connectivity
3. **Open the mobile app** and go to Settings
4. **Click "Test Backend Connection"** - should show success
5. **Try Google Sign-In** - check both app logs and server logs
6. **Check server logs** for incoming requests

## Expected Request Flow

When user clicks "Google로 계속하기":
1. App tests `GET /api/health`
2. App sends `POST /api/auth/google` with user data
3. Backend receives user info and creates session
4. App stores user data locally
5. User is redirected to main app

## Debugging

### Check App Logs
- Open React Native debugger or Metro console
- Look for 🚀, ✅, ❌ emojis in logs

### Check Network
- Make sure backend is accessible at `http://192.168.0.156:3000`
- Try `curl http://192.168.0.156:3000/api/health` from command line

### Common Issues
- **CORS**: Add mobile app origin to CORS config
- **Firewall**: Make sure port 3000 is accessible on local network
- **IP Address**: Verify 192.168.0.156 is correct for your machine