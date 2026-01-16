# Deployment Guide - AWS S3 + CloudFront

Complete guide for deploying the Hover Admin Frontend to AWS using Terraform.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Deploy Infrastructure](#deploy-infrastructure)
4. [Deploy Application](#deploy-application)
5. [Custom Domain Setup](#custom-domain-setup)
6. [CI/CD Setup](#cicd-setup)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Tools

- [AWS CLI](https://aws.amazon.com/cli/) - v2.x
- [Terraform](https://www.terraform.io/downloads) - v1.0+
- [Node.js](https://nodejs.org/) - v20.x
- [Git](https://git-scm.com/)

### AWS Account Setup

1. **Create IAM User** (or use existing)
   - Navigate to AWS Console → IAM → Users
   - Create user with **Programmatic access**
   
2. **Attach Policies** (required permissions):
   ```
   - AmazonS3FullAccess
   - CloudFrontFullAccess
   - Route53FullAccess (if using custom domain)
   ```

3. **Configure AWS CLI**:
   ```bash
   aws configure
   # Enter: Access Key ID, Secret Access Key, Region (us-east-1), Output format (json)
   ```

4. **Verify Setup**:
   ```bash
   aws sts get-caller-identity
   # Should show your account details
   ```

## Initial Setup

### 1. Install Terraform

**Windows (PowerShell):**
```powershell
# Using Chocolatey
choco install terraform

# Or download from https://www.terraform.io/downloads
```

**macOS:**
```bash
brew install terraform
```

**Linux:**
```bash
wget https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip
unzip terraform_1.6.0_linux_amd64.zip
sudo mv terraform /usr/local/bin/
```

Verify installation:
```bash
terraform version
```

### 2. Configure Environment Variables

Create `.env.production` file:
```env
NEXT_PUBLIC_API_URL=http://hovver-admin-alb-2080077084.us-east-1.elb.amazonaws.com
```

### 3. Update Next.js Config

The `next.config.ts` has been updated with:
- `output: 'export'` for static site generation
- `unoptimized: true` for images

## Deploy Infrastructure

### Step 1: Initialize Terraform

```bash
cd terraform
terraform init
```

This will:
- Download AWS provider
- Initialize backend
- Prepare working directory

### Step 2: Review Configuration (Optional)

Copy and edit variables:
```bash
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your preferred settings
```

### Step 3: Plan Infrastructure

```bash
terraform plan
```

Review the resources that will be created:
- S3 bucket
- CloudFront distribution
- CloudFront OAI
- S3 bucket policy
- (Optional) Route53 record

### Step 4: Deploy Infrastructure

```bash
terraform apply
```

Type `yes` when prompted.

**This takes 10-15 minutes** (CloudFront distribution creation is slow)

### Step 5: Save Outputs

After successful deployment:
```bash
terraform output
```

Save these values:
- `website_url` - Your CloudFront URL
- `s3_bucket_name` - For deployments
- `cloudfront_distribution_id` - For cache invalidation

## Deploy Application

### Option 1: Using Deployment Script (Recommended)

**Windows:**
```powershell
cd ..
.\terraform\deploy.ps1
```

**Linux/Mac:**
```bash
cd ..
chmod +x terraform/deploy.sh
./terraform/deploy.sh
```

### Option 2: Manual Deployment

```bash
# 1. Build the app
npm run build

# 2. Get bucket name
cd terraform
S3_BUCKET=$(terraform output -raw s3_bucket_name)
CF_DIST_ID=$(terraform output -raw cloudfront_distribution_id)
cd ..

# 3. Upload to S3
aws s3 sync out/ s3://${S3_BUCKET} --delete

# 4. Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id ${CF_DIST_ID} \
  --paths "/*"
```

### Step 3: Access Your Site

```bash
cd terraform
terraform output website_url
```

Visit the URL shown (e.g., `https://d1234567890.cloudfront.net`)

## Custom Domain Setup

### Prerequisites

1. **Domain registered** in Route53 (or transferred)
2. **Hosted zone** created in Route53

**Note:** If your Route53 hosted zone is in a **different AWS account**, see [terraform/CROSS-ACCOUNT-DNS.md](terraform/CROSS-ACCOUNT-DNS.md) for detailed setup instructions.

### Step 1: Request SSL Certificate

**Important:** Must be in **us-east-1** region for CloudFront

```bash
aws acm request-certificate \
  --domain-name admin.yourdomain.com \
  --validation-method DNS \
  --region us-east-1
```

### Step 2: Validate Certificate

1. Go to AWS Console → Certificate Manager → us-east-1
2. Click on your certificate
3. Create CNAME record in Route53 as shown
4. Wait for status to change to "Issued" (~5 minutes)

### Step 3: Get Certificate ARN

```bash
aws acm list-certificates --region us-east-1
```

Copy the certificate ARN.

### Step 4: Update Terraform Variables

Edit `terraform/terraform.tfvars`:

```hcl
domain_name          = "admin.yourdomain.com"
acm_certificate_arn  = "arn:aws:acm:us-east-1:123456789012:certificate/xxxxx"
route53_zone_id      = "Z1234567890ABC"  # From Route53 hosted zone
```

### Step 5: Apply Changes

```bash
cd terraform
terraform apply
```

### Step 6: Update DNS (if domain not in Route53)

If your domain is NOT in Route53, create a CNAME:

```
CNAME: admin.yourdomain.com
Value: d1234567890.cloudfront.net (from terraform output)
```

Wait 5-30 minutes for DNS propagation.

## CI/CD Setup

### GitHub Actions (Automated Deployment)

#### Step 1: Configure AWS Credentials

**Option A: OIDC (Recommended)**

1. Create IAM OIDC Identity Provider for GitHub
2. Create IAM Role with trust policy
3. Add role ARN to GitHub secrets: `AWS_ROLE_ARN`

**Option B: Access Keys (Simpler)**

1. Create IAM user with deployment permissions
2. Add to GitHub Secrets:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`

#### Step 2: Add API URL Secret

GitHub Repository → Settings → Secrets → New secret:
- Name: `NEXT_PUBLIC_API_URL`
- Value: `http://hovver-admin-alb-2080077084.us-east-1.elb.amazonaws.com`

#### Step 3: Push to GitHub

```bash
git add .
git commit -m "Add Terraform infrastructure"
git push origin main
```

GitHub Actions will automatically:
1. Build the Next.js app
2. Deploy to S3
3. Invalidate CloudFront cache

## Troubleshooting

### Issue: Terraform state conflicts

**Solution:** Use S3 backend for state management

Edit `terraform/main.tf`:
```hcl
terraform {
  backend "s3" {
    bucket = "your-terraform-state-bucket"
    key    = "hover-admin-frontend/terraform.tfstate"
    region = "us-east-1"
  }
}
```

### Issue: 403 Forbidden on website

**Causes:**
- S3 bucket policy not applied
- CloudFront OAI not configured

**Solution:**
```bash
cd terraform
terraform destroy
terraform apply
```

### Issue: Old content showing

**Solution:** Invalidate CloudFront cache
```bash
aws cloudfront create-invalidation \
  --distribution-id YOUR_DIST_ID \
  --paths "/*"
```

### Issue: Images not loading

**Causes:**
- CORS issues
- S3 URLs not accessible

**Solution:** Images must be in public S3 bucket OR have presigned URLs that work from browser

### Issue: Routing not working (404 on page refresh)

This should be handled by CloudFront custom error responses (403→index.html, 404→index.html).

If not working:
1. Verify `output: 'export'` in `next.config.ts`
2. Check CloudFront error pages configuration

### Issue: Build fails

**Check:**
1. `npm run build` works locally
2. Environment variables are set
3. No server-side only features (API routes, getServerSideProps)

## Costs Estimate

Monthly costs for low-traffic site:

| Service | Cost |
|---------|------|
| S3 Storage (1GB) | $0.02 |
| S3 Requests | $0.01 |
| CloudFront (10GB transfer) | $0.85 |
| Route53 (hosted zone) | $0.50 |
| **Total** | **~$1.50/month** |

## Cleanup

To remove all infrastructure:

```bash
# Empty S3 bucket first
aws s3 rm s3://$(terraform -chdir=terraform output -raw s3_bucket_name) --recursive

# Destroy infrastructure
cd terraform
terraform destroy
```

Type `yes` when prompted.

## Additional Resources

- [Terraform AWS Provider Docs](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/)
- [Next.js Static Export](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)

## Support

For issues:
1. Check CloudWatch Logs
2. Review CloudFront access logs
3. Verify S3 bucket permissions

