# ✅ FIX: Certificate Errors from Active Content (S3 Images)

## The Issue

Chrome DevTools Security tab shows:
```
Resources - active content with certificate errors
You have recently allowed content loaded with certificate errors 
(such as iframes or scripts) to run on this site
```

## Root Cause

Your frontend is loading **S3 images via presigned URLs** from the backend API. These URLs might have certificate issues:

### Possible Causes:

#### 1. HTTP URLs Instead of HTTPS (Most Likely)
The backend API might be generating **HTTP** presigned URLs instead of **HTTPS**:
```
❌ http://bucket-name.s3.amazonaws.com/image.jpg
✅ https://bucket-name.s3.amazonaws.com/image.jpg
```

#### 2. Old/Legacy S3 Bucket URL Format
S3 has different URL formats, and older formats may have certificate issues:
```
❌ http://s3.amazonaws.com/bucket-name/image.jpg  (HTTP)
❌ https://bucket-name.s3.amazonaws.com/image.jpg (path-style, may have cert issues)
✅ https://bucket-name.s3.us-east-1.amazonaws.com/image.jpg (virtual-hosted style)
```

#### 3. Self-Signed or Invalid Certificate
If using CloudFront or custom domain for S3, the certificate might be invalid.

## Where the Problem Is

**Location:** Backend API (Python/FastAPI) generating presigned URLs

**File:** Likely `api/services/s3.py` or similar

**Code generating presigned URLs:**
```python
# Problematic code (HTTP)
url = s3_client.generate_presigned_url(
    'get_object',
    Params={'Bucket': bucket_name, 'Key': key},
    ExpiresIn=3600
)
```

## The Fix (Backend Required)

### Option 1: Force HTTPS in Presigned URL Generation

**In your backend S3 service:**

```python
# api/services/s3.py or wherever S3 URLs are generated

import boto3
from botocore.config import Config

# Configure S3 client to use HTTPS and virtual-hosted-style addressing
s3_config = Config(
    signature_version='s3v4',
    s3={'addressing_style': 'virtual'}  # Use virtual-hosted style
)

s3_client = boto3.client(
    's3',
    region_name='us-east-1',
    config=s3_config
)

def generate_presigned_url(bucket_name: str, key: str, expiration: int = 3600) -> str:
    """Generate HTTPS presigned URL"""
    try:
        url = s3_client.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': bucket_name,
                'Key': key
            },
            ExpiresIn=expiration
        )
        
        # Force HTTPS if not already
        if url.startswith('http://'):
            url = url.replace('http://', 'https://', 1)
        
        return url
    except Exception as e:
        raise Exception(f"Error generating presigned URL: {str(e)}")
```

### Option 2: Use CloudFront Instead of Direct S3 URLs

If you have a CloudFront distribution for your S3 bucket, use CloudFront URLs instead:

```python
def generate_cloudfront_url(distribution_domain: str, key: str) -> str:
    """Generate CloudFront URL (always HTTPS)"""
    return f"https://{distribution_domain}/{key}"
```

### Option 3: Ensure S3 Bucket is in Same Region

Make sure the S3 bucket is in the same region as your API and use regional endpoint:

```python
# Use regional endpoint
s3_client = boto3.client(
    's3',
    region_name='us-east-1',  # Same region as your API
    config=Config(signature_version='s3v4')
)
```

## Verify S3 URLs in Backend Logs

Check your backend CloudWatch logs to see what URLs are being generated:

```powershell
# View backend logs
aws logs tail /ecs/hovver-admin-api --follow --profile iamadmin-dev --region us-east-1 | Select-String "presigned"
```

Look for URLs like:
- ❌ `http://...` - Need to fix (force HTTPS)
- ✅ `https://bucket.s3.region.amazonaws.com/...` - Good
- ✅ `https://cloudfront-domain.cloudfront.net/...` - Good

## Frontend Improvements (Optional)

While the backend fix is required, you can also add better error handling in the frontend:

**In `src/app/(protected)/gallery/page.tsx`:**

```tsx
// Add CSP meta tag or referrer policy
<img
  src={image.url}
  alt={image.key}
  referrerPolicy="no-referrer"
  onError={() => {
    console.error('Failed to load image:', image.url);
    handleImageError(image.key);
  }}
  onLoad={() => handleImageLoad(image.key)}
/>
```

**Better: Add a URL validation/sanitization function:**

```tsx
// In src/lib/api.ts or a new utils file
export function ensureHttpsUrl(url: string): string {
  if (!url) return url;
  
  // Force HTTPS
  if (url.startsWith('http://')) {
    return url.replace('http://', 'https://');
  }
  
  return url;
}

// Then use in the component
<img src={ensureHttpsUrl(image.url)} ... />
```

## Check S3 Bucket Configuration

Verify your S3 bucket settings:

```powershell
# Get bucket location
aws s3api get-bucket-location --bucket YOUR_BUCKET_NAME --profile iamadmin-dev

# Check if bucket has a policy that might affect URLs
aws s3api get-bucket-policy --bucket YOUR_BUCKET_NAME --profile iamadmin-dev
```

## Test Presigned URLs

You can test if presigned URLs are working correctly:

```powershell
# Get a presigned URL from your API
# Then test it with curl
curl -I "YOUR_PRESIGNED_URL"
```

**Look for:**
- Status: `200 OK` or `403 Forbidden` (both are fine - means URL is reachable)
- Protocol: Should be HTTPS
- Certificate: Should be valid

## Why This Causes "Not Secure" Warning

1. **Your site:** `https://dev.samwylock.com` (HTTPS) ✅
2. **API calls:** `https://api.samwylock.com` (HTTPS) ✅
3. **S3 images:** `http://bucket.s3.amazonaws.com/...` (HTTP) ❌

This is **mixed content** - HTTPS site loading HTTP resources. Chrome blocks this and shows:
- "Not Secure" warning
- "Active content with certificate errors"

## Summary

**Problem:** S3 presigned URLs are HTTP or have certificate issues
**Location:** Backend API generating the URLs
**Fix Required:** Update backend to generate HTTPS presigned URLs
**Timeline:** Requires backend code change and redeployment

## Backend Code Change Needed

**Find this code in backend** (likely `api/services/s3.py` or `api/main.py`):

```python
# Current code (problematic)
url = s3_client.generate_presigned_url(
    'get_object',
    Params={'Bucket': bucket, 'Key': key},
    ExpiresIn=3600
)
```

**Change to:**

```python
# Fixed code
from botocore.config import Config

s3_config = Config(
    signature_version='s3v4',
    s3={'addressing_style': 'virtual'}
)

s3_client = boto3.client('s3', region_name='us-east-1', config=s3_config)

url = s3_client.generate_presigned_url(
    'get_object',
    Params={'Bucket': bucket, 'Key': key},
    ExpiresIn=3600
)

# Force HTTPS
if url.startswith('http://'):
    url = url.replace('http://', 'https://', 1)
```

## After the Fix

Once backend is updated and redeployed:
1. ✅ All S3 URLs will be HTTPS
2. ✅ No certificate errors
3. ✅ Chrome shows "Secure" with green padlock
4. ✅ Images load properly
5. ✅ No mixed content warnings

---

**This requires a backend code change.** Update the S3 presigned URL generation to use HTTPS, then redeploy.
