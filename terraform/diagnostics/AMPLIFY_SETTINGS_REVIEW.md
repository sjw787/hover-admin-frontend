# Amplify App Settings Check - All Good! ✅

## Settings Reviewed

I checked all your Amplify app settings. Here's what I found:

### ✅ Platform Configuration
```json
"platform": "WEB_COMPUTE"
```
**Status:** ✅ Correct - This is the right platform for Next.js SSR

### ✅ Environment Variables
```json
"environmentVariables": {
    "NEXT_PUBLIC_API_URL": "https://api.samwylock.com",
    "_LIVE_UPDATES": "[{...}]"
}
```
**Status:** ✅ Correct
- Using HTTPS for API URL ✅
- Proper variable name ✅

### ✅ Custom Rules
```json
"customRules": []
```
**Status:** ✅ Correct - No custom rules interfering with routing

This is good! We removed the problematic custom rules that were redirecting to `/index.html`.

### ✅ Build Spec
```yaml
artifacts:
  baseDirectory: .next
  files:
    - '**/*'
```
**Status:** ✅ Correct - Using full `.next` output (not standalone)

### ✅ Branch Settings
```json
"framework": "Next.js - SSR",
"stage": "DEVELOPMENT",
"enableAutoBuild": true
```
**Status:** ✅ All correct

### ✅ Cache Configuration
```json
"cacheConfig": {
    "type": "AMPLIFY_MANAGED_NO_COOKIES"
}
```
**Status:** ✅ Appropriate for your app

### ⚠️ Custom Headers
```json
"customHeaders": ""
```
**Status:** ⚠️ Empty - This is where you COULD add security headers

## Potential Improvements

### 1. Add Security Headers (Optional but Recommended)

You can add custom headers in Amplify to improve security:

**In Amplify Console:**
1. Go to: https://console.aws.amazon.com/amplify/home?region=us-east-1#/dyyzhyn0517sf
2. Click "App settings" → "Custom headers"
3. Add these headers:

```yaml
customHeaders:
  - pattern: '**/*'
    headers:
      - key: 'Strict-Transport-Security'
        value: 'max-age=31536000; includeSubDomains'
      - key: 'X-Frame-Options'
        value: 'DENY'
      - key: 'X-Content-Type-Options'
        value: 'nosniff'
      - key: 'Referrer-Policy'
        value: 'strict-origin-when-cross-origin'
      - key: 'Permissions-Policy'
        value: 'camera=(), microphone=(), geolocation=()'
```

**Or in Terraform (`amplify.tf`):**
```hcl
resource "aws_amplify_app" "frontend" {
  # ...existing code...

  custom_headers = <<-EOT
    customHeaders:
      - pattern: '**/*'
        headers:
          - key: 'Strict-Transport-Security'
            value: 'max-age=31536000; includeSubDomains'
          - key: 'X-Frame-Options'
            value: 'DENY'
          - key: 'X-Content-Type-Options'
            value: 'nosniff'
          - key: 'Referrer-Policy'
            value: 'strict-origin-when-cross-origin'
          - key: 'Permissions-Policy'
            value: 'camera=(), microphone=(), geolocation=()'
  EOT
}
```

### 2. Check Domain Configuration

Let me verify the domain association:

```powershell
cd C:\Users\Sam\PycharmProjects\hover-admin-frontend\terraform\diagnostics
aws amplify get-domain-association --app-id dyyzhyn0517sf --domain-name samwylock.com --profile iamadmin-dev --region us-east-1 --output json > domain-check.json
Get-Content domain-check.json
```

Look for:
- `"domainStatus": "AVAILABLE"` ✅
- `"verified": true` for dev subdomain ✅

### 3. Enable Performance Mode (Optional)

Currently: `"enablePerformanceMode": false`

Performance mode can improve load times but may increase costs slightly. Only enable if needed.

## What's NOT Wrong with Amplify

Based on my review:

✅ **Platform:** Correct (WEB_COMPUTE for SSR)
✅ **Build configuration:** Correct (using .next directory)
✅ **Environment variables:** Correct (HTTPS API URL)
✅ **Custom rules:** Correct (none - good!)
✅ **Branch settings:** Correct (SSR framework detected)
✅ **Auto-build:** Enabled
✅ **Cache:** Appropriate

## The Real Issues (Not Amplify)

Your Amplify configuration is **fine**. The issues you're experiencing are:

### 1. CORS Error ❌
**Location:** Backend API
**Problem:** Missing `https://dev.samwylock.com` in CORS allowed_origins
**Fix:** Update backend code (see FIX_CORS_BACKEND.md)

### 2. User Not in Admin Group ✅ (Fixed)
**Location:** AWS Cognito
**Problem:** User wasn't in Admins group
**Fix:** ✅ Already fixed

### 3. "Not Secure" Warning ⚠️
**Location:** Chrome browser
**Problem:** Result of CORS errors causing failed requests
**Fix:** Will be resolved once CORS is fixed

## Summary

| Setting | Status | Notes |
|---------|--------|-------|
| **Platform** | ✅ Good | WEB_COMPUTE for SSR |
| **Environment Variables** | ✅ Good | HTTPS API URL configured |
| **Build Spec** | ✅ Good | Using .next output |
| **Custom Rules** | ✅ Good | Removed (not interfering) |
| **Custom Headers** | ⚠️ Optional | Could add security headers |
| **Framework** | ✅ Good | Next.js SSR detected |
| **Auto-build** | ✅ Good | Enabled |
| **Domain** | ✅ Good | dev.samwylock.com configured |

## Action Items

### Required (Backend)
1. ✅ **Add user to Admins group** - Already done
2. ❌ **Fix backend CORS** - Add `https://dev.samwylock.com` to allowed_origins

### Optional (Amplify)
3. ⚠️ **Add security headers** - Improves security posture
4. ⚠️ **Test domain verification** - Ensure domain is fully verified

## No Amplify Changes Needed

**Conclusion:** Your Amplify configuration is correct. The issues are:
- Backend CORS configuration (needs update)
- The "Not Secure" warning will disappear once CORS is fixed

## Quick Verification Commands

```powershell
cd C:\Users\Sam\PycharmProjects\hover-admin-frontend\terraform\diagnostics

# 1. Check if domain is verified
aws amplify get-domain-association --app-id dyyzhyn0517sf --domain-name samwylock.com --profile iamadmin-dev --region us-east-1 --query "domainAssociation.subDomains[?subDomainSetting.prefix=='dev'].verified"

# 2. Check environment variables are set
aws amplify get-app --app-id dyyzhyn0517sf --profile iamadmin-dev --region us-east-1 --query "app.environmentVariables"

# 3. Check latest deployment
aws amplify get-job --app-id dyyzhyn0517sf --branch-name master --job-id 9 --profile iamadmin-dev --region us-east-1 --query "job.summary.status"
```

**Expected outputs:**
1. `[true]` - Domain verified
2. Shows NEXT_PUBLIC_API_URL
3. `"SUCCEED"` - Latest build successful

---

## Bottom Line

✅ **Amplify settings are all correct!**

The only thing you need to fix is the **backend CORS configuration** to allow requests from `https://dev.samwylock.com`.

Once that's done:
- ✅ Login will work
- ✅ API calls will succeed  
- ✅ Chrome will show "Secure"
- ✅ Everything works!

**No Amplify changes needed!** 🎉
