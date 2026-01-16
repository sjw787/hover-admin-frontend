# Cross-Account DNS - Summary

## What Was Configured

Your Terraform setup now supports using the `samwylock.com` Route53 hosted zone from your personal AWS account while deploying the CloudFront infrastructure to your deployment account.

## Files Modified

### 1. `terraform/main.tf`
- ✅ Added second AWS provider (`aws.dns`) for cross-account access
- ✅ Split Route53 record into two resources:
  - `aws_route53_record.website` - For same-account setup
  - `aws_route53_record.website_cross_account` - For cross-account setup
- ✅ Uses conditional logic to choose the right resource

### 2. `terraform/variables.tf`
- ✅ Added `route53_aws_profile` variable (for AWS CLI profile method)
- ✅ Added `route53_assume_role_arn` variable (for IAM role method)

### 3. `terraform/terraform.tfvars.example`
- ✅ Updated with example for `samwylock.com` domain
- ✅ Added cross-account configuration examples

## New Documentation

### 1. `terraform/CROSS-ACCOUNT-DNS.md` (Comprehensive Guide)
- Complete setup instructions for cross-account DNS
- Two methods: AWS CLI Profiles (simpler) and IAM Role (more secure)
- Step-by-step with example commands
- Troubleshooting section

### 2. `terraform/SAMWYLOCK-SETUP.md` (Quick Reference)
- Fast-track guide specifically for `samwylock.com`
- Copy-paste commands
- Quick troubleshooting

### 3. Updated Existing Docs
- `DEPLOYMENT.md` - Added note about cross-account DNS
- `CHECKLIST.md` - Added cross-account setup steps

## How It Works

```
┌──────────────────────────────────────┐
│  Personal Account                    │
│  (samwylock.com Route53 zone)       │
│                                      │
│  AWS CLI Profile: personal-account   │
└──────────────────────────────────────┘
              ▲
              │ Terraform uses profile
              │ to create DNS record
              │
┌──────────────────────────────────────┐
│  Deployment Account                  │
│  (S3, CloudFront, ACM)              │
│                                      │
│  AWS CLI Profile: default            │
└──────────────────────────────────────┘
```

## Quick Setup for samwylock.com

### 1. Configure AWS CLI Profile

```bash
# Add personal account profile
aws configure --profile personal-account
```

### 2. Get Zone ID

```bash
aws route53 list-hosted-zones --profile personal-account | grep samwylock.com
```

### 3. Request Certificate

```bash
aws acm request-certificate \
  --domain-name admin.samwylock.com \
  --validation-method DNS \
  --region us-east-1
```

### 4. Validate Certificate

Create the DNS validation CNAME record in your personal account (use AWS Console or CLI).

### 5. Configure terraform.tfvars

```hcl
domain_name          = "admin.samwylock.com"
acm_certificate_arn  = "arn:aws:acm:us-east-1:XXXXX:certificate/XXXXX"
route53_zone_id      = "Z1234567890ABC"
route53_aws_profile  = "personal-account"
```

### 6. Deploy

```bash
cd terraform
terraform init
terraform apply
```

## What Terraform Will Do

When you run `terraform apply` with cross-account configuration:

1. **In Deployment Account** (default provider):
   - Create S3 bucket ✅
   - Create CloudFront distribution ✅
   - Use ACM certificate ✅

2. **In Personal Account** (dns provider with personal-account profile):
   - Create A record: `admin.samwylock.com` → CloudFront ✅

## Security Considerations

### AWS CLI Profiles Method (Recommended for You)
- ✅ Simple to set up
- ✅ Uses existing IAM user credentials
- ✅ No additional IAM configuration needed
- ⚠️ Requires storing credentials for both accounts

### IAM Role Method (Alternative)
- ✅ More secure (temporary credentials)
- ✅ Can enforce MFA
- ✅ Better audit trail
- ⚠️ More complex setup (requires IAM role creation)

## Testing

After deployment, verify:

```bash
# 1. Check DNS record was created
aws route53 list-resource-record-sets \
  --profile personal-account \
  --hosted-zone-id YOUR_ZONE_ID \
  --query "ResourceRecordSets[?Name=='admin.samwylock.com.']"

# 2. Test DNS resolution
nslookup admin.samwylock.com

# 3. Visit site
curl -I https://admin.samwylock.com
```

## Cost Impact

**No additional costs!**
- Route53 hosted zone: $0.50/month (already paying in personal account)
- DNS queries: $0.40 per million (billed to personal account)
- Everything else: Billed to deployment account as usual

## Troubleshooting

### Issue: "Error: Invalid AWS Profile"

```bash
# Verify profile exists
cat ~/.aws/credentials | grep personal-account

# Test profile
aws sts get-caller-identity --profile personal-account
```

### Issue: "Access Denied" on Route53

```bash
# Verify IAM permissions in personal account
aws iam get-user --profile personal-account
```

### Issue: Certificate validation stuck

- DNS validation record must be created in **personal account** (where samwylock.com lives)
- Use AWS Console or CLI with `--profile personal-account`

## Next Steps

1. ✅ Review [SAMWYLOCK-SETUP.md](terraform/SAMWYLOCK-SETUP.md) for quick setup
2. ✅ Review [CROSS-ACCOUNT-DNS.md](terraform/CROSS-ACCOUNT-DNS.md) for detailed guide
3. ✅ Configure AWS CLI profile for personal account
4. ✅ Follow the setup steps
5. ✅ Deploy with `terraform apply`

## Support

If you encounter issues:
1. Check [terraform/CROSS-ACCOUNT-DNS.md](terraform/CROSS-ACCOUNT-DNS.md) troubleshooting section
2. Verify AWS CLI profiles are working
3. Check AWS Console in both accounts
4. Review Terraform error messages

---

**Ready to deploy!** Start with [terraform/SAMWYLOCK-SETUP.md](terraform/SAMWYLOCK-SETUP.md) for step-by-step instructions.

