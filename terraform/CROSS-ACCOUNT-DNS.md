# Cross-Account DNS Setup Guide

This guide explains how to use a Route53 hosted zone from a different AWS account (e.g., `samwylock.com` in your personal account) with CloudFront in your deployment account.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Account A (Personal - samwylock.com)                       │
│                                                             │
│  ┌────────────────────────────────────────────────────┐   │
│  │  Route53 Hosted Zone: samwylock.com                │   │
│  │  - NS records                                       │   │
│  │  - A record: admin.samwylock.com → CloudFront      │   │
│  └────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │ Cross-account DNS update
                            │
┌─────────────────────────────────────────────────────────────┐
│  Account B (Deployment Account)                             │
│                                                             │
│  ┌────────────────────────────────────────────────────┐   │
│  │  S3 Bucket                                          │   │
│  │  CloudFront Distribution                            │   │
│  │  ACM Certificate (us-east-1)                        │   │
│  └────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

1. ✅ **Domain registered** and Route53 hosted zone in Account A (samwylock.com)
2. ✅ **AWS CLI configured** with profiles for both accounts
3. ✅ **Terraform** installed
4. ✅ **ACM certificate** in deployment account (Account B)

## Setup Methods

You have two options for cross-account access:

### Method 1: AWS CLI Profiles (Recommended - Simpler)
### Method 2: IAM Role Assumption (More Secure)

---

## Method 1: AWS CLI Profiles (Recommended)

This method uses separate AWS CLI profiles for each account.

### Step 1: Configure AWS CLI Profiles

Edit `~/.aws/credentials` (Windows: `%USERPROFILE%\.aws\credentials`):

```ini
# Deployment account (Account B)
[default]
aws_access_key_id = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

# Personal account with samwylock.com (Account A)
[personal-account]
aws_access_key_id = AKIAIOSFODNN7EXAMPLE2
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY2
```

Edit `~/.aws/config`:

```ini
[default]
region = us-east-1
output = json

[profile personal-account]
region = us-east-1
output = json
```

### Step 2: Test Profiles

```bash
# Test deployment account
aws sts get-caller-identity
# Should show Account B details

# Test personal account
aws sts get-caller-identity --profile personal-account
# Should show Account A details
```

### Step 3: Get Route53 Zone ID

```bash
# List hosted zones in personal account
aws route53 list-hosted-zones --profile personal-account

# Find samwylock.com and copy the Zone ID (looks like: Z1234567890ABC)
```

### Step 4: Request ACM Certificate (in Deployment Account)

**IMPORTANT:** Certificate must be in **us-east-1** for CloudFront!

```bash
# Request certificate in deployment account
aws acm request-certificate \
  --domain-name admin.samwylock.com \
  --validation-method DNS \
  --region us-east-1

# Get certificate ARN
aws acm list-certificates --region us-east-1
```

### Step 5: Create DNS Validation Record

Get the validation record from deployment account:

```bash
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:us-east-1:ACCOUNT_B_ID:certificate/CERT_ID \
  --region us-east-1
```

Create the validation CNAME record in personal account:

```bash
aws route53 change-resource-record-sets \
  --profile personal-account \
  --hosted-zone-id Z1234567890ABC \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "_xxx.admin.samwylock.com",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "_yyy.acm-validations.aws."}]
      }
    }]
  }'
```

Wait for certificate to be validated (~5-10 minutes).

### Step 6: Configure Terraform

Create `terraform/terraform.tfvars`:

```hcl
aws_region  = "us-east-1"
environment = "prod"

# Domain configuration
domain_name          = "admin.samwylock.com"
acm_certificate_arn  = "arn:aws:acm:us-east-1:ACCOUNT_B_ID:certificate/CERT_ID"
route53_zone_id      = "Z1234567890ABC"  # From personal account

# Cross-account DNS access
route53_aws_profile  = "personal-account"
```

### Step 7: Deploy Infrastructure

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

Terraform will:
1. Create S3 bucket in Account B ✅
2. Create CloudFront distribution in Account B ✅
3. Create A record in Route53 (Account A) using the personal-account profile ✅

---

## Method 2: IAM Role Assumption (More Secure)

This method creates an IAM role in Account A that Account B can assume.

### Step 1: Create IAM Role in Account A (Personal Account)

Create a role that allows Account B to manage DNS records.

**In AWS Console (Account A):**
1. Go to IAM → Roles → Create Role
2. Select "Another AWS account"
3. Enter Account B's Account ID
4. Name: `TerraformDNSRole`

**Or use AWS CLI:**

```bash
# In Account A (personal account)
aws iam create-role --profile personal-account \
  --role-name TerraformDNSRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::ACCOUNT_B_ID:root"
      },
      "Action": "sts:AssumeRole"
    }]
  }'
```

### Step 2: Attach Policy to Role

Create policy document `route53-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "route53:GetHostedZone",
        "route53:ListResourceRecordSets",
        "route53:ChangeResourceRecordSets"
      ],
      "Resource": "arn:aws:route53:::hostedzone/Z1234567890ABC"
    },
    {
      "Effect": "Allow",
      "Action": [
        "route53:ListHostedZones"
      ],
      "Resource": "*"
    }
  ]
}
```

Attach the policy:

```bash
aws iam put-role-policy --profile personal-account \
  --role-name TerraformDNSRole \
  --policy-name Route53Access \
  --policy-document file://route53-policy.json
```

### Step 3: Configure Terraform

Update `terraform/terraform.tfvars`:

```hcl
aws_region  = "us-east-1"
environment = "prod"

domain_name          = "admin.samwylock.com"
acm_certificate_arn  = "arn:aws:acm:us-east-1:ACCOUNT_B_ID:certificate/CERT_ID"
route53_zone_id      = "Z1234567890ABC"

# Use role assumption instead of profile
route53_assume_role_arn = "arn:aws:iam::ACCOUNT_A_ID:role/TerraformDNSRole"
```

Update `terraform/main.tf` (uncomment the assume_role section):

```hcl
provider "aws" {
  alias  = "dns"
  region = var.aws_region

  assume_role {
    role_arn     = var.route53_assume_role_arn
    session_name = "terraform-hover-admin-dns"
  }
}
```

### Step 4: Deploy

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

---

## Verification

### Check DNS Record Created

```bash
# Check in personal account
aws route53 list-resource-record-sets \
  --profile personal-account \
  --hosted-zone-id Z1234567890ABC \
  --query "ResourceRecordSets[?Name=='admin.samwylock.com.']"
```

Should show an A record pointing to CloudFront.

### Test Domain

```bash
# Test DNS resolution
nslookup admin.samwylock.com

# Should return CloudFront IP addresses
```

### Visit Site

```bash
# Get CloudFront URL
cd terraform
terraform output website_url

# Visit: https://admin.samwylock.com
```

---

## Troubleshooting

### Issue: Access Denied creating Route53 record

**Cause:** Terraform cannot access Account A

**Solution for Method 1:**
```bash
# Verify profile works
aws route53 list-hosted-zones --profile personal-account
```

**Solution for Method 2:**
```bash
# Test role assumption
aws sts assume-role \
  --role-arn arn:aws:iam::ACCOUNT_A_ID:role/TerraformDNSRole \
  --role-session-name test
```

### Issue: Certificate validation failing

**Cause:** DNS validation record not created in correct account

**Solution:** Create validation CNAME in Account A (personal account), not Account B

### Issue: Route53 zone ID not found

**Cause:** Using wrong profile or account

**Solution:**
```bash
# Make sure you're looking in the right account
aws route53 list-hosted-zones --profile personal-account
```

---

## Security Best Practices

### For IAM Role Method:

1. **Principle of Least Privilege**: Only grant Route53 permissions for specific hosted zone
2. **External ID**: Consider adding external ID to assume role trust policy
3. **MFA**: Require MFA for role assumption in production

Example with External ID and MFA:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "AWS": "arn:aws:iam::ACCOUNT_B_ID:root"
    },
    "Action": "sts:AssumeRole",
    "Condition": {
      "StringEquals": {
        "sts:ExternalId": "unique-external-id-12345"
      },
      "Bool": {
        "aws:MultiFactorAuthPresent": "true"
      }
    }
  }]
}
```

---

## Cost Implications

**No additional costs** for cross-account Route53 access:
- Route53 hosted zone: $0.50/month (already paying in Account A)
- DNS queries: $0.40 per million queries (charged to Account A)
- CloudFront: Charged to Account B
- ACM certificate: Free

---

## Summary: Quick Setup for samwylock.com

```bash
# 1. Configure AWS profiles
aws configure --profile personal-account

# 2. Get Zone ID
aws route53 list-hosted-zones --profile personal-account | grep samwylock.com

# 3. Request certificate in deployment account
aws acm request-certificate \
  --domain-name admin.samwylock.com \
  --validation-method DNS \
  --region us-east-1

# 4. Create validation record in personal account (get details from step 3)
# Use AWS Console or CLI to create CNAME record

# 5. Configure terraform/terraform.tfvars
domain_name          = "admin.samwylock.com"
acm_certificate_arn  = "arn:aws:acm:us-east-1:XXXXX:certificate/XXXXX"
route53_zone_id      = "Z1234567890ABC"
route53_aws_profile  = "personal-account"

# 6. Deploy
cd terraform
terraform init
terraform apply
```

Done! Your site will be accessible at https://admin.samwylock.com

