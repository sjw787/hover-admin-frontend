# Split-Account Deployment Checklist

Quick checklist for deploying with split-account setup.

## ✅ Prerequisites

- [ ] AWS CLI installed
- [ ] Terraform installed
- [ ] Access to **both** AWS accounts:
  - [ ] Deployment account (default profile)
  - [ ] Personal account (personal-account profile)

---

## ✅ Step 1: Configure AWS Profiles

```bash
# Configure personal account profile
aws configure --profile personal-account
```

**Test both accounts:**
```bash
# Deployment account
aws sts get-caller-identity
# Output: Shows deployment account ID

# Personal account  
aws sts get-caller-identity --profile personal-account
# Output: Shows personal account ID
```

---

## ✅ Step 2: Get Route53 Zone ID

```bash
aws route53 list-hosted-zones --profile personal-account
```

**Copy the Zone ID for samwylock.com** (looks like `Z1234567890ABC`)

---

## ✅ Step 3: Request ACM Certificate (Personal Account)

```bash
aws acm request-certificate \
  --profile personal-account \
  --domain-name admin.samwylock.com \
  --validation-method DNS \
  --region us-east-1
```

**Copy the Certificate ARN** from output.

---

## ✅ Step 4: Validate Certificate

**Get validation record:**
```bash
aws acm describe-certificate \
  --profile personal-account \
  --certificate-arn YOUR_CERT_ARN \
  --region us-east-1 \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord'
```

**Create CNAME in Route53:**
```bash
aws route53 change-resource-record-sets \
  --profile personal-account \
  --hosted-zone-id YOUR_ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "_xxx.admin.samwylock.com.",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "_yyy.acm-validations.aws."}]
      }
    }]
  }'
```

**Wait for validation:**
```bash
aws acm describe-certificate \
  --profile personal-account \
  --certificate-arn YOUR_CERT_ARN \
  --region us-east-1 \
  --query 'Certificate.Status'
# Wait for: "ISSUED"
```

---

## ✅ Step 5: Configure Terraform

**Create `terraform/terraform.tfvars`:**
```hcl
aws_region  = "us-east-1"
environment = "prod"

# Domain configuration
domain_name          = "admin.samwylock.com"
acm_certificate_arn  = "arn:aws:acm:us-east-1:PERSONAL_ACCT:certificate/XXXXX"
route53_zone_id      = "Z1234567890ABC"

# Cross-account configuration (REQUIRED for split setup)
route53_aws_profile  = "personal-account"
```

---

## ✅ Step 6: Deploy Infrastructure

```bash
cd terraform
terraform init
terraform plan
# Review the plan - should show:
# - S3 resources in deployment account
# - CloudFront resources in personal account
terraform apply
# Type: yes
```

**Wait 10-15 minutes** for CloudFront distribution to deploy.

---

## ✅ Step 7: Verify Resources

**Check S3 (Deployment Account):**
```bash
aws s3 ls | grep hover-admin
```

**Check CloudFront (Personal Account):**
```bash
aws cloudfront list-distributions --profile personal-account
```

**Check Route53 (Personal Account):**
```bash
aws route53 list-resource-record-sets \
  --profile personal-account \
  --hosted-zone-id YOUR_ZONE_ID \
  --query "ResourceRecordSets[?Name=='admin.samwylock.com.']"
```

---

## ✅ Step 8: Deploy Application

**Build and deploy:**
```bash
cd ..
npm run build
.\terraform\deploy.ps1   # Windows
# OR
./terraform/deploy.sh    # Linux/Mac
```

---

## ✅ Step 9: Test

**Get URL:**
```bash
cd terraform
terraform output website_url
# Should show: https://admin.samwylock.com
```

**Visit site:**
- Open browser to https://admin.samwylock.com
- Should load without certificate warnings
- Test login, upload, gallery

**Test DNS:**
```bash
nslookup admin.samwylock.com
# Should show CloudFront IP addresses
```

---

## 🎉 Success Criteria

Your deployment is successful when:

- ✅ `terraform apply` completes without errors
- ✅ S3 bucket exists in deployment account
- ✅ CloudFront distribution exists in personal account
- ✅ Route53 A record points to CloudFront
- ✅ Certificate is ISSUED and attached to CloudFront
- ✅ Website loads at https://admin.samwylock.com
- ✅ No SSL/certificate warnings in browser
- ✅ Login works
- ✅ Upload works
- ✅ Gallery works

---

## 🆘 Troubleshooting

### Issue: "No valid credentials for profile"
```bash
# Re-configure profile
aws configure --profile personal-account
```

### Issue: "Certificate not found"
```bash
# Verify certificate exists in PERSONAL account
aws acm list-certificates --profile personal-account --region us-east-1
```

### Issue: "Access Denied" on CloudFront
```bash
# Verify you're using personal-account profile in terraform.tfvars
cat terraform/terraform.tfvars | grep route53_aws_profile
# Should show: route53_aws_profile = "personal-account"
```

### Issue: CloudFront can't access S3
```bash
# Check S3 bucket policy
aws s3api get-bucket-policy --bucket hover-admin-frontend-prod

# Should allow CloudFront OAI from personal account
```

### Issue: Domain doesn't resolve
```bash
# Wait 5-30 minutes for DNS propagation
# Clear local DNS cache:
ipconfig /flushdns         # Windows
sudo dscacheutil -flushcache  # Mac
```

---

## 📋 Quick Reference

**Important Variables:**
- `route53_aws_profile`: Must be "personal-account"
- `acm_certificate_arn`: From personal account
- `route53_zone_id`: From personal account
- `domain_name`: admin.samwylock.com

**Key Commands:**
```bash
# Check personal account
aws sts get-caller-identity --profile personal-account

# List certificates (personal)
aws acm list-certificates --profile personal-account --region us-east-1

# List CloudFront (personal)
aws cloudfront list-distributions --profile personal-account

# Check S3 (deployment)
aws s3 ls

# Deploy app
.\terraform\deploy.ps1
```

---

## 📚 Documentation

- [SPLIT-ACCOUNT-SETUP.md](SPLIT-ACCOUNT-SETUP.md) - Architecture details
- [SAMWYLOCK-SETUP.md](SAMWYLOCK-SETUP.md) - Step-by-step guide
- [CROSS-ACCOUNT-DNS.md](CROSS-ACCOUNT-DNS.md) - Cross-account concepts

---

**Ready to deploy!** Start with Step 1 above. 🚀

