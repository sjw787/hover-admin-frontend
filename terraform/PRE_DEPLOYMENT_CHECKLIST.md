# Terraform Profile Configuration - Pre-Deployment Checklist

## ✅ Configuration Verified

### Profile Configuration Status

| Component | Profile | Account | Status |
|-----------|---------|---------|--------|
| Main Provider | `iamadmin-dev` | Deployment | ✅ **FIXED** - Now explicit |
| Personal Provider | `admin-legacy` | Personal (Route53) | ✅ Correct |
| Route53 Zone | `admin-legacy` | Personal | ✅ Correct |
| Amplify Resources | `iamadmin-dev` | Deployment | ✅ Correct |

---

## What Was Fixed

### 1. Main Provider (Critical Fix)
**Location:** `terraform/main.tf` line 24

**Before:**
```hcl
provider "aws" {
  region = var.aws_region
  # No profile specified - uses default AWS credentials
}
```

**After:**
```hcl
provider "aws" {
  region  = var.aws_region
  profile = "iamadmin-dev"  # ← EXPLICITLY SET
}
```

**Impact:** 
- ✅ All Amplify resources now guaranteed to deploy in `iamadmin-dev` account
- ✅ No ambiguity about which credentials are used
- ✅ Prevents accidental deployment to wrong account

---

### 2. PowerShell Script Syntax
**Location:** `terraform/deploy-amplify.ps1` line 137

**Fixed:** Missing closing quote that caused parse error

---

### 3. Documentation Updates
**Files Updated:**
- ✅ `AMPLIFY_DOMAIN_SETUP.md` - Updated profile references
- ✅ `PROFILE_CONFIGURATION.md` - New comprehensive guide

---

## Current State

### Existing Resources (from terraform state)

```
✅ aws_amplify_app.frontend
   └─ App ID: dsuq5ecw5b849
   └─ Account: 777653593792 (iamadmin-dev)
   
✅ aws_amplify_branch.main
   └─ Branch: master
   └─ Account: 777653593792 (iamadmin-dev)

⚠️ aws_s3_bucket.website
   └─ Old S3 bucket (not used by Amplify)
   └─ Can be removed after Amplify is fully working
```

---

## Next Steps

### Option A: Re-apply Configuration (Recommended)

This will ensure all settings are correct and add any missing resources:

```powershell
cd C:\Users\Sam\PycharmProjects\hover-admin-frontend\terraform

# Review what will change
terraform plan

# Apply if everything looks good
terraform apply
```

**Expected Changes:**
- May recreate Amplify domain association (if not present)
- Will create Route53 CNAME record in `admin-legacy` account
- No changes to existing Amplify app/branch

---

### Option B: Deploy Fresh (If Needed)

If you want to start clean:

```powershell
cd C:\Users\Sam\PycharmProjects\hover-admin-frontend\terraform

# Destroy existing resources
terraform destroy

# Deploy with corrected configuration
.\deploy-amplify.ps1
```

---

## Verification Commands

### 1. Check AWS Account IDs

```powershell
# Deployment account (should be 777653593792)
aws sts get-caller-identity --profile iamadmin-dev

# Personal account (check your account ID)
aws sts get-caller-identity --profile admin-legacy
```

### 2. Verify Terraform Will Use Correct Profiles

```powershell
cd terraform

# This should show profile usage
terraform plan 2>&1 | Select-String "provider"
terraform plan 2>&1 | Select-String "profile"
```

### 3. Check Existing Amplify Resources

```powershell
# Should show resources in deployment account
aws amplify list-apps --profile iamadmin-dev

# Should show your domain
aws route53 list-hosted-zones --profile admin-legacy | Select-String "samwylock"
```

---

## Configuration Summary

### `terraform/terraform.tfvars`
```hcl
# AWS Configuration
aws_region   = "us-east-1"
environment  = "dev"
project_name = "hover-admin-frontend"

# GitHub
github_repository   = "https://github.com/sjw787/hover-admin-frontend"
github_branch       = "master"
github_access_token = "ghp_***" # (present)

# Backend API
api_url = "https://api.samwylock.com"

# Domain Configuration (Personal Account)
domain_name         = "samwylock.com"
route53_zone_id     = "Z0463989E6ZRMK2X7OOO"
route53_aws_profile = "admin-legacy"           # ← Uses personal account
acm_certificate_arn = ""                       # ← Not needed (Amplify auto-creates)
```

### `terraform/main.tf`
```hcl
# Deployment account - EXPLICIT profile
provider "aws" {
  region  = var.aws_region
  profile = "iamadmin-dev"    # ← FIXED: Now explicit
}

# Personal account - For Route53
provider "aws" {
  alias   = "personal"
  region  = var.aws_region
  profile = var.route53_aws_profile  # ← "admin-legacy" from tfvars
}
```

---

## Resource Ownership

### Deployment Account (`iamadmin-dev` / 777653593792)

| Resource | ID/ARN | Status |
|----------|--------|--------|
| Amplify App | `dsuq5ecw5b849` | ✅ Deployed |
| Amplify Branch | `master` | ✅ Deployed |
| Amplify Domain | (pending) | ⏳ Will be created |
| SSL Certificate | (auto) | ⏳ Auto-provisioned by Amplify |
| IAM Role | (will create) | ⏳ Will be created |

### Personal Account (`admin-legacy`)

| Resource | Name | Status |
|----------|------|--------|
| Route53 Zone | `samwylock.com` | ✅ Exists |
| Route53 Record | `admin.samwylock.com` | ⏳ Will be created |
| Cert Validation | `_cert.*` | ⏳ Manual (after apply) |

---

## Post-Deployment Tasks

After running `terraform apply`, you'll need to:

### 1. Get Certificate Validation Record from Amplify

```powershell
# Check Amplify Console
terraform output amplify_console_url

# Visit the URL and go to: Domain management
# Copy the certificate validation CNAME record
```

### 2. Add Validation Record to Route53

```powershell
# Use the values from Amplify Console
aws route53 change-resource-record-sets \
  --hosted-zone-id Z0463989E6ZRMK2X7OOO \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "_VALIDATION_FROM_AMPLIFY.admin.samwylock.com",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "_validation_value.acm-validations.aws."}]
      }
    }]
  }' \
  --profile admin-legacy
```

### 3. Wait for Certificate Validation

- Takes 5-30 minutes
- Check in Amplify Console
- Status: "Pending" → "Available"

### 4. Test Domain

```powershell
# Once validated
Start-Process "https://dev.admin.samwylock.com"

# Check DNS resolution
nslookup dev.admin.samwylock.com

# Check SSL certificate
curl -I https://dev.admin.samwylock.com
```

---

## Troubleshooting

### "Access Denied" Errors

**For Amplify resources:**
```powershell
# Verify iamadmin-dev can manage Amplify
aws amplify list-apps --profile iamadmin-dev
```

**For Route53 resources:**
```powershell
# Verify admin-legacy can manage Route53
aws route53 list-hosted-zones --profile admin-legacy
```

### Resources in Wrong Account

**Check where Amplify app was created:**
```powershell
aws amplify get-app --app-id dsuq5ecw5b849 --profile iamadmin-dev
```

If in wrong account, destroy and recreate:
```powershell
terraform destroy
terraform apply
```

### Profile Not Found

**List available profiles:**
```powershell
cat ~/.aws/config
# or
cat $env:USERPROFILE\.aws\config
```

**Verify credentials:**
```powershell
aws configure list --profile iamadmin-dev
aws configure list --profile admin-legacy
```

---

## Summary

✅ **Profile configuration is now EXPLICIT and CORRECT**

- Main provider uses `iamadmin-dev` for Amplify
- Personal provider uses `admin-legacy` for Route53
- No ambiguity about which account resources go to
- All documentation updated

🚀 **Ready to deploy!**

```powershell
cd terraform
terraform plan   # Review changes
terraform apply  # Deploy
```
