# Hover Admin Frontend - Terraform Infrastructure

This directory contains Terraform configuration for deploying the Next.js frontend to AWS S3 + CloudFront.

## Architecture

```
Next.js App (Static Export)
    ↓
S3 Bucket (Private)
    ↓
CloudFront Distribution (CDN)
    ↓
Users
```

## Prerequisites

1. **AWS CLI** configured with credentials
   ```bash
   aws configure
   ```

2. **Terraform** installed (v1.0+)
   ```bash
   # Windows (chocolatey)
   choco install terraform
   
   # macOS
   brew install terraform
   
   # Or download from: https://www.terraform.io/downloads
   ```

3. **Next.js app built as static export**
   - Update `next.config.ts` to enable static export

## Setup

### 1. Configure Next.js for Static Export

Update `next.config.ts`:

```typescript
const nextConfig: NextConfig = {
  output: 'export',  // Enable static export
  images: {
    unoptimized: true,  // Required for static export
  },
  // ... rest of config
};
```

### 2. Initialize Terraform

```bash
cd terraform
terraform init
```

### 3. Configure Variables (Optional)

Copy the example file:
```bash
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` to customize:
```hcl
aws_region  = "us-east-1"
environment = "prod"

# Optional: Add custom domain
domain_name          = "admin.yourdomain.com"
acm_certificate_arn  = "arn:aws:acm:us-east-1:xxxxx"
route53_zone_id      = "Z1234567890ABC"
```

### 4. Plan and Apply

Review changes:
```bash
terraform plan
```

Apply infrastructure:
```bash
terraform apply
```

## Deployment Workflow

### Build and Deploy Script

Create a deployment script or use this manual process:

```bash
# 1. Build Next.js app for static export
cd ..
npm run build

# 2. Sync to S3 (after terraform apply)
aws s3 sync out/ s3://$(terraform -chdir=terraform output -raw s3_bucket_name) --delete

# 3. Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id $(terraform -chdir=terraform output -raw cloudfront_distribution_id) \
  --paths "/*"
```

## Automated Deployment Script

See `deploy.sh` (Linux/Mac) or `deploy.ps1` (Windows) for automated deployment.

## Resources Created

- **S3 Bucket**: Hosts static files (private)
- **CloudFront Distribution**: CDN for global distribution
- **CloudFront OAI**: Allows CloudFront to access private S3 bucket
- **S3 Bucket Policy**: Grants CloudFront access to S3
- **Route53 Record** (optional): DNS for custom domain

## Costs

Estimated monthly costs (low traffic):
- S3 Storage: ~$0.50
- CloudFront: ~$1-5 (first 1TB free tier)
- Route53 (if used): ~$0.50

**Total: ~$2-6/month**

## Configuration Options

### CloudFront Price Classes

- `PriceClass_100`: US, Canada, Europe (cheapest) ✅ Default
- `PriceClass_200`: + Asia, Middle East, Africa
- `PriceClass_All`: All edge locations globally

### Custom Domain Setup

1. Request ACM certificate in **us-east-1** (required for CloudFront)
2. Add certificate ARN to `terraform.tfvars`
3. Add Route53 zone ID
4. Run `terraform apply`

## Outputs

After `terraform apply`, you'll get:

```bash
terraform output website_url
# Output: https://d1234567890.cloudfront.net
```

## Destroy Infrastructure

To remove all resources:

```bash
# Empty S3 bucket first
aws s3 rm s3://$(terraform output -raw s3_bucket_name) --recursive

# Destroy infrastructure
terraform destroy
```

## Troubleshooting

### Issue: 403 Forbidden

- Check CloudFront OAI has access to S3
- Verify S3 bucket policy is applied

### Issue: 404 on routes

- CloudFront is configured to redirect 404s to index.html
- Ensure `output: 'export'` is set in next.config.ts

### Issue: Outdated content

- Run CloudFront invalidation:
  ```bash
  aws cloudfront create-invalidation \
    --distribution-id YOUR_DIST_ID \
    --paths "/*"
  ```

## Security Notes

- S3 bucket is **private** (not public)
- Access only through CloudFront
- HTTPS enforced (HTTP redirects to HTTPS)
- Origin Access Identity prevents direct S3 access

## Backend API Configuration

Don't forget to update `.env.production`:

```env
NEXT_PUBLIC_API_URL=http://hovver-admin-alb-2080077084.us-east-1.elb.amazonaws.com
```

Or set environment-specific variables in your build process.

