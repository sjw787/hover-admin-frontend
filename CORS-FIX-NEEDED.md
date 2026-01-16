# CORS Configuration Required for Backend

## Current Error

```
Access to fetch at 'https://api.samwylock.com/auth/login' from origin 'https://admin.samwylock.com' 
has been blocked by CORS policy: Response to preflight request doesn't pass access control check: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## What This Means

Your backend API at `https://api.samwylock.com` needs to allow requests from your frontend at `https://admin.samwylock.com`.

## Backend Fix Required

### For FastAPI (Python)

Update your backend to include CORS middleware:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://admin.samwylock.com",  # Your frontend domain
        "http://localhost:3000",         # For local development
    ],
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers
)

# Your existing routes...
```

### For Express (Node.js)

```javascript
const express = require('express');
const cors = require('cors');

const app = express();

// Add CORS middleware
app.use(cors({
    origin: [
        'https://admin.samwylock.com',
        'http://localhost:3000'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Your existing routes...
```

### For Django (Python)

Install django-cors-headers:
```bash
pip install django-cors-headers
```

In `settings.py`:
```python
INSTALLED_APPS = [
    # ...
    'corsheaders',
    # ...
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # Add this at the top
    # ...other middleware...
]

# CORS settings
CORS_ALLOWED_ORIGINS = [
    "https://admin.samwylock.com",
    "http://localhost:3000",
]

CORS_ALLOW_CREDENTIALS = True
```

## Testing After Backend Update

### 1. Check CORS Headers

After updating the backend, test that CORS headers are present:

```powershell
# Test preflight (OPTIONS request)
Invoke-WebRequest -Uri "https://api.samwylock.com/auth/login" `
    -Method OPTIONS `
    -Headers @{
        "Origin" = "https://admin.samwylock.com"
        "Access-Control-Request-Method" = "POST"
        "Access-Control-Request-Headers" = "Content-Type"
    } `
    -UseBasicParsing
```

**Expected response headers:**
```
Access-Control-Allow-Origin: https://admin.samwylock.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
```

### 2. Test Actual Request

```powershell
Invoke-WebRequest -Uri "https://api.samwylock.com/auth/login" `
    -Method POST `
    -Headers @{
        "Origin" = "https://admin.samwylock.com"
        "Content-Type" = "application/json"
    } `
    -Body '{"username":"test","password":"test"}' `
    -UseBasicParsing
```

Should return response with `Access-Control-Allow-Origin` header.

## Temporary Workaround (Development Only)

While waiting for backend CORS fix, you can:

### Option 1: Browser Extension

Install a CORS unblocker extension:
- Chrome: "CORS Unblock" or "Allow CORS"
- Firefox: "CORS Everywhere"

⚠️ **Only for testing! Don't use in production!**

### Option 2: Use HTTP Endpoint Temporarily

If the HTTP endpoint doesn't have CORS issues:

```bash
# Update .env.production
NEXT_PUBLIC_API_URL=http://hovver-admin-alb-2080077084.us-east-1.elb.amazonaws.com
```

Then rebuild and deploy.

⚠️ **This causes Mixed Content warnings (HTTPS → HTTP)**

## What NOT to Do

❌ **Don't** try to fix CORS in the frontend
❌ **Don't** disable browser security
❌ **Don't** use proxies in production

## The Proper Solution

✅ **Update backend CORS configuration** to allow `https://admin.samwylock.com`

## After Backend is Updated

Once the backend CORS is configured:

1. **No changes needed in frontend** - it's already configured to use `https://api.samwylock.com`
2. **Just clear browser cache** and refresh
3. **Login should work immediately**

## Verification Steps

1. ✅ Backend updated with CORS middleware
2. ✅ Backend deployed/restarted
3. ✅ Test OPTIONS request shows CORS headers
4. ✅ Test POST request works
5. ✅ Frontend login works without errors

## Backend Repository Location

You mentioned the backend is in another repository. Update the CORS configuration there, then:

```bash
# After backend update
cd /path/to/backend
# Deploy your backend changes
# (however you normally deploy)

# Then test
curl -H "Origin: https://admin.samwylock.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://api.samwylock.com/auth/login -v
```

## Summary

**Problem:** Backend doesn't allow requests from `https://admin.samwylock.com`

**Solution:** Add CORS middleware to backend allowing `https://admin.samwylock.com`

**Frontend:** Already configured correctly - no changes needed

**Next Step:** Update backend CORS configuration in the other repository

