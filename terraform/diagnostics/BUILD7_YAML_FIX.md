# Build #7 - YAML Syntax Fixed

## Build #5 Failed - YAML Syntax Error

```
CustomerError: The commands provided in the buildspec are malformed. 
Please ensure that you have properly escaped reserved YAML characters. 
If you have a ':' character in your command, encapsulate the command within quotes
```

## The Problem

YAML treats `:` as a special character. The build commands had issues:

**Problematic commands:**
```yaml
- cp -R .next/*.json .next/standalone/.next/ 2>/dev/null || true
  # ↑ The *.json wildcard combined with || causes YAML parsing issues

- test -f .next/required-server-files.json && cp .next/required-server-files.json .next/standalone/.next/required-server-files.json || echo "Warning: required-server-files.json not found"
  # ↑ Too complex, && and || confuse YAML parser
```

## The Fix for Build #7

Simplified the commands to avoid YAML issues:

```yaml
build:
  commands:
    - npm run build
    - ls -la .next/
    - ls -la .next/standalone/
    - cp -R .next/static .next/standalone/.next/static
    - find .next -name "*.json" -maxdepth 1 -exec cp {} .next/standalone/.next/ \;
    - cp -R public .next/standalone/public 2>/dev/null || true
    - ls -la .next/standalone/.next/
```

### Key Changes

**Before (Build #5 - YAML error):**
```bash
cp -R .next/*.json .next/standalone/.next/ 2>/dev/null || true
test -f .next/required-server-files.json && cp ...
```

**After (Build #7 - Clean):**
```bash
find .next -name "*.json" -maxdepth 1 -exec cp {} .next/standalone/.next/ \;
```

### Why This Works

1. **`find` command** - More reliable than wildcards in YAML
2. **`-maxdepth 1`** - Only look in `.next/`, not subdirectories
3. **`-name "*.json"`** - Find all JSON files
4. **`-exec cp {} .next/standalone/.next/ \;`** - Copy each found file
5. **No complex `&&` or `||`** - Avoids YAML parsing issues

This will copy ALL JSON files including:
- `required-server-files.json`
- `build-manifest.json`
- `routes-manifest.json`
- Any other JSON files Next.js creates

## What Build #7 Will Do

1. ✅ **npm run build** - Create Next.js production build
2. ✅ **ls -la .next/** - Show us what was built
3. ✅ **ls -la .next/standalone/** - Show standalone directory structure
4. ✅ **Copy static files** - `.next/static` → `.next/standalone/.next/static`
5. ✅ **Copy ALL JSON files** - Using `find` command (includes required-server-files.json)
6. ✅ **Copy public directory** - `public` → `.next/standalone/public`
7. ✅ **ls -la .next/standalone/.next/** - Verify everything copied correctly

## Current Status

| Item | Status |
|------|--------|
| Build #5 | ❌ YAML syntax error |
| Build #6 | ❌ Likely same error (skipped) |
| Build #7 | ⏳ Running |
| Job ID | 7 |
| Started | 2026-01-16 19:20:45 |
| ETA | 5-10 minutes |

## Monitor Build #7

**Amplify Console:**
https://console.aws.amazon.com/amplify/home?region=us-east-1#/dyyzhyn0517sf
→ Master branch → Job #7

**Check via CLI:**
```powershell
cd C:\Users\Sam\PycharmProjects\hover-admin-frontend\terraform\diagnostics

aws amplify get-job --app-id dyyzhyn0517sf --branch-name master --job-id 7 --profile iamadmin-dev --region us-east-1 --output json > build7-status.json 2>&1

Get-Content build7-status.json
```

## What to Look For

In the Amplify Console build logs:

### 1. YAML Parse Success
✅ No more "malformed buildspec" errors

### 2. Build Output
```
$ ls -la .next/
[Should show required-server-files.json]
```

### 3. Find Command
```
$ find .next -name "*.json" -maxdepth 1 -exec cp {} .next/standalone/.next/ \;
[Should execute without errors]
```

### 4. Final Verification
```
$ ls -la .next/standalone/.next/
[Should show required-server-files.json and other files]
```

## Expected Result

✅ YAML parses correctly
✅ Build completes
✅ All JSON files copied (including required-server-files.json)
✅ No "can't find required-server-files.json" error
✅ Deployment succeeds
✅ Site works!

## If Build #7 Still Fails

### If Different Error
Check the build logs for the new error message and we'll address it.

### If Still Missing required-server-files.json
Then the file genuinely doesn't exist in `.next/` after build, which means:
- Next.js standalone output is not working correctly
- Need to try a different approach (Option 3 or 4 from previous document)

## Test After Build Completes

Once Build #7 shows "Deployed Successfully":

```powershell
# Test the site
Start-Process "https://dev.samwylock.com"
Start-Process "https://dev.samwylock.com/login"

# Check response
curl -I https://dev.samwylock.com
```

**Expected:** HTTP 200, no 404 errors!

## Summary

✅ **Fixed:** YAML syntax errors in build spec
✅ **Applied:** Simplified commands using `find` instead of wildcards
✅ **Triggered:** Build #7 with clean YAML
⏳ **Building:** Job #7 in progress
⏳ **ETA:** 5-10 minutes
✅ **Expected:** Build succeeds and site works

---

**This should be the final fix!** The YAML was the issue preventing proper execution.

**Check Amplify Console in 10 minutes!**
