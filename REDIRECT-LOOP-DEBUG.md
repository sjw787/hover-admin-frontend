# Login Redirect Loop - Troubleshooting Guide

## Current Issue

Login form appears to load infinitely because:
1. No access token is found in localStorage after redirect
2. Protected layout redirects back to login
3. Creates a redirect loop

## What We've Added

### 1. Comprehensive Logging
The app now logs every step of the authentication flow:

**Login Flow:**
```
🔐 Login function called
📡 Calling API login...
✅ API login successful
💾 Tokens stored in localStorage
🔍 Verification - Token stored: true/false
👤 Loading user data...
✅ User data loaded: username
💾 User state set
🚀 Redirecting to /upload...
```

**Protected Route Check:**
```
🔄 loadUser called
🔑 Access token exists: true/false
```

### 2. State Timing Fix
Added 100ms delay between setting user state and redirecting to ensure React state propagates.

### 3. Login Page Guard
Login page now redirects to /upload if user is already authenticated.

## Most Likely Root Causes

### 1. Mixed Content Blocking (HTTPS → HTTP)

**Symptom:** Login API call fails silently

**Check:** Look for this in console:
```
Mixed Content: The page at 'https://admin.samwylock.com' was loaded over HTTPS, 
but requested an insecure resource 'http://hovver-admin-alb-...'. 
This request has been blocked
```

**Solution:** Backend needs HTTPS

---

### 2. CORS Policy Blocking

**Symptom:** Login API returns CORS error

**Check:** Look for:
```
Access to fetch at 'http://...' from origin 'https://admin.samwylock.com' 
has been blocked by CORS policy
```

**Solution:** Backend needs to allow your domain in CORS headers

---

### 3. API Endpoint Not Reachable

**Symptom:** Network timeout or connection refused

**Check:** Console shows:
```
🔥 Login error: TypeError: Failed to fetch
```

**Solution:** Verify backend is running and accessible

---

## Testing Steps

### Step 1: Check Console Logs

After attempting login, check console for the log sequence:

**Expected Successful Flow:**
```
📝 Form submitted, calling login...
🔐 Login function called
📡 Calling API login...
🔐 Attempting login to: http://...
📡 Login response status: 200
✅ Login successful
✅ API login successful
💾 Tokens stored in localStorage
🔍 Verification - Token stored: true
👤 Loading user data...
📡 Login response status: 200
✅ User data loaded: sam
💾 User state set
🚀 Redirecting to /upload...
✅ Login completed successfully
```

**If you see:**
```
🔥 Login error: ...
```
That's where it's failing.

### Step 2: Check Network Tab

1. Open DevTools → Network tab
2. Try logging in
3. Look for `/auth/login` request

**Check:**
- Status code (should be 200)
- Response body (should have tokens)
- Any red/failed requests
- CORS errors

### Step 3: Check localStorage

After login attempt:
1. Open DevTools → Application tab
2. Go to Storage → Local Storage
3. Check if these exist:
   - `access_token`
   - `id_token`
   - `refresh_token`
   - `token_expiration`

**If tokens are NOT there:** API call failed
**If tokens ARE there:** Redirect issue

### Step 4: Test Backend Directly

```powershell
# Test backend is accessible
curl http://hovver-admin-alb-2080077084.us-east-1.elb.amazonaws.com/

# Test login endpoint
curl -X POST http://hovver-admin-alb-2080077084.us-east-1.elb.amazonaws.com/auth/login `
  -H "Content-Type: application/json" `
  -d '{"username":"testuser","password":"testpass"}'
```

## Quick Fixes

### Fix 1: Allow Mixed Content (Temporary)

**Chrome/Edge:**
1. Click lock icon in address bar
2. Site settings
3. Insecure content → Allow

**Only for testing!**

### Fix 2: Use Incognito Mode

Test if browser extensions are interfering:
1. Open Incognito/Private window
2. Try logging in
3. If it works → Extension issue

### Fix 3: Clear Browser Data

```
1. Open DevTools (F12)
2. Application tab
3. Clear storage → Clear site data
4. Refresh page
5. Try again
```

## Permanent Solution

Your backend needs HTTPS. Two options:

### Option A: Add HTTPS to ALB (Recommended)

1. **Request ACM certificate:**
   ```bash
   aws acm request-certificate \
     --domain-name api.samwylock.com \
     --validation-method DNS \
     --region us-east-1
   ```

2. **Validate certificate** (create DNS record)

3. **Add HTTPS listener to ALB**

4. **Update frontend:**
   ```env
   # .env.local
   NEXT_PUBLIC_API_URL=https://api.samwylock.com
   ```

5. **Rebuild and deploy**

### Option B: CloudFront for Backend

Create CloudFront distribution in front of your ALB:
- Origin: HTTP ALB
- Viewer protocol: HTTPS
- Gives you free SSL

## What to Report

If still having issues, share:

1. **Console logs** (entire sequence from login attempt)
2. **Network tab** (screenshot of /auth/login request)
3. **localStorage** (do tokens exist?)
4. **Error messages** (exact text)

## Expected Behavior After Fix

1. Enter credentials → click Sign In
2. Console shows full login sequence
3. Tokens stored in localStorage
4. Redirect to /upload
5. Upload page loads successfully
6. No redirect back to login

## Debug Commands

```powershell
# Check if site is live
curl https://admin.samwylock.com

# Check backend
curl http://hovver-admin-alb-2080077084.us-east-1.elb.amazonaws.com

# Check CloudFront
curl -I https://admin.samwylock.com

# View localStorage (in browser console)
console.log(localStorage)
console.log('Token:', localStorage.getItem('access_token'))
```

## Common Patterns

### Pattern 1: Tokens Store, But Immediately Cleared
**Cause:** `getCurrentUser()` API call fails after login
**Solution:** Check `/auth/me` endpoint accessibility

### Pattern 2: Login Returns 200, But No Redirect
**Cause:** Router.push not working in static export
**Solution:** Use window.location.href instead (should not be needed)

### Pattern 3: Infinite Redirect Loop
**Cause:** Protected layout checks auth before tokens are read
**Solution:** Already fixed with timing delay

---

**Most likely your issue:** Mixed content blocking preventing API calls from HTTPS frontend to HTTP backend.

**Quick test:** Try login and immediately check console - do you see the "🔐 Attempting login to:" message followed by an error?

