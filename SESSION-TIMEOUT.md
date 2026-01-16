# Session Timeout Feature

## Overview

The application now includes automatic session timeout management with a user-friendly modal that appears before the session expires.

## How It Works

### Token Expiration Tracking

1. **On Login**: The app stores the token expiration time in localStorage
   - Calculated as: `current_time + expires_in` (from API response)
   - Stored as: `token_expiration` timestamp

2. **Background Monitoring**: The app checks expiration every 10 seconds
   - Compares current time with stored expiration
   - Triggers warning modal at appropriate time

### Warning Modal

**Timing:**
- Appears **2 minutes** (120 seconds) before token expiration
- Shows countdown timer starting at **60 seconds**
- Auto-logout after 60 seconds if no action taken

**User Options:**
1. **Stay Logged In**: Refreshes the token and continues session
2. **Logout**: Immediately logs out and redirects to login page
3. **No Action**: Auto-logout after countdown reaches 0

### Token Refresh

When user clicks "Stay Logged In":
- Calls `/auth/refresh` endpoint with refresh token
- Receives new access token, ID token, and refresh token
- Updates localStorage with new tokens
- Resets expiration timer
- Closes modal and continues session

## Configuration

Located in `src/contexts/AuthContext.tsx`:

```typescript
const WARNING_TIME = 120; // Show modal 2 minutes before expiration
const LOGOUT_TIME = 60;   // Auto-logout after 60 seconds of no response
```

Adjust these values to change the timing:
- `WARNING_TIME`: How many seconds before expiration to show modal
- `LOGOUT_TIME`: How many seconds user has to respond

## Components

### 1. AuthContext (`src/contexts/AuthContext.tsx`)
- Monitors token expiration
- Shows/hides timeout modal
- Handles token refresh
- Manages logout

### 2. SessionTimeoutModal (`src/components/SessionTimeoutModal.tsx`)
- Displays warning message
- Shows countdown timer
- Provides action buttons
- Handles auto-logout

## API Requirements

The backend must support:

### Login Endpoint
```
POST /auth/login
Response: {
  access_token: string,
  id_token: string,
  refresh_token: string,
  token_type: string,
  expires_in: number  // Token lifetime in seconds
}
```

### Token Refresh Endpoint
```
POST /auth/refresh
Body: {
  refresh_token: string
}
Response: {
  access_token: string,
  id_token: string,
  refresh_token: string,
  token_type: string,
  expires_in: number
}
```

## User Experience

### Example Timeline (with 60-minute token)

```
00:00 - User logs in
58:00 - Modal appears: "Are you still there?"
58:00-59:00 - 60 second countdown
59:00 - If no action: Auto-logout and redirect to login
      - If "Stay Logged In": Token refreshed, countdown resets
60:00 - Token would have expired (prevented by refresh)
```

### Visual Design

The modal features:
- ⏰ Clock icon with yellow theme
- 🔢 Large countdown number
- 🎯 Two clear action buttons
- 🌓 Dark mode support
- ✨ Smooth animations

## Testing

### Manual Testing

1. **Test Modal Appearance**:
   - Modify `WARNING_TIME` to 10 seconds (for testing)
   - Login and wait 10 seconds
   - Modal should appear

2. **Test Auto-Logout**:
   - Wait for countdown to reach 0
   - Should redirect to login page

3. **Test Refresh**:
   - Click "Stay Logged In"
   - Modal should close
   - Session should continue

4. **Test Logout Button**:
   - Click "Logout"
   - Should redirect to login immediately

### Testing with Short Expiration

Modify for quick testing:
```typescript
const WARNING_TIME = 10;  // Show modal after 10 seconds
const LOGOUT_TIME = 5;    // Auto-logout after 5 seconds
```

## Storage Keys

The following localStorage keys are used:

| Key | Description | Example |
|-----|-------------|---------|
| `access_token` | JWT access token | `eyJhbGc...` |
| `id_token` | OpenID ID token | `eyJhbGc...` |
| `refresh_token` | Token for refresh | `eyJhbGc...` |
| `token_expiration` | Unix timestamp (ms) | `1737012345678` |

## Security Considerations

1. **Token Refresh**: Uses refresh token, not access token
2. **Auto-Logout**: Prevents abandoned sessions
3. **Warning Time**: Gives user chance to extend session
4. **Secure Storage**: Tokens remain in localStorage (consider httpOnly cookies for production)

## Troubleshooting

### Modal doesn't appear
- Check `token_expiration` in localStorage
- Verify `expires_in` from login response
- Check browser console for errors

### Auto-logout too fast
- Increase `LOGOUT_TIME` constant
- Check token expiration time from backend

### Token refresh fails
- Verify `/auth/refresh` endpoint exists
- Check refresh token validity
- Review backend logs

## Future Enhancements

Potential improvements:
- [ ] Activity detection (mouse/keyboard) to delay modal
- [ ] Remember "Stay Logged In" preference
- [ ] Sound notification option
- [ ] Configurable warning times per user
- [ ] Multiple warning levels (5 min, 2 min, 1 min)

## Browser Compatibility

Works in:
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari
- ✅ All modern browsers with localStorage support

## Accessibility

The modal includes:
- Semantic HTML structure
- Clear visual hierarchy
- Keyboard navigation support
- High contrast in both light/dark modes
- Large, readable countdown timer

