# AWS Profile Configuration Summary

## Overview

This Terraform setup uses **two different AWS accounts** with specific profiles for different resources.

## Account & Profile Usage

### Primary Provider (Default) - `iamadmin-dev`

**File:** `main.tf` (lines 22-31)

```hcl
provider "aws" {
  region  = var.aws_region
  profile = "iamadmin-dev"     # ← Explicitly set
  
  default_tags {
    tags = {
      Project     = "Hover Admin Frontend"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}
```

**Resources Created:**
- ✅ AWS Amplify App (`aws_amplify_app.frontend`)
- ✅ AWS Amplify Branch (`aws_amplify_branch.main`)
- ✅ AWS Amplify Domain Association (`aws_amplify_domain_association.main`)
  - **Note:** This includes auto-provisioned SSL certificate
- ✅ IAM Role for Amplify (`aws_iam_role.amplify_role`)
- ✅ IAM Policy Attachments
- ✅ Amplify Webhook (optional)

**Account:** Deployment account where Amplify runs

---

### Aliased Provider (Personal) - `admin-legacy`

**File:** `main.tf` (lines 36-54)

```hcl
provider "aws" {
  alias  = "personal"
  region = var.aws_region
  
  # Uses profile from terraform.tfvars
  profile = var.route53_aws_profile  # ← "admin-legacy"
  
  default_tags {
    tags = {
      Project     = "Hover Admin Frontend - Personal"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}
```

**Resources Created:**
- ✅ Route53 CNAME Record (`aws_route53_record.amplify_domain`)
  - Points `admin.samwylock.com` → Amplify default domain

**Account:** Personal account where domain is hosted

---

## Configuration File

**File:** `terraform.tfvars`

```hcl
# Deployment account (implicit via main provider profile)
# → Uses: iamadmin-dev

# Personal account for Route53
route53_aws_profile = "admin-legacy"
route53_zone_id     = "Z0463989E6ZRMK2X7OOO"
domain_name         = "samwylock.com"
```

---

## Resource Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│  Deployment Account (iamadmin-dev)                      │
│                                                           │
│  Main Provider (profile: "iamadmin-dev")                │
│  ├─ aws_amplify_app.frontend                            │
│  ├─ aws_amplify_branch.main                             │
│  ├─ aws_amplify_domain_association.main                 │
│  │   └─ Auto-provisions SSL certificate                 │
│  ├─ aws_iam_role.amplify_role                           │
│  └─ aws_iam_role_policy_attachment.*                    │
│                                                           │
│  Default Domain: master.d123abc.amplifyapp.com          │
└─────────────────────────────────────────────────────────┘
                            │
                            │ Domain association references
                            │ hosted zone in personal account
                            ↓
┌─────────────────────────────────────────────────────────┐
│  Personal Account (admin-legacy)                         │
│                                                           │
│  Aliased Provider (profile: "admin-legacy")             │
│  └─ aws_route53_record.amplify_domain                   │
│      Name: admin.samwylock.com                           │
│      Type: CNAME                                         │
│      Value: master.d123abc.amplifyapp.com               │
│                                                           │
│  Hosted Zone: samwylock.com                             │
│  Zone ID: Z0463989E6ZRMK2X7OOO                          │
└─────────────────────────────────────────────────────────┘
```

---

## Cross-Account Flow

1. **Terraform runs with `iamadmin-dev` as default profile**
   - Creates Amplify app in deployment account
   - Amplify requests custom domain: `admin.samwylock.com`
   - Amplify auto-provisions SSL certificate
   - Amplify provides validation CNAME

2. **Terraform uses `admin-legacy` profile for Route53**
   - Creates CNAME: `admin` → Amplify's default domain
   - Points to hosted zone in personal account

3. **Manual step required:**
   - Add certificate validation CNAME (from Amplify Console) to Route53
   - Uses `admin-legacy` profile/account

4. **Result:**
   - Amplify validates certificate ownership
   - Domain becomes active
   - `https://admin.samwylock.com` → Amplify app

---

## Verification Commands

### Check which profiles Terraform will use:

```bash
cd terraform
terraform plan 2>&1 | Select-String "profile"
```

### Verify AWS credentials:

```bash
# Check deployment account (should be iamadmin-dev)
aws sts get-caller-identity --profile iamadmin-dev

# Check personal account (should be admin-legacy)  
aws sts get-caller-identity --profile admin-legacy
```

### Check Route53 hosted zone (personal account):

```bash
aws route53 list-resource-record-sets \
  --hosted-zone-id Z0463989E6ZRMK2X7OOO \
  --profile admin-legacy | Select-String "admin"
```

---

## Important Notes

✅ **Correct Configuration:**
- Main provider explicitly uses `profile = "iamadmin-dev"`
- Personal provider uses `profile = var.route53_aws_profile` → `"admin-legacy"`
- Amplify resources → Deployment account
- Route53 records → Personal account

⚠️ **Common Mistakes to Avoid:**
- ❌ Don't omit the profile from main provider (will use default creds)
- ❌ Don't use same profile for both providers
- ❌ Don't try to use ACM cert from personal account (Amplify can't access it)

🔒 **Security:**
- Amplify domain association can reference domains in other accounts
- Route53 CNAME must be in the account that owns the hosted zone
- SSL certificate is always created in the Amplify account (deployment)

---

## Deployment

```powershell
# Run deployment script (it will use profiles from terraform.tfvars)
cd terraform
.\deploy-amplify.ps1

# Or manually:
terraform init
terraform plan
terraform apply
```

The profiles are configured in `main.tf` and don't need to be set via environment variables.

---

## Troubleshooting

### "Access Denied" on Amplify resources
→ Check that `iamadmin-dev` profile has correct permissions

### "Access Denied" on Route53 resources  
→ Check that `admin-legacy` profile can access hosted zone `Z0463989E6ZRMK2X7OOO`

### Resources created in wrong account
→ Verify `main.tf` line 24: `profile = "iamadmin-dev"` is present
→ Verify `terraform.tfvars` line 51: `route53_aws_profile = "admin-legacy"`

### Check which account Terraform is using:

```powershell
# Before terraform apply, check plan output
terraform plan | Select-String "will be created"
terraform plan | Select-String "zone_id"
```
