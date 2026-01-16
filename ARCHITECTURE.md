# Architecture Overview

## AWS S3 + CloudFront Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        User's Browser                           │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Next.js App (React Components)                          │ │
│  │  - Login Page                                            │ │
│  │  - Gallery Page                                          │ │
│  │  - Upload Page                                           │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CloudFront Distribution                       │
│                     (Global CDN - Edge Locations)               │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  - SSL/TLS Termination                                   │ │
│  │  - Caching (static assets: 1 year, HTML: no-cache)      │ │
│  │  - Gzip/Brotli Compression                               │ │
│  │  - Custom Error Pages (SPA routing support)             │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ Origin Access Identity
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                       S3 Bucket (Private)                        │
│                    hover-admin-frontend-dev                      │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  /index.html                                             │ │
│  │  /_next/static/...                                       │ │
│  │  /favicon.ico                                            │ │
│  │  /gallery/index.html                                     │ │
│  │  /upload/index.html                                      │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ API Calls
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Application Load Balancer (ALB)                │
│          hovver-admin-alb-2080077084.us-east-1.elb...          │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend API (FastAPI)                       │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  /auth/login    - Authentication                         │ │
│  │  /auth/me       - Get current user                       │ │
│  │  /images/upload - Upload to S3                           │ │
│  │  /images/list   - List images with presigned URLs        │ │
│  │  /images/{key}  - Delete image                           │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
        ┌────────────────────────────────────────┐
        │        AWS Cognito User Pool           │
        │        (User Authentication)           │
        └────────────────────────────────────────┘
                            │
                            ▼
        ┌────────────────────────────────────────┐
        │       S3 Bucket (Image Storage)        │
        │       hovver-images-dev                │
        │                                        │
        │  /2026/01/15/image1.png               │
        │  /2026/01/15/image2.jpg               │
        └────────────────────────────────────────┘
```

## Data Flow

### 1. Initial Page Load
```
User → CloudFront → S3 → HTML/CSS/JS → CloudFront (cached) → User
```

### 2. User Login
```
User → Frontend → ALB → Backend API → Cognito → JWT Token → User
```

### 3. View Gallery
```
User → Frontend → ALB → Backend API → S3 (presigned URLs) → Frontend → User
```

### 4. Upload Image
```
User → Frontend → ALB → Backend API → S3 Bucket → Success → Frontend
```

### 5. Delete Image
```
User → Frontend → ALB → Backend API → S3 Delete → Success → Frontend
```

## Security Model

### Frontend (Static Site)
- ✅ Served over HTTPS (CloudFront)
- ✅ S3 bucket is private (no public access)
- ✅ Only CloudFront can access S3 (OAI)
- ✅ Static files cached at edge locations

### API Communication
- 🔒 JWT tokens in localStorage
- 🔒 Bearer token authentication
- 🔒 All API calls over HTTP (currently) - **Should be HTTPS in production**

### Image Storage
- 🔒 Images in private S3 bucket
- 🔒 Access via presigned URLs (1-hour expiry)
- 🔒 Upload requires authentication

## Cost Breakdown

| Service | Usage | Monthly Cost |
|---------|-------|--------------|
| S3 Storage | 1 GB | $0.02 |
| S3 Requests | 1000 GET | $0.01 |
| CloudFront Data Transfer | 10 GB | $0.85 |
| CloudFront Requests | 10,000 | $0.01 |
| Route53 Hosted Zone | 1 zone | $0.50 |
| **Total** | | **~$1.50/month** |

*Costs increase with traffic. First 1TB CloudFront transfer/month is free tier eligible.*

## Terraform Resources

```hcl
# Created by terraform apply:
- aws_s3_bucket.website
- aws_s3_bucket_public_access_block.website
- aws_s3_bucket_website_configuration.website
- aws_s3_bucket_policy.website
- aws_cloudfront_origin_access_identity.website
- aws_cloudfront_distribution.website
- aws_route53_record.website (optional)
```

## Deployment Pipeline

### Manual Deployment
```
npm run build → S3 Sync → CloudFront Invalidation → Live
```

### CI/CD (GitHub Actions)
```
Git Push → GitHub Actions → Build → S3 Sync → CF Invalidation → Live
```

## Performance Optimizations

1. **CloudFront Caching**
   - Static assets: 1 year (immutable)
   - HTML files: No cache (dynamic routing)
   - Images: Cached at edge locations

2. **Compression**
   - Gzip/Brotli enabled
   - Reduces transfer size by ~70%

3. **Global Distribution**
   - Edge locations worldwide
   - Low latency for users globally

4. **HTTP/2**
   - Multiplexing
   - Server push support
   - Header compression

## Scalability

| Metric | Limit |
|--------|-------|
| **Users** | Unlimited (CloudFront auto-scales) |
| **Storage** | Unlimited (S3 auto-scales) |
| **Bandwidth** | Unlimited (pay per GB) |
| **Requests** | Unlimited (CloudFront handles) |

## Monitoring

### CloudWatch Metrics
- CloudFront requests/errors
- S3 bucket metrics
- Data transfer

### Logs
- CloudFront access logs (optional)
- S3 access logs (optional)

## Disaster Recovery

### Backup Strategy
- S3 versioning (not enabled by default)
- Cross-region replication (optional)
- Terraform state in S3 backend (recommended)

### Recovery Time
- Infrastructure: ~15 minutes (terraform apply)
- Content: ~5 minutes (deploy script)
- DNS propagation: 5-30 minutes (if custom domain)

## Future Enhancements

1. **Enable S3 versioning** for file history
2. **Add WAF** for security rules
3. **Enable CloudFront logging** for analytics
4. **Multiple environments** (dev/staging/prod)
5. **Blue-green deployments**
6. **Lambda@Edge** for advanced routing

