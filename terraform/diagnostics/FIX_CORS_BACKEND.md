# ✅ FIX: CORS Error from dev.samwylock.com

## The Issue

Your frontend at `https://dev.samwylock.com` is getting **CORS errors** when trying to call the backend API at `https://api.samwylock.com`.

**Chrome may also show "Not Secure"** because:
- Failed API requests can trigger security warnings
- Mixed content detection
- CORS errors prevent proper authentication

## Root Cause

Your backend API needs to allow requests from `https://dev.samwylock.com` in its CORS configuration.

## Backend CORS Configuration

The backend API (FastAPI) needs to have these origins in its CORS middleware:

```python
# api/main.py or wherever CORS is configured

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",           # Local development
        "https://dev.samwylock.com",       # ← ADD THIS
        "https://admin.samwylock.com",     # Production (if needed)
        "https://dev.admin.samwylock.com", # Alternative dev domain
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## How to Fix (Backend)

### Option 1: Use Environment Variable (Recommended)

**In your backend code:**
```python
import os
from fastapi.middleware.cors import CORSMiddleware

# Get allowed origins from environment variable
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**In your ECS Task Definition or Terraform:**
```hcl
environment = [
  {
    name  = "ALLOWED_ORIGINS"
    value = "http://localhost:3000,https://dev.samwylock.com,https://admin.samwylock.com"
  }
]
```

### Option 2: Hardcode in Backend (Quick Fix)

**In your backend `api/main.py`:**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://dev.samwylock.com",      # Add this
        "https://admin.samwylock.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Then redeploy your backend.

## Verify CORS Configuration

### Test with curl

```powershell
# Test preflight request (OPTIONS)
curl -X OPTIONS https://api.samwylock.com/auth/login `
  -H "Origin: https://dev.samwylock.com" `
  -H "Access-Control-Request-Method: POST" `
  -H "Access-Control-Request-Headers: Content-Type" `
  -v
```

**Look for in the response:**
```
< Access-Control-Allow-Origin: https://dev.samwylock.com
< Access-Control-Allow-Credentials: true
< Access-Control-Allow-Methods: POST
```

### Test in Browser Console

Open `https://dev.samwylock.com` and run in Chrome DevTools Console:

```javascript
fetch('https://api.samwylock.com/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    username: 'test@example.com',
    password: 'test'
  })
})
.then(res => res.json())
.then(data => console.log('Success!', data))
.catch(err => console.error('CORS Error:', err));
```

**If CORS is working:** You'll get an authentication error (401/403) but NOT a CORS error
**If CORS is broken:** You'll see: `CORS policy: No 'Access-Control-Allow-Origin' header`

## Current CORS Error

The error you're seeing is likely:

```
Access to fetch at 'https://api.samwylock.com/auth/login' from origin 'https://dev.samwylock.com' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the 
requested resource.
```

This means the backend isn't sending the required CORS headers.

## After Fixing CORS

Once you update the backend CORS configuration and redeploy:

1. ✅ Login will work from `https://dev.samwylock.com`
2. ✅ All API calls will succeed
3. ✅ Chrome will show the site as "Secure" (green padlock)

## Additional: Check Backend Logs

Check your backend logs in CloudWatch to see if requests are reaching the API:

```powershell
# If you have access to backend logs
aws logs tail /ecs/hovver-admin-api --follow --profile iamadmin-dev --region us-east-1
```

Look for:
- CORS errors
- Authentication errors
- Request logs

## Frontend Environment Variable

Verify the frontend is using the correct API URL:

```powershell
# Check Amplify environment variables
aws amplify get-app --app-id dyyzhyn0517sf --profile iamadmin-dev --region us-east-1 --query "app.environmentVariables"
```

**Should show:**
```json
{
  "NEXT_PUBLIC_API_URL": "https://api.samwylock.com"
}
```

## Why "Not Secure" in Chrome

Chrome may show "Not Secure" when:

### 1. Mixed Content
- HTTPS site loading HTTP resources
- **Your case:** Not applicable (both frontend and backend use HTTPS)

### 2. Failed API Requests
- CORS errors can trigger security warnings
- Failed authentication attempts
- **Your case:** Likely this - CORS blocking legitimate requests

### 3. Certificate Issues
- Invalid SSL certificate
- Certificate name mismatch
- **Your case:** Not applicable (certificate is valid)

### 4. Insecure Form Submission
- Forms submitting over HTTP
- **Your case:** Not applicable (using HTTPS)

Once CORS is fixed, the "Not Secure" warning should disappear.

## Summary

**Problem:** CORS error blocking API requests from `dev.samwylock.com`  
**Cause:** Backend CORS not configured to allow `dev.samwylock.com`  
**Fix:** Add `https://dev.samwylock.com` to backend CORS allowed_origins  
**Action:** Update backend code and redeploy  

## Backend Code Change Needed

**File:** `api/main.py` (or wherever CORS is configured)

**Find this:**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
    ],
    # ...
)
```

**Change to:**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://dev.samwylock.com",       # ← ADD THIS
        "https://admin.samwylock.com",     # Production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Then:**
1. Commit and push backend changes
2. Redeploy backend (ECS task will pull new Docker image)
3. Wait 2-3 minutes for deployment
4. Test login again from `https://dev.samwylock.com`

---

**Once backend CORS is updated, your login will work and the site will show as secure! 🎉**
