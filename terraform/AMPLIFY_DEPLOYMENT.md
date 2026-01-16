# AWS Amplify Deployment Guide

This guide shows how to deploy the Hover Admin Frontend to AWS Amplify using Terraform with your existing domain and SSL certificate from your personal AWS account.

## Prerequisites

### 1. GitHub Repository
- Code pushed to GitHub repository
- Repository is accessible (public or you have access token)

### 2. AWS Accounts
- **Work/Project Account**: Where Amplify app will be deployed
- **Personal Account**: Where your domain and Route53 hosted zone exist

### 3. Personal Account Resources
- Route53 Hosted Zone for your domain
- ACM Certificate in **us-east-1** region (Amplify requirement)
- Domain verified and active

### 4. GitHub Personal Access Token
Create at: https://github.com/settings/tokens

Required scopes:
- `repo` (Full control of private repositories)
- `admin:repo_hook` (Full control of repository hooks)

## Setup Steps

### Step 1: Prepare ACM Certificate (Personal Account)

If you don't have a certificate in us-east-1:

```bash
# Switch to personal account
export AWS_PROFILE=personal

# Request certificate (MUST be in us-east-1 for Amplify)
aws acm request-certificate \
  --domain-name admin.yourdomain.com \
  --validation-method DNS \
  --region us-east-1

# Get certificate ARN
aws acm list-certificates --region us-east-1
```

Validate the certificate via DNS in Route53 (AWS will provide CNAME records).

### Step 2: Configure Terraform Variables

```bash
cd terraform

# Copy example configuration
cp terraform.tfvars.amplify.example terraform.tfvars

# Edit terraform.tfvars with your values
```

**Example terraform.tfvars:**

```hcl
# Basic Configuration
aws_region   = "us-east-1"
environment  = "prod"
project_name = "hover-admin-frontend"

# GitHub Configuration
github_repository   = "https://github.com/yourorg/hover-admin-frontend"
github_branch       = "main"
github_access_token = "ghp_xxxxxxxxxxxxxxxxxxxx"

# Backend API
api_url = "https://api.yourdomain.com"

# Custom Domain (Personal Account)
domain_name         = "yourdomain.com"  # Will deploy to admin.yourdomain.com for prod
acm_certificate_arn = "arn:aws:acm:us-east-1:123456789012:certificate/xxxxx"
route53_zone_id     = "Z0123456789ABCDEFGHIJ"
route53_aws_profile = "personal"
```

### Step 3: Configure AWS Profiles

Edit `~/.aws/credentials`:

```ini
[default]
aws_access_key_id = YOUR_WORK_ACCOUNT_KEY
aws_secret_access_key = YOUR_WORK_ACCOUNT_SECRET

[personal]
aws_access_key_id = YOUR_PERSONAL_ACCOUNT_KEY
aws_secret_access_key = YOUR_PERSONAL_ACCOUNT_SECRET
```

Edit `~/.aws/config`:

```ini
[default]
region = us-east-1

[profile personal]
region = us-east-1
```

### Step 4: Initialize and Deploy

```bash
# Initialize Terraform
terraform init

# Review the plan
terraform plan

# Deploy (this will take 5-10 minutes)
terraform apply
```

### Step 5: Verify Deployment

After deployment completes:

```bash
# Get the Amplify app URL
terraform output amplify_default_domain

# Get custom domain URL (if configured)
terraform output amplify_custom_domain

# Get Amplify console URL
terraform output amplify_console_url
```

Visit the Amplify Console to monitor the build:
```
https://console.aws.amazon.com/amplify/home?region=us-east-1
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Personal AWS Account                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Route53 Hosted Zone: yourdomain.com                   │ │
│  │  ├─ A Record: @ → yourdomain.com                       │ │
│  │  └─ CNAME: admin → amplify.d1234567890.amplifyapp.com │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  ACM Certificate (us-east-1)                           │ │
│  │  *.yourdomain.com (or admin.yourdomain.com)           │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ DNS Resolution
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Work/Project AWS Account                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  AWS Amplify App                                       │ │
│  │  ├─ Build: Next.js SSR                                │ │
│  │  ├─ Branch: main                                      │ │
│  │  ├─ Environment: NEXT_PUBLIC_API_URL                  │ │
│  │  └─ Custom Domain: admin.yourdomain.com               │ │
│  └────────────────────────────────────────────────────────┘ │
│                          │                                    │
│                          │ Git Push Trigger                   │
│                          ▼                                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  GitHub Repository                                     │ │
│  │  https://github.com/yourorg/hover-admin-frontend      │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Domain Configuration Options

### Option 1: Subdomain (Recommended)
```hcl
domain_name = "yourdomain.com"
environment = "prod"
# Deploys to: admin.yourdomain.com (for prod)
# Deploys to: dev.yourdomain.com (for dev)
```

### Option 2: Apex Domain
```hcl
domain_name = "admin.yourdomain.com"
environment = "prod"
# Deploys to: admin.yourdomain.com
```

### Option 3: No Custom Domain
```hcl
domain_name = ""
# Uses: https://main.d1234567890.amplifyapp.com
```

## Environment-Based Deployments

Deploy multiple environments:

**Production:**
```hcl
environment = "prod"
# URL: https://admin.yourdomain.com
```

**Development:**
```hcl
environment = "dev"
# URL: https://dev.admin.yourdomain.com
```

**Staging:**
```hcl
environment = "staging"
# URL: https://staging.admin.yourdomain.com
```

## Post-Deployment Configuration

### 1. Update Backend CORS

Update your backend to allow the new domain:

```python
# In FastAPI backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://admin.yourdomain.com",
        "https://dev.admin.yourdomain.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 2. Verify SSL Certificate

```bash
# Check SSL certificate
curl -vI https://admin.yourdomain.com 2>&1 | grep -i "SSL\|certificate"
```

### 3. Test Application

- [ ] Visit https://admin.yourdomain.com
- [ ] Login as admin user
- [ ] Login as customer user
- [ ] Test file upload
- [ ] Test customer management
- [ ] Test gallery filtering

## Continuous Deployment

Amplify automatically deploys when you push to the configured branch:

```bash
# Make changes to code
git add .
git commit -m "Update feature"
git push origin main

# Amplify automatically:
# 1. Detects the push
# 2. Runs npm ci
# 3. Runs npm run build
# 4. Deploys to production
# 5. Invalidates CDN cache
```

Monitor builds in Amplify Console.

## Manual Deployment Trigger

If you enabled webhooks:

```bash
# Get webhook URL
WEBHOOK_URL=$(terraform output -raw amplify_webhook_url)

# Trigger deployment
curl -X POST $WEBHOOK_URL
```

## Troubleshooting

### Build Fails

**Check build logs:**
1. Go to Amplify Console
2. Click on your app
3. Click "Build" tab
4. View logs for failed build

**Common issues:**
- Missing environment variables → Add in Amplify Console
- Node version mismatch → Specify in package.json: `"engines": {"node": "20.x"}`
- Build timeout → Increase timeout in Amplify settings

### Domain Not Working

**Check DNS propagation:**
```bash
# Check if DNS is propagated
nslookup admin.yourdomain.com

# Check certificate
openssl s_client -connect admin.yourdomain.com:443 -servername admin.yourdomain.com
```

**Verify in Amplify Console:**
1. Go to "Domain management"
2. Check domain status (should be "Available")
3. Verify CNAME records are correct

### Certificate Issues

**Certificate must be in us-east-1:**
```bash
# List certificates in us-east-1
aws acm list-certificates --region us-east-1 --profile personal

# If certificate is in wrong region, request new one in us-east-1
```

## Cost Estimate

AWS Amplify Pricing (as of 2026):
- **Build minutes**: $0.01 per build minute (~5 min/build = $0.05)
- **Hosting**: $0.15 per GB served
- **Storage**: $0.023 per GB stored

Estimated monthly cost:
- 10 builds/month: $0.50
- 10 GB data transfer: $1.50
- **Total: ~$2-5/month** (much cheaper than ECS!)

## Cleanup

To destroy Amplify resources:

```bash
# Destroy everything
terraform destroy

# Or just Amplify (keep other resources)
terraform destroy -target=aws_amplify_app.frontend
```

## Migration from S3+CloudFront

If you were using S3+CloudFront before:

1. **Keep both running** during migration
2. Deploy Amplify with a staging subdomain first
3. Test thoroughly
4. Update DNS to point to Amplify
5. Destroy S3+CloudFront resources

```bash
# Deploy to staging first
environment = "staging"
terraform apply

# Test at https://staging.admin.yourdomain.com

# If everything works, deploy to prod
environment = "prod"
terraform apply

# Destroy old S3 resources
terraform destroy -target=aws_s3_bucket.frontend
```

## Support

- **Amplify Docs**: https://docs.aws.amazon.com/amplify/
- **Terraform Amplify**: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/amplify_app
- **Build Issues**: Check Amplify Console build logs

## Next Steps

1. ✅ Deploy Amplify app
2. ✅ Configure custom domain
3. ✅ Verify SSL certificate works
4. ✅ Test admin and customer flows
5. ✅ Update backend CORS
6. ✅ Setup monitoring/alerts in CloudWatch
7. ✅ Configure branch previews for PR testing (optional)

