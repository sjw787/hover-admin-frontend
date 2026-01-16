# 401 Unauthorized Error - Debugging Guide

## Error Description

Backend is returning:
```
INFO: 10.0.1.183:58184 - "PUT /auth/profile HTTP/1.1" 401 Unauthorized
```

This indicates the request is reaching the backend but authentication is failing.

## Potential Causes

### 1. Token Not Being Sent
The Authorization header might not be included in the request.

### 2. Token Format Issue
The token format might be incorrect (missing "Bearer " prefix or extra spaces).

### 3. Token Expired
The access token has expired and needs to be refreshed.

### 4. Wrong Token Being Used
The frontend might be sending the wrong token (id_token instead of access_token).

### 5. CORS Preflight Issue
The OPTIONS preflight request might be failing, preventing the PUT request.

## Debugging Steps Added

I've added comprehensive logging to `src/lib/api.ts` in the `updateProfile` method:

```typescript
console.log('📝 Updating profile...');
console.log('📦 Profile data:', data);
console.log('🔑 Token exists:', !!token);
console.log('🔑 Token preview:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');
console.log('📋 Request headers:', Object.keys(headers));
console.log('📡 Response status:', response.status);
```

## How to Debug

### Step 1: Check Browser Console

After rebuilding and deploying, try to update profile and check the console for:

1. **Token Exists:**
   ```
   🔑 Token exists: true
   ```
   If this shows `false`, the token isn't in localStorage.

2. **Token Preview:**
   ```
   🔑 Token preview: eyJraWQiOiJXR1lUc...
   ```
   Should show the first 20 characters of the JWT token.

3. **Request Headers:**
   ```
   📋 Request headers: ['Content-Type', 'Authorization']
   ```
   Should include both headers.

### Step 2: Check Network Tab

Open DevTools → Network tab:

1. **Find the PUT request** to `/auth/profile`
2. **Click on it** → Headers tab
3. **Check Request Headers:**
   ```
   Authorization: Bearer eyJraWQiOiJXR1lUc...
   Content-Type: application/json
   ```

**What to look for:**
- ✅ Authorization header is present
- ✅ Starts with "Bearer " (with space after)
- ✅ Has a JWT token (eyJ...)
- ❌ Missing Authorization header
- ❌ Wrong format (missing "Bearer ")
- ❌ Empty token value

### Step 3: Verify Token in localStorage

In browser console, run:
```javascript
localStorage.getItem('access_token')
```

**Expected:** Should return a JWT token string like:
```
"eyJraWQiOiJXR1lUc3p4R29jRWV3TFlqQUtqK2FFVlE3WT0iLCJhbGc..."
```

**If null:** Token isn't stored, user needs to re-login.

### Step 4: Check Token Expiration

In browser console, run:
```javascript
const exp = localStorage.getItem('token_expiration');
const now = Date.now();
const timeLeft = (parseInt(exp) - now) / 1000 / 60; // minutes
console.log('Token expires in', timeLeft, 'minutes');
```

**If negative:** Token has expired, needs refresh.

### Step 5: Decode the Token

Copy the token from localStorage and paste it into [jwt.io](https://jwt.io) to see:
- Expiration time (`exp` claim)
- User info (`sub`, `cognito:username`)
- Token type

## Common Issues and Fixes

### Issue 1: Token Not in Headers

**Symptom:** Network tab shows no Authorization header

**Cause:** `getAuthHeader()` returning empty object

**Debug:**
```javascript
// In browser console
localStorage.getItem('access_token')
// Should return a token, not null
```

**Fix:** User needs to re-login

---

### Issue 2: Token Expired

**Symptom:** Token exists but backend returns 401

**Cause:** Token's `exp` claim is in the past

**Debug:**
```javascript
const exp = localStorage.getItem('token_expiration');
console.log('Expires:', new Date(parseInt(exp)));
console.log('Now:', new Date());
```

**Fix:** Implement token refresh or force re-login

---

### Issue 3: Wrong Token Type

**Symptom:** ID token being sent instead of access token

**Cause:** Backend expects access_token but getting id_token

**Debug:** Check which token is stored:
```javascript
const accessToken = localStorage.getItem('access_token');
const idToken = localStorage.getItem('id_token');
console.log('Access token:', accessToken?.substring(0, 50));
console.log('ID token:', idToken?.substring(0, 50));
```

**Fix:** Code is correctly using `access_token`, so this shouldn't be the issue

---

### Issue 4: CORS Preflight Failing

**Symptom:** OPTIONS request fails before PUT

**Debug:** Check Network tab for OPTIONS request to `/auth/profile`

**Expected Response:**
```
Status: 200 OK
Access-Control-Allow-Origin: https://admin.samwylock.com
Access-Control-Allow-Methods: PUT, POST, GET, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

**If 401 on OPTIONS:** Backend CORS not configured for OPTIONS method

**Fix (Backend):**
```python
# FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://admin.samwylock.com"],
    allow_credentials=True,
    allow_methods=["*"],  # Must include OPTIONS
    allow_headers=["*"],
)
```

---

### Issue 5: Bearer Token Format

**Symptom:** Token sent but format incorrect

**Expected Format:**
```
Authorization: Bearer eyJraWQiOiJXR1lUc...
```

**Incorrect Formats:**
```
Authorization: eyJraWQiOiJXR1lUc...           ❌ Missing "Bearer "
Authorization: Bearer  eyJraWQiOiJXR1lUc...   ❌ Extra space
Authorization: bearer eyJraWQiOiJXR1lUc...    ❌ Lowercase "bearer"
```

**Current Code:**
```typescript
return {
  Authorization: `Bearer ${token}`,  // ✅ Correct format
};
```

---

## Testing the Fix

### Deploy with Logging

1. **Rebuild:**
   ```bash
   npm run build
   ```

2. **Deploy:**
   ```bash
   cd terraform
   .\deploy.ps1
   ```

3. **Test:**
   - Go to `/account`
   - Enter profile info
   - Click "Update Profile"
   - Check browser console for logs

### Expected Console Output (Success)

```
📝 Updating profile...
📦 Profile data: {full_name: "Test User", phone_number: "+1234567890"}
🔑 Token exists: true
🔑 Token preview: eyJraWQiOiJXR1lUc...
📋 Request headers: ["Content-Type", "Authorization"]
📡 Response status: 200
✅ Profile update successful: {message: "Profile updated successfully"}
```

### Expected Console Output (Token Missing)

```
📝 Updating profile...
📦 Profile data: {full_name: "Test User", phone_number: "+1234567890"}
🔑 Token exists: false
🔑 Token preview: NO TOKEN
📋 Request headers: ["Content-Type"]
📡 Response status: 401
❌ Response error: {detail: "Unauthorized"}
```

## Backend Verification

### Check Backend Expects

The backend should expect:
```
PUT /auth/profile
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "full_name": "Test User",
  "phone_number": "+1234567890"
}
```

### Backend Should Validate

1. **Authorization header exists**
2. **Starts with "Bearer "**
3. **Token is valid JWT**
4. **Token not expired**
5. **Token signature valid**
6. **User exists in Cognito**

### Common Backend Issues

1. **Not checking Authorization header**
2. **Case-sensitive header check** (looking for "authorization" not "Authorization")
3. **Token validation failing**
4. **CORS not allowing Authorization header**
5. **OPTIONS preflight returning 401**

## Quick Fixes to Try

### Fix 1: Force Re-login

If token is expired or invalid:
```javascript
// Clear storage and reload
localStorage.clear();
window.location.href = '/login';
```

### Fix 2: Check Different Token

Try using `id_token` instead (temporary test):
```typescript
// In api.ts, temporarily change:
const token = localStorage.getItem('id_token'); // Instead of 'access_token'
```

If this works, backend might be expecting id_token.

### Fix 3: Add Credentials

Add credentials to fetch:
```typescript
const response = await this.fetchWithTimeout(`${API_URL}/auth/profile`, {
  method: 'PUT',
  credentials: 'include',  // Add this
  headers: headers,
  body: JSON.stringify(data),
}, 15000);
```

## Summary

**Most Likely Issues:**

1. ✅ **Token expired** - User needs to re-login
2. ✅ **CORS preflight** - Backend not allowing OPTIONS with Authorization header
3. ✅ **Wrong token validation** - Backend expecting different token format

**Next Steps:**

1. ✅ Rebuild and deploy with logging
2. ✅ Test profile update
3. ✅ Check browser console logs
4. ✅ Check Network tab headers
5. ✅ Share console output for further debugging

---

**The enhanced logging will help identify exactly where the authentication is failing!** 🔍

