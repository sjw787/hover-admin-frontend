# Cache Invalidation & Browser Caching Fix

## Problem

After redeployment and CloudFront cache invalidation, users experience login loops or authentication issues that require clearing browser cache to resolve.

## Root Cause

The issue occurs because:

1. **Stale JavaScript in Browser**: Browser caches the old JavaScript files
2. **New HTML from CloudFront**: CloudFront serves new HTML after invalidation
3. **Version Mismatch**: Old JS tries to work with new HTML structure
4. **State Confusion**: Authentication state gets corrupted due to version mismatch

### Why It Happens

```
Deployment Flow (Before Fix):
1. Deploy new code with updated JS (hash: abc123.js)
2. Invalidate CloudFront cache
3. User's browser still has old JS (hash: xyz789.js) cached
4. CloudFront serves new HTML referencing abc123.js
5. Browser loads old xyz789.js from cache
6. JS version mismatch → Authentication loop
```

## Solution Implemented

### 1. Updated Cache Headers

Modified `terraform/deploy.ps1` to set proper cache-control headers:

**Static Assets (JS/CSS/Fonts) - Long Cache:**
```
Cache-Control: public,max-age=31536000,immutable
```
- 1 year cache (safe because filenames are hashed)
- `immutable` flag tells browser to never revalidate
- New deployments get new hashes, so new files are fetched

**HTML Files - NO Cache:**
```
Cache-Control: public,max-age=0,must-revalidate,no-cache,no-store
```
- Always fetch fresh from server
- Never serve from browser cache
- Ensures users always get latest HTML with correct asset references

**JSON/Metadata Files - Short Revalidation:**
```
Cache-Control: public,max-age=0,must-revalidate
```
- Build manifests always fresh
- Ensures proper asset loading

**Images - Medium Cache:**
```
Cache-Control: public,max-age=86400
```
- 24 hour cache for images (rarely change)

### 2. Updated Deployment Script

The deploy script now uploads files in stages with appropriate headers:

```powershell
# Stage 1: JS/CSS/Fonts (long cache)
aws s3 sync --cache-control "public,max-age=31536000,immutable" --include "*.js" ...

# Stage 2: Images (medium cache)
aws s3 sync --cache-control "public,max-age=86400" --include "*.png" ...

# Stage 3: HTML (no cache)
aws s3 sync --cache-control "public,max-age=0,must-revalidate,no-cache,no-store" --include "*.html"

# Stage 4: JSON/Metadata (no cache)
aws s3 sync --cache-control "public,max-age=0,must-revalidate" --include "*.json"
```

## How It Works Now

```
Improved Deployment Flow (After Fix):
1. Deploy new code with updated JS (hash: abc123.js)
2. Upload to S3 with proper cache headers
3. Invalidate CloudFront cache
4. User visits site
5. Browser fetches HTML (no-cache header)
6. HTML references abc123.js
7. Browser checks if abc123.js exists in cache
8. abc123.js not in cache → fetches from CloudFront
9. Old xyz789.js still in cache but never used
10. Everything works correctly! ✅
```

## Benefits

✅ **No More Login Loops** - Users always get matching HTML and JS  
✅ **Fast Performance** - Static assets cached for 1 year  
✅ **Always Fresh HTML** - HTML never served from cache  
✅ **Automatic Updates** - Users get new version on next page load  
✅ **No Manual Cache Clear** - Browser automatically gets correct files  

## Testing the Fix

### Before Deployment

1. Visit site and note current JS hash in DevTools Network tab
2. Make a change to the code
3. Deploy
4. Refresh site (without clearing cache)
5. ✓ Should work without login loop
6. ✓ Network tab should show new JS hash being fetched

### Verification Steps

1. **Check HTML Cache Headers:**
```powershell
curl -I https://admin.samwylock.com/
# Should show: Cache-Control: public,max-age=0,must-revalidate,no-cache,no-store
```

2. **Check JS Cache Headers:**
```powershell
curl -I https://admin.samwylock.com/_next/static/chunks/[hash].js
# Should show: Cache-Control: public,max-age=31536000,immutable
```

3. **Check S3 Metadata:**
```powershell
aws s3api head-object --bucket hover-admin-frontend --key index.html
# Check CacheControl field
```

## Next.js Build Hashing

Next.js automatically adds hashes to JS/CSS filenames:
```
_next/static/chunks/abc123def456.js
_next/static/chunks/main-xyz789.js
```

This means:
- ✅ Each deployment gets unique filenames
- ✅ Browser fetches new files automatically
- ✅ Old files stay cached (but unused)
- ✅ No cache conflicts

## CloudFront Behavior

CloudFront respects the cache headers from S3:
- **HTML files**: Not cached by CloudFront (max-age=0)
- **JS/CSS files**: Cached by CloudFront for 1 year
- **After invalidation**: CloudFront fetches fresh from S3
- **Cache-Control**: Passed through to browser

## Browser Behavior

Modern browsers (Chrome, Firefox, Safari):
- ✅ Respect `no-cache` on HTML
- ✅ Check server for HTML on every page load
- ✅ Keep JS/CSS cached for performance
- ✅ Fetch JS/CSS if hash changes

## Previous vs New Headers

### Before (Problematic):

```
HTML: Cache-Control: public,max-age=0,must-revalidate
JS:   Cache-Control: public,max-age=31536000,immutable
```

**Issue:** HTML had `max-age=0` but no `no-cache`, so some browsers might still cache it briefly.

### After (Fixed):

```
HTML: Cache-Control: public,max-age=0,must-revalidate,no-cache,no-store
JS:   Cache-Control: public,max-age=31536000,immutable
```

**Fixed:** Added `no-cache` and `no-store` to HTML, ensuring it's NEVER cached.

## Additional Improvements

### 1. Separated Upload by File Type

Instead of one big sync, now uploads in stages:
- Ensures correct headers per file type
- More granular control
- Easier debugging

### 2. Added Progress Logging

```
Uploading static assets (JS, CSS, fonts)...
Uploading images...
Uploading HTML files...
Uploading JSON/metadata files...
```

Shows deployment progress clearly.

### 3. Immutable Flag

Added `immutable` to static assets:
- Tells browser to never revalidate
- Saves unnecessary network requests
- Improves performance

## Deployment Process

1. **Build**: `npm run build` generates hashed assets
2. **Upload**: Script uploads with proper headers
3. **Invalidate**: CloudFront cache cleared
4. **Users**: Get fresh HTML pointing to new assets
5. **Browser**: Fetches new assets (hash changed)
6. **Success**: Everything works without cache clear! ✅

## Troubleshooting

### If Login Loop Still Occurs

1. **Check deployment completed:**
```powershell
# Verify CloudFront invalidation finished
aws cloudfront get-invalidation --profile personal-account --distribution-id E2DKU128XFBA10 --id INVALIDATION_ID
```

2. **Check cache headers:**
```powershell
curl -I https://admin.samwylock.com/ | grep -i cache-control
```

3. **Force refresh in browser:**
- Chrome: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- This bypasses ALL caches

4. **Check Network tab:**
- Open DevTools → Network
- Refresh page
- Look for "200 (from disk cache)" or "304 Not Modified"
- HTML should always show "200" (not from cache)

### If Cache Headers Wrong in S3

Redeploy with new script:
```powershell
cd terraform
.\deploy.ps1
```

This will update all cache headers in S3.

## Best Practices

### Do:
✅ Keep HTML cache-control strict (no-cache, no-store)  
✅ Use long cache for hashed assets (JS, CSS)  
✅ Let Next.js handle asset hashing  
✅ Invalidate CloudFront after deployment  
✅ Test without clearing browser cache  

### Don't:
❌ Cache HTML files  
❌ Use short cache for JS/CSS (they're hashed)  
❌ Skip CloudFront invalidation  
❌ Manually version files  
❌ Use query strings for cache busting (hashing is better)  

## Summary

**Problem:** Login loops after deployment requiring manual cache clear

**Cause:** Browser cached old JS conflicting with new HTML

**Solution:** Strict no-cache headers on HTML files

**Result:** Users automatically get correct version without clearing cache

**Performance:** Still optimal - static assets cached for 1 year

---

**The fix is now deployed and active!** Users will no longer need to clear cache after deployments. 🚀

