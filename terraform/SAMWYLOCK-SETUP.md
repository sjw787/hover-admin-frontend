# Quick Setup: samwylock.com Domain

Fast track for setting up admin.samwylock.com with **split-account setup**.

**Architecture:**
- **Personal Account**: Route53, CloudFront, ACM Certificate (CloudFront access available)
- **Deployment Account**: S3 Bucket (website files)

## Step 1: Configure AWS Profiles

```bash
# Configure your personal account (where samwylock.com lives)
aws configure --profile personal-account
# Enter your personal account credentials
```

Verify both accounts work:
```bash
aws sts get-caller-identity                              # Deployment account
aws sts get-caller-identity --profile personal-account   # Personal account
```

## Step 2: Get Route53 Zone ID

```bash
aws route53 list-hosted-zones --profile personal-account
```

Find `samwylock.com` and copy the Zone ID (looks like `Z1234567890ABC`)

## Step 3: Request ACM Certificate (in Personal Account)

**Important:** Create certificate in **personal account** where CloudFront will be created!

```bash
aws acm request-certificate \
  --profile personal-account \
  --domain-name admin.samwylock.com \
  --validation-method DNS \
  --region us-east-1
```

Copy the certificate ARN from output.

## Step 4: Create DNS Validation Record

Get validation details:
```bash
aws acm describe-certificate \
  --profile personal-account \
  --certificate-arn YOUR_CERT_ARN \
  --region us-east-1 \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord'
```

Create the CNAME record in your personal account:
```bash
aws route53 change-resource-record-sets \
  --profile personal-account \
  --hosted-zone-id YOUR_ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "VALIDATION_NAME_FROM_ABOVE",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "VALIDATION_VALUE_FROM_ABOVE"}]
      }
    }]
  }'
```

Wait 5-10 minutes for certificate validation:
```bash
# Check certificate status
aws acm describe-certificate \
  --profile personal-account \
  --certificate-arn YOUR_CERT_ARN \
  --region us-east-1 \
  --query 'Certificate.Status'
```

## Step 5: Configure Terraform

Create `terraform/terraform.tfvars`:

```hcl
aws_region  = "us-east-1"
environment = "prod"

# Your samwylock.com subdomain
domain_name          = "admin.samwylock.com"
acm_certificate_arn  = "arn:aws:acm:us-east-1:XXXXX:certificate/XXXXX"  # From Step 3
route53_zone_id      = "Z1234567890ABC"  # From Step 2

# Cross-account DNS access
route53_aws_profile  = "personal-account"
```

## Step 6: Deploy Everything

```bash
cd terraform
terraform init
terraform apply
# Type 'yes' when prompted
```

Wait 10-15 minutes for CloudFront.

## Step 7: Deploy Application

```bash
cd ..
.\terraform\deploy.ps1   # Windows
# OR
./terraform/deploy.sh    # Linux/Mac
```

## Step 8: Test

```bash
# Get your URL
cd terraform
terraform output website_url

# Visit: https://admin.samwylock.com
```

Done! 🎉

---

## Quick Commands

```bash
# Check certificate status
aws acm describe-certificate \
  --profile personal-account \
  --certificate-arn YOUR_ARN \
  --region us-east-1 \
  --query 'Certificate.Status'

# Check DNS record
aws route53 list-resource-record-sets \
  --profile personal-account \
  --hosted-zone-id YOUR_ZONE_ID \
  --query "ResourceRecordSets[?Name=='admin.samwylock.com.']"

# Test DNS resolution
nslookup admin.samwylock.com

# View Terraform outputs
cd terraform && terraform output
```

---

## Troubleshooting

**Issue: "No valid credentials"**
```bash
# Re-configure personal profile
aws configure --profile personal-account
```

**Issue: "Access Denied" on Route53**
```bash
# Verify profile can access Route53
aws route53 list-hosted-zones --profile personal-account
```

**Issue: Certificate not validating**
- Check CNAME record was created in personal account
- Wait 10-15 minutes
- DNS propagation can take time

**Issue: Domain not resolving**
- Wait 5-30 minutes for DNS propagation
- Clear DNS cache: `ipconfig /flushdns` (Windows) or `sudo dscacheutil -flushcache` (Mac)

---

For detailed explanation, see [CROSS-ACCOUNT-DNS.md](CROSS-ACCOUNT-DNS.md)

