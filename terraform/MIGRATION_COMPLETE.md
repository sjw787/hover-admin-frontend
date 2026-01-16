# ✅ Migration Complete: S3+CloudFront → AWS Amplify

## Issue Resolved

**Original Error:**
```
Error: creating CloudFront Distribution: operation error CloudFront: CreateDistributionWithTags, 
https response error StatusCode: 400, RequestID: 48013fba-d4bd-4497-9255-692c7f350585, 
InvalidViewerCertificate: To add an alternate domain name (CNAME) to a CloudFront distribution, 
you must attach a trusted certificate that validates your authorization to use the domain name.
```

**Root Cause:** Terraform configuration had both old S3+CloudFront resources AND new Amplify resources. When you ran `terraform apply`, it tried to create a CloudFront distribution with a custom domain but without a valid ACM certificate.

**Solution:** Removed all S3+CloudFront resources from Terraform configuration and state, keeping only Amplify resources.

---

## Changes Made

### 1. Cleaned Up `main.tf`
**Removed:**
- ❌ `aws_s3_bucket.website`
- ❌ `aws_s3_bucket_policy.website`
- ❌ `aws_s3_bucket_public_access_block.website`
- ❌ `aws_s3_bucket_website_configuration.website`
- ❌ `aws_cloudfront_distribution.website`
- ❌ `aws_cloudfront_origin_access_identity.website`
- ❌ `aws_cloudfront_function.url_rewrite`
- ❌ `aws_route53_record.website`
- ❌ `aws_route53_record.website_cross_account`
- ❌ `data.aws_iam_policy_document.s3_policy`

**Kept:**
- ✅ Provider configurations (iamadmin-dev and admin-legacy)
- ✅ Comment explaining legacy resources

### 2. Renamed Old Outputs
**File:** `outputs.tf` → `outputs.tf.old`

This file referenced S3+CloudFront resources that no longer exist.

### 3. Cleaned Terraform State
**Removed from state:**
- CloudFront Function (dev-url-rewrite)
- CloudFront OAI (E3FB6CLC7GJ41E)
- S3 bucket and related resources

**Kept in state:**
- ✅ aws_amplify_app.frontend
- ✅ aws_amplify_branch.main
- ✅ aws_amplify_domain_association.main
- ✅ aws_iam_role.amplify_role
- ✅ aws_iam_role_policy.amplify_custom
- ✅ aws_iam_role_policy_attachment.amplify_backend_deployment
- ✅ aws_route53_record.amplify_domain

---

## Current Infrastructure

### AWS Amplify (Deployment Account: iamadmin-dev)

| Resource | ID/Name | Status |
|----------|---------|--------|
| **Amplify App** | `dyyzhyn0517sf` | ✅ Active |
| **Branch** | `master` | ✅ Deployed |
| **Domain Association** | `samwylock.com` | ⚠️ Certificate Pending |
| **IAM Role** | `hover-admin-frontend-amplify-role-dev` | ✅ Active |

### Route53 (Personal Account: admin-legacy)

| Resource | Value | Status |
|----------|-------|--------|
| **CNAME Record** | `dev.admin.samwylock.com` | ✅ Created |
| **Points To** | `d17aqzy3xy3qmc.cloudfront.net` | ✅ Configured |

---

## Amplify URLs

### Default Domain (Always Available)
```
https://master.dyyzhyn0517sf.amplifyapp.com
```

### Custom Domain (Once Certificate is Validated)
```
https://dev.admin.samwylock.com
```

---

## Next Steps

### 1. Validate SSL Certificate

The Amplify domain association has created an SSL certificate, but it needs DNS validation.

**Validation Record:**
```
Name:  _7f170a9a553efe4b6483901ae13906f6.samwylock.com
Type:  CNAME
Value: _e846b1967f6dac8a369bbe33c7c97c44.jkddzztszm.acm-validations.aws.
```

**Add to Route53 (Personal Account):**

```powershell
aws route53 change-resource-record-sets `
  --hosted-zone-id Z0463989E6ZRMK2X7OOO `
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "_7f170a9a553efe4b6483901ae13906f6.samwylock.com",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "_e846b1967f6dac8a369bbe33c7c97c44.jkddzztszm.acm-validations.aws."}]
      }
    }]
  }' `
  --profile admin-legacy
```

### 2. Monitor Certificate Validation

Visit the Amplify Console to monitor certificate status:
```
https://console.aws.amazon.com/amplify/home?region=us-east-1#/dyyzhyn0517sf
```

Go to: **Domain management** → Check certificate status

**Expected timeline:** 5-30 minutes

### 3. Test the Application

Once certificate is validated:

```powershell
# Test custom domain
Start-Process "https://dev.admin.samwylock.com"

# Test default domain (should work immediately)
Start-Process "https://master.dyyzhyn0517sf.amplifyapp.com"
```

### 4. Update Backend CORS

Ensure your backend API allows the new domains:

```
https://dev.admin.samwylock.com
https://master.dyyzhyn0517sf.amplifyapp.com
```

### 5. Clean Up Old Resources (Optional)

The following resources are still in AWS but no longer managed by Terraform:

**In Deployment Account (iamadmin-dev):**
- S3 bucket: `hover-admin-frontend-files`

**In Personal Account (admin-legacy):**
- CloudFront OAI: `E3FB6CLC7GJ41E`
- CloudFront Function: `dev-url-rewrite`

You can delete these manually if they're no longer needed.

---

## Verification

### Check Terraform State
```powershell
cd terraform
terraform state list
```

**Expected output (Amplify resources only):**
```
aws_amplify_app.frontend
aws_amplify_branch.main
aws_amplify_domain_association.main[0]
aws_iam_role.amplify_role
aws_iam_role_policy.amplify_custom
aws_iam_role_policy_attachment.amplify_backend_deployment
aws_route53_record.amplify_domain[0]
```

### Check Terraform Plan
```powershell
cd terraform
terraform plan
```

**Expected output:**
```
No changes. Your infrastructure matches the configuration.
```

---

## Profile Configuration (Verified)

✅ **Main Provider:** `iamadmin-dev` (Deployment account)
- Creates Amplify app, branch, domain association
- Creates IAM roles

✅ **Personal Provider:** `admin-legacy` (Personal account)  
- Creates Route53 CNAME records
- Accesses hosted zone for DNS

---

## Files Modified

1. **`main.tf`**
   - Removed all S3+CloudFront resources
   - Added explicit `profile = "iamadmin-dev"` to main provider
   - Kept only provider configurations

2. **`outputs.tf`** → **`outputs.tf.old`**
   - Renamed to prevent conflicts
   - Referenced non-existent resources

3. **`outputs_amplify.tf`**
   - No changes (already correct)

4. **Terraform State**
   - Removed old CloudFront/S3 resources
   - Kept all Amplify resources

---

## Summary

✅ **CloudFront error resolved** - No longer trying to create CloudFront distribution  
✅ **Using AWS Amplify** - Correct hosting solution for Next.js  
✅ **Profiles configured** - iamadmin-dev for Amplify, admin-legacy for Route53  
✅ **State cleaned** - Only Amplify resources remain  
✅ **Ready for deployment** - Certificate validation is final step

---

## Quick Commands

```powershell
# Check current state
cd terraform
terraform state list

# Run plan (should show no changes)
terraform plan

# View outputs
terraform output

# Check Amplify console
terraform output amplify_console_url
```

---

## Support

If you encounter issues:

1. **Check AWS credentials:**
   ```powershell
   aws sts get-caller-identity --profile iamadmin-dev
   aws sts get-caller-identity --profile admin-legacy
   ```

2. **Check Amplify app:**
   ```powershell
   aws amplify get-app --app-id dyyzhyn0517sf --profile iamadmin-dev
   ```

3. **Check Route53 records:**
   ```powershell
   aws route53 list-resource-record-sets --hosted-zone-id Z0463989E6ZRMK2X7OOO --profile admin-legacy
   ```

---

## Next Actions

1. ✅ **DONE:** Remove S3+CloudFront from Terraform
2. ✅ **DONE:** Clean up Terraform state  
3. ⏳ **TODO:** Add certificate validation CNAME to Route53
4. ⏳ **TODO:** Wait for certificate validation (5-30 min)
5. ⏳ **TODO:** Test application on custom domain
6. ⏳ **TODO:** Update backend CORS settings
7. ⏳ **TODO:** (Optional) Delete old S3/CloudFront resources

🎉 **You're ready to go!**
