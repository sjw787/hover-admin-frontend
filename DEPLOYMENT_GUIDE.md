# Deployment Guide - Multi-User Role Frontend

## Build Information

**Build Date:** January 16, 2026  
**Next.js Version:** 16.1.2  
**Build Type:** Server-side rendering with dynamic routes  

## Deployment Options

### Option 1: Deploy to Vercel (Recommended)

Vercel is the easiest way to deploy Next.js applications.

1. **Push to GitHub**
```powershell
git add .
git commit -m "Implement multi-user role system"
git push origin main
```

2. **Connect to Vercel**
- Go to [vercel.com](https://vercel.com)
- Click "Import Project"
- Select your GitHub repository
- Vercel will auto-detect Next.js configuration

3. **Configure Environment Variables**
Add the following in Vercel dashboard:
```
NEXT_PUBLIC_API_URL=https://your-backend-api.com
```

4. **Deploy**
- Click "Deploy"
- Vercel will build and deploy automatically
- You'll get a production URL

### Option 2: Deploy to AWS Amplify

AWS Amplify provides seamless AWS integration.

1. **Create Amplify App**
```powershell
# Install Amplify CLI
npm install -g @aws-amplify/cli

# Initialize Amplify
amplify init

# Add hosting
amplify add hosting
# Select: Hosting with Amplify Console
```

2. **Connect to Git Repository**
- Go to AWS Amplify Console
- Click "New app" → "Host web app"
- Connect your GitHub/GitLab/Bitbucket repository
- Select the repository and branch

3. **Configure Build Settings**
Amplify should auto-detect Next.js. If needed, use:
```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

4. **Set Environment Variables**
```
NEXT_PUBLIC_API_URL=https://your-backend-api.com
```

5. **Deploy**
- Save and deploy
- Amplify will build and provide a URL

### Option 3: Deploy to Docker Container

For self-hosting or AWS ECS/EKS deployment.

1. **Create Dockerfile**
```dockerfile
# Create this file: Dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set correct permissions
RUN mkdir .next
RUN chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

2. **Update next.config.ts for Standalone**
```typescript
const nextConfig: NextConfig = {
  reactCompiler: true,
  output: 'standalone', // Add this for Docker
  // ... rest of config
};
```

3. **Build and Push Docker Image**
```powershell
# Build
docker build -t hover-admin-frontend:latest .

# Tag for ECR
docker tag hover-admin-frontend:latest YOUR_ECR_REPO_URL:latest

# Push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ECR_REPO_URL
docker push YOUR_ECR_REPO_URL:latest
```

4. **Deploy to ECS**
- Update ECS task definition with new image
- Set environment variables in task definition
- Deploy new task revision

### Option 4: Deploy to Traditional Node.js Hosting

For services like Heroku, DigitalOcean App Platform, or traditional VPS.

1. **Prepare package.json Scripts**
Ensure these scripts exist:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  }
}
```

2. **Deploy to Heroku**
```powershell
# Login to Heroku
heroku login

# Create app
heroku create hover-admin-frontend

# Set environment variables
heroku config:set NEXT_PUBLIC_API_URL=https://your-backend-api.com

# Deploy
git push heroku main

# Open app
heroku open
```

3. **Deploy to DigitalOcean App Platform**
- Go to DigitalOcean dashboard
- Click "Create" → "Apps"
- Connect your GitHub repository
- Select branch
- DigitalOcean will auto-detect Next.js
- Add environment variables
- Click "Deploy"

## Post-Deployment Configuration

### 1. Configure Backend CORS

Update your backend to allow requests from the frontend domain:

```python
# In backend FastAPI app
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Development
        "https://your-frontend-domain.vercel.app",  # Production
        "https://your-custom-domain.com",  # Custom domain
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 2. Setup Custom Domain (Optional)

**For Vercel:**
- Go to Project Settings → Domains
- Add your custom domain
- Update DNS records as instructed
- Vercel provides automatic HTTPS

**For Amplify:**
- Go to App Settings → Domain management
- Add custom domain
- Update DNS records
- Amplify provides automatic HTTPS

### 3. Configure Environment Variables

Make sure to set in your hosting platform:

```env
# Required
NEXT_PUBLIC_API_URL=https://your-backend-api.com

# Optional
NODE_ENV=production
```

### 4. Test Production Deployment

After deployment, test the following:

**Admin User Tests:**
- [ ] Login with admin credentials
- [ ] See "Admin" badge in header
- [ ] Access Customers page
- [ ] Create a new customer
- [ ] Upload file to customer folder
- [ ] Upload file to general folder
- [ ] Filter gallery by customer
- [ ] Delete an image

**Customer User Tests:**
- [ ] Login with customer credentials
- [ ] See "Customer" badge in header
- [ ] Cannot access Customers page (redirect to gallery)
- [ ] Cannot access Upload page (redirect to gallery)
- [ ] See only own files + general files in gallery
- [ ] Can view and download images
- [ ] No delete button on images

**Security Tests:**
- [ ] JWT tokens stored properly
- [ ] Tokens cleared on logout
- [ ] Session timeout works
- [ ] Unauthorized access redirects properly
- [ ] API requests include Bearer token
- [ ] CORS configured correctly

## Monitoring & Maintenance

### Setup Monitoring

**Vercel Analytics:**
```powershell
npm install @vercel/analytics
```

Add to `app/layout.tsx`:
```typescript
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

**Error Tracking (Sentry):**
```powershell
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

### Performance Optimization

1. **Enable Caching**
- Vercel/Amplify automatically handle caching
- For custom hosting, configure CDN (CloudFront, Cloudflare)

2. **Optimize Images**
- Already configured with `unoptimized: true` for S3 images
- Consider adding image optimization service

3. **Monitor Bundle Size**
```powershell
npm run build
# Check the output for bundle sizes
```

### Regular Maintenance

**Weekly:**
- Check error logs in hosting platform
- Monitor API response times
- Review failed login attempts

**Monthly:**
- Update dependencies: `npm update`
- Review and update customer list if needed
- Check storage usage in S3

**Quarterly:**
- Update Next.js: `npm install next@latest react@latest react-dom@latest`
- Review and update security policies
- Conduct security audit

## Rollback Procedure

If issues occur after deployment:

**Vercel:**
- Go to Deployments tab
- Find previous working deployment
- Click "..." → "Promote to Production"

**Amplify:**
- Go to App → Deployments
- Select previous successful build
- Click "Redeploy this version"

**Docker/ECS:**
```powershell
# Revert to previous task definition revision
aws ecs update-service \
  --cluster your-cluster \
  --service your-service \
  --task-definition your-task:PREVIOUS_REVISION
```

## Troubleshooting Deployment Issues

### Build Fails

**Issue:** TypeScript errors during build
```
Solution: Run `npm run build` locally first
Fix errors shown in output
Commit and push fixes
```

**Issue:** Missing dependencies
```
Solution: Ensure package.json is committed
Run `npm ci` instead of `npm install` in CI/CD
```

### Runtime Errors

**Issue:** "Cannot read properties of undefined"
```
Solution: Check environment variables are set
Verify NEXT_PUBLIC_API_URL is accessible
Check browser console for specific errors
```

**Issue:** CORS errors
```
Solution: Add frontend domain to backend CORS config
Verify API endpoint is accessible from browser
Check that cookies/auth headers are allowed
```

### Performance Issues

**Issue:** Slow page loads
```
Solution: Enable CDN/caching
Optimize images (use WebP format)
Review bundle size and remove unused dependencies
```

**Issue:** API timeouts
```
Solution: Increase timeout in api.ts (currently 15s)
Check backend performance
Consider implementing retry logic
```

## Support

For issues or questions:
1. Check IMPLEMENTATION_GUIDE.md for troubleshooting
2. Review IMPLEMENTATION_SUMMARY.md for architecture details
3. Check backend-context/ documentation for API details
4. Review Next.js documentation: https://nextjs.org/docs

## Changelog

**Version 1.0.0 - January 16, 2026**
- ✅ Initial multi-user role system implementation
- ✅ Admin and Customer user types
- ✅ Customer management pages
- ✅ Role-based gallery filtering
- ✅ Customer-specific file uploads
- ✅ Role badges in navigation
- ✅ Protected routes with redirects

