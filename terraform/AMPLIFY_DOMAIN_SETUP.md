# AWS Amplify Domain Configuration - IMPORTANT

## Key Changes Made

### ✅ Certificate Handling
**OLD (Incorrect):** Trying to use ACM certificate from personal account  
**NEW (Correct):** Amplify automatically provisions its own SSL certificate

### ✅ Account Configuration
**Deployment Account:** `iamadmin-dev` - Amplify resources created here  
**Personal Account:** `admin-legacy` - Route53 DNS records managed here

### How It Works

1. **Amplify Domain Association** → Created in deployment account (`iamadmin-dev`)
2. **SSL Certificate** → Auto-provisioned by Amplify (you don't provide one)
3. **DNS Validation** → Amplify provides CNAME records for validation
4. **Route53 Records** → Created in personal account to point to Amplify

## Deployment Flow

```
┌─────────────────────────────────────────┐
│  Deployment Account (iamadmin-dev)      │
│  ┌────────────────────────────────────┐ │
│  │  AWS Amplify App                   │ │
│  │  - Builds Next.js app              │ │
│  │  - Default domain:                 │ │
│  │    master.d123abc.amplifyapp.com   │ │
│  └────────────────────────────────────┘ │
│                                           │
│  ┌────────────────────────────────────┐ │
│  │  Amplify Domain Association        │ │
│  │  - Requests: admin.samwylock.com   │ │
│  │  - Auto-creates SSL certificate    │ │
│  │  - Provides DNS validation CNAMEs  │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
                    ↓
         DNS Validation Required
                    ↓
┌─────────────────────────────────────────┐
│  Personal Account                        │
│  ┌────────────────────────────────────┐ │
│  │  Route53 Hosted Zone               │ │
│  │  samwylock.com                     │ │
│  │                                    │ │
│  │  Records Created by Terraform:    │ │
│  │  ├─ admin CNAME → Amplify domain  │ │
│  │                                    │ │
│  │  Records You Must Add Manually:   │ │
│  │  └─ _cert_validation CNAME        │ │
│  │     (from Amplify Console)         │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## Post-Deployment Steps

### 1. Get Certificate Validation Records

After running `terraform apply`, go to:
- AWS Amplify Console
- Your app → Domain management
- You'll see a CNAME record like:

```
Name: _abc123def456.admin.samwylock.com
Value: _xyz789.acm-validations.aws.
```

### 2. Add Validation Record to Route53 (Personal Account)

```bash
# Switch to personal account (admin-legacy profile)
aws route53 change-resource-record-sets \
  --hosted-zone-id Z0463989E6ZRMK2X7OOO \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "_abc123def456.admin.samwylock.com",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "_xyz789.acm-validations.aws."}]
      }
    }]
  }' \
  --profile admin-legacy
```

Or add it manually in Route53 console.

### 3. Wait for Certificate Validation

- Takes 5-30 minutes
- Check in Amplify Console → Domain management
- Status will change from "Pending" to "Available"

### 4. DNS Propagation

Once certificate is validated:
- `admin.samwylock.com` → Points to Amplify
- SSL certificate is active
- Your app is accessible via HTTPS

## Configuration Summary

**Your terraform.tfvars:**
```hcl
domain_name         = "samwylock.com"           # Root domain
route53_zone_id     = "Z0463989E6ZRMK2X7OOO"  # Personal account hosted zone
route53_aws_profile = "admin-legacy"            # Personal account profile

# ACM cert ARN NOT needed - Amplify creates its own
```

**What Terraform Creates:**
1. Amplify app in deployment account
2. Amplify domain association (auto SSL)
3. Route53 CNAME: `admin` → Amplify domain (in personal account)

**What You Must Do Manually:**
1. Add certificate validation CNAME (from Amplify Console) to Route53
2. Wait for validation (5-30 min)
3. Test: https://admin.samwylock.com (for prod)
   or https://dev.admin.samwylock.com (for dev)

## Troubleshooting

### "Certificate pending validation"
- Check Amplify Console for validation CNAME
- Verify CNAME added to Route53 in personal account
- Wait up to 30 minutes

### "Domain not resolving"
- Check Route53 has CNAME: `admin` → `master.d123abc.amplifyapp.com`
- Wait for DNS propagation (5-15 minutes)
- Test: `nslookup admin.samwylock.com`

### "Wrong account"
- Amplify resources are in deployment account (iamadmin-dev) ✓
- Route53 records are in personal account ✓
- This is correct!

## Commands

```bash
# Deploy
cd terraform
terraform init
terraform plan
terraform apply

# Check Amplify console
terraform output amplify_console_url

# Check domain in Amplify
# Go to: Domain management section
```

## Important Notes

⚠️ **You cannot use your existing ACM certificate from personal account**
- Amplify doesn't support cross-account certificates
- Amplify provisions its own certificate automatically
- This is a limitation of AWS Amplify

✅ **This is the correct approach**
- Let Amplify manage the certificate
- You just add the DNS validation records
- Everything else is automatic

