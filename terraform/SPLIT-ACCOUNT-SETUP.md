# Split-Account Setup Summary

## Architecture Overview

Your infrastructure is now split across two AWS accounts to work around CloudFront restrictions.

```
┌─────────────────────────────────────────────────────────────────┐
│  Personal Account (has CloudFront access)                       │
│                                                                 │
│  ✓ Route53 Hosted Zone: samwylock.com                         │
│  ✓ ACM Certificate: admin.samwylock.com                       │
│  ✓ CloudFront Distribution                                     │
│  ✓ CloudFront Origin Access Identity (OAI)                    │
│  ✓ Route53 A Record: admin.samwylock.com → CloudFront         │
│                                                                 │
│  Uses: AWS CLI profile "personal-account"                      │
└─────────────────────────────────────────────────────────────────┘
                            ↓
                    (CloudFront pulls from S3)
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  Deployment Account (needs CloudFront verification)             │
│                                                                 │
│  ✓ S3 Bucket: hover-admin-frontend-prod                       │
│  ✓ S3 Bucket Policy (allows CloudFront OAI access)            │
│  ✓ S3 Website Configuration                                    │
│                                                                 │
│  Uses: AWS CLI default profile                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Resource Distribution

| Resource | Account | Why |
|----------|---------|-----|
| **S3 Bucket** | Deployment | Website files storage |
| **S3 Bucket Policy** | Deployment | Grants CloudFront access |
| **CloudFront Distribution** | Personal | ✓ Has CloudFront access |
| **CloudFront OAI** | Personal | Same account as CloudFront |
| **ACM Certificate** | Personal | Must be in same account as CloudFront |
| **Route53 Zone** | Personal | Already exists there |
| **Route53 A Record** | Personal | Same account as hosted zone |

## How It Works

### 1. User Request Flow
```
User → admin.samwylock.com
  ↓
Route53 (Personal Account) → CloudFront distribution
  ↓
CloudFront (Personal Account) → Requests S3 bucket
  ↓
S3 Bucket (Deployment Account) → Returns files via OAI
  ↓
CloudFront → Serves to user
```

### 2. Deployment Flow
```
terraform apply
  ↓
Default provider (Deployment Account):
  - Creates S3 bucket
  - Creates S3 bucket policy (allows Personal Account OAI)
  ↓
Personal provider (Personal Account):
  - Creates CloudFront OAI
  - Creates CloudFront distribution
  - Creates Route53 A record
```

## Terraform Configuration

### Provider Setup (`main.tf`)
```hcl
# Default provider - Deployment account (S3)
provider "aws" {
  region = "us-east-1"
}

# Personal provider - Personal account (CloudFront, Route53, ACM)
provider "aws" {
  alias   = "personal"
  profile = "personal-account"  # From terraform.tfvars
  region  = "us-east-1"
}
```

### Resources Using Personal Provider
```hcl
resource "aws_cloudfront_distribution" "website" {
  provider = aws.personal  # ← Personal account
  # ...
}

resource "aws_cloudfront_origin_access_identity" "website" {
  provider = aws.personal  # ← Personal account
  # ...
}

resource "aws_route53_record" "website_cross_account" {
  provider = aws.personal  # ← Personal account
  # ...
}
```

## Setup Steps

### 1. Configure AWS Profiles
```bash
# Personal account
aws configure --profile personal-account

# Verify
aws sts get-caller-identity --profile personal-account
```

### 2. Create ACM Certificate (Personal Account)
```bash
aws acm request-certificate \
  --profile personal-account \
  --domain-name admin.samwylock.com \
  --validation-method DNS \
  --region us-east-1
```

### 3. Configure terraform.tfvars
```hcl
route53_aws_profile = "personal-account"
acm_certificate_arn = "arn:aws:acm:us-east-1:PERSONAL_ACCOUNT_ID:certificate/XXXXX"
route53_zone_id     = "Z1234567890ABC"
domain_name         = "admin.samwylock.com"
```

### 4. Deploy
```bash
cd terraform
terraform init
terraform apply
```

## Security & Permissions

### S3 Bucket Policy
The S3 bucket in deployment account allows the CloudFront OAI from personal account:

```json
{
  "Statement": [{
    "Sid": "AllowCloudFrontAccess",
    "Principal": {
      "AWS": "arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity XXXXX"
    },
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::bucket-name/*"
  }]
}
```

### Cross-Account Trust
- S3 bucket trusts CloudFront OAI (via bucket policy)
- No IAM role assumption needed
- CloudFront uses OAI to access S3

## Cost Implications

No additional costs for split setup:

| Service | Account | Cost |
|---------|---------|------|
| S3 Storage | Deployment | ~$0.50/month |
| S3 Requests | Deployment | ~$0.01/month |
| CloudFront | Personal | ~$1-5/month |
| Route53 Zone | Personal | $0.50/month (already paying) |
| ACM Certificate | Personal | Free |
| **Total** | | **~$2-6/month** |

## Benefits

✅ **Bypasses CloudFront restriction** in deployment account  
✅ **No waiting** for AWS Support verification  
✅ **Same performance** as single-account setup  
✅ **Secure** - uses CloudFront OAI, not public S3  
✅ **Standard practice** - many organizations use split setups  

## Limitations

⚠️ **Two accounts to manage** - Need both sets of credentials  
⚠️ **Slightly more complex** - More moving parts  
⚠️ **Cross-account dependencies** - S3 and CloudFront must trust each other  

## Troubleshooting

### Issue: CloudFront can't access S3
**Cause:** S3 bucket policy not allowing OAI

**Solution:**
```bash
# Check OAI ARN
aws cloudfront list-cloud-front-origin-access-identities \
  --profile personal-account

# Verify S3 bucket policy includes this OAI
aws s3api get-bucket-policy --bucket YOUR_BUCKET
```

### Issue: Certificate validation fails
**Cause:** Certificate in wrong account

**Solution:** Certificate must be in **personal account** (same as CloudFront)

### Issue: Route53 record not created
**Cause:** Missing profile configuration

**Solution:** Verify `route53_aws_profile = "personal-account"` in terraform.tfvars

## Migration Path

Once deployment account gets CloudFront access, you can migrate to single-account:

1. Create new CloudFront distribution in deployment account
2. Update Route53 to point to new distribution
3. Delete old CloudFront from personal account
4. Update Terraform to remove `provider = aws.personal`

## Alternative: All-in-Personal

If you prefer simplicity, you could move S3 to personal account too:

**Pros:**
- ✅ Simpler configuration
- ✅ Single account to manage

**Cons:**
- ⚠️ S3 files in different account than deployment pipeline
- ⚠️ May complicate CI/CD if tied to deployment account

## Summary

**What you have now:**
- Split setup across 2 accounts
- CloudFront in personal account (has access)
- S3 in deployment account (storing files)
- Everything connected via CloudFront OAI

**What it enables:**
- ✅ Deploy immediately (no waiting for AWS)
- ✅ Use your existing CloudFront access
- ✅ Production-ready infrastructure
- ✅ Secure and cost-effective

**Next step:**
Follow [SAMWYLOCK-SETUP.md](SAMWYLOCK-SETUP.md) to deploy!

