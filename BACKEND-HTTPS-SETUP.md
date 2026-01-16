# Backend HTTPS Setup - api.samwylock.com

This guide will help you set up `api.samwylock.com` with HTTPS for your backend API.

## Overview

**Current Setup:**
```
Frontend: https://admin.samwylock.com (CloudFront + HTTPS) ✅
Backend:  http://hovver-admin-alb-2080077084... (HTTP only) ❌
```

**Target Setup:**
```
Frontend: https://admin.samwylock.com (CloudFront + HTTPS) ✅
Backend:  https://api.samwylock.com (ALB + HTTPS) ✅
```

## Prerequisites

- ✅ Route53 hosted zone for `samwylock.com` (in personal account)
- ✅ AWS CLI configured with personal account profile
- ✅ Backend ALB already exists

---

## Step 1: Request ACM Certificate

Request a certificate for `api.samwylock.com` in your **personal account** (where Route53 is):

```bash
aws acm request-certificate \
  --profile personal-account \
  --domain-name api.samwylock.com \
  --validation-method DNS \
  --region us-east-1
```

**Copy the Certificate ARN** from the output (looks like: `arn:aws:acm:us-east-1:123456789:certificate/...`)

---

## Step 2: Validate Certificate via DNS

Get the validation record:

```bash
# Replace CERT_ARN with the ARN from Step 1
aws acm describe-certificate \
  --profile personal-account \
  --certificate-arn CERT_ARN \
  --region us-east-1 \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord'
```

This will return something like:
```json
{
    "Name": "_abc123.api.samwylock.com.",
    "Type": "CNAME",
    "Value": "_xyz456.acm-validations.aws."
}
```

Create the CNAME record in Route53:

```bash
# Get your Route53 zone ID
aws route53 list-hosted-zones --profile personal-account | grep samwylock.com

# Create validation record (replace values from above)
aws route53 change-resource-record-sets \
  --profile personal-account \
  --hosted-zone-id YOUR_ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "_abc123.api.samwylock.com.",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "_xyz456.acm-validations.aws."}]
      }
    }]
  }'
```

**Wait for validation:**

```bash
# Check certificate status (wait for "ISSUED")
aws acm describe-certificate \
  --profile personal-account \
  --certificate-arn CERT_ARN \
  --region us-east-1 \
  --query 'Certificate.Status'
```

This usually takes 5-10 minutes.

---

## Step 3: Get ALB Information

Find your backend ALB details:

```bash
# List load balancers
aws elbv2 describe-load-balancers \
  --query "LoadBalancers[?contains(DNSName, 'hovver-admin-alb')].{Name:LoadBalancerName,ARN:LoadBalancerArn,DNS:DNSName}" \
  --output table

# Save the LoadBalancerArn for next steps
```

Get the target group ARN:

```bash
# Replace ALB_ARN with the ARN from above
aws elbv2 describe-target-groups \
  --load-balancer-arn ALB_ARN \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text
```

---

## Step 4: Add HTTPS Listener to ALB

Add an HTTPS listener (port 443) to your ALB:

```bash
# Replace these values:
# - ALB_ARN: Your load balancer ARN
# - CERT_ARN: Certificate ARN from Step 1
# - TARGET_GROUP_ARN: Target group ARN from Step 3

aws elbv2 create-listener \
  --load-balancer-arn ALB_ARN \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=CERT_ARN \
  --default-actions Type=forward,TargetGroupArn=TARGET_GROUP_ARN
```

**Check listener was created:**

```bash
aws elbv2 describe-listeners \
  --load-balancer-arn ALB_ARN \
  --query 'Listeners[?Protocol==`HTTPS`]'
```

---

## Step 5: Update Security Group

Ensure the ALB security group allows HTTPS (port 443):

```bash
# Get the security group ID
aws elbv2 describe-load-balancers \
  --load-balancer-arns ALB_ARN \
  --query 'LoadBalancers[0].SecurityGroups[0]' \
  --output text

# Add HTTPS rule (replace SECURITY_GROUP_ID)
aws ec2 authorize-security-group-ingress \
  --group-id SECURITY_GROUP_ID \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0
```

---

## Step 6: Create Route53 DNS Record

Create a CNAME record pointing `api.samwylock.com` to your ALB:

```bash
# Get your ALB DNS name
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns ALB_ARN \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

echo "ALB DNS: $ALB_DNS"

# Create CNAME record (in personal account)
aws route53 change-resource-record-sets \
  --profile personal-account \
  --hosted-zone-id YOUR_ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "api.samwylock.com",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "'$ALB_DNS'"}]
      }
    }]
  }'
```

**Alternative: Use A record with Alias (preferred):**

```bash
# Get ALB Hosted Zone ID
ALB_ZONE_ID=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns ALB_ARN \
  --query 'LoadBalancers[0].CanonicalHostedZoneId' \
  --output text)

# Create A record (Alias)
aws route53 change-resource-record-sets \
  --profile personal-account \
  --hosted-zone-id YOUR_ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "api.samwylock.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "'$ALB_ZONE_ID'",
          "DNSName": "'$ALB_DNS'",
          "EvaluateTargetHealth": false
        }
      }
    }]
  }'
```

---

## Step 7: Test Backend HTTPS

Wait 5-10 minutes for DNS propagation, then test:

```bash
# Test DNS resolution
nslookup api.samwylock.com

# Test HTTPS endpoint
curl -I https://api.samwylock.com/

# Should return 200 or 404 (depending on root endpoint)
```

**Test the login endpoint:**

```bash
curl -X POST https://api.samwylock.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass"}'
```

---

## Step 8: Update Frontend Configuration

The `.env.local` has already been updated to:
```env
NEXT_PUBLIC_API_URL=https://api.samwylock.com
```

**Rebuild and deploy:**

```bash
# Rebuild Next.js app
npm run build

# Deploy to S3
cd terraform
.\deploy.ps1
```

---

## Step 9: Update Backend CORS (if needed)

Your backend needs to allow requests from `https://admin.samwylock.com`.

**Example FastAPI CORS configuration:**

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://admin.samwylock.com",
        "http://localhost:3000",  # For local development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Verification Checklist

After completing all steps:

- [ ] ACM certificate is in "Issued" status
- [ ] HTTPS listener exists on ALB (port 443)
- [ ] Security group allows port 443 inbound
- [ ] DNS record `api.samwylock.com` points to ALB
- [ ] `https://api.samwylock.com/` is accessible
- [ ] Backend CORS allows `https://admin.samwylock.com`
- [ ] Frontend rebuilt and deployed with new API URL
- [ ] Login works from `https://admin.samwylock.com`

---

## Troubleshooting

### DNS Not Resolving

```bash
# Check if CNAME/A record exists
aws route53 list-resource-record-sets \
  --profile personal-account \
  --hosted-zone-id YOUR_ZONE_ID \
  --query "ResourceRecordSets[?Name=='api.samwylock.com.']"
```

**If not found:** Re-run Step 6

### Certificate Not Validating

```bash
# Check validation record exists
aws route53 list-resource-record-sets \
  --profile personal-account \
  --hosted-zone-id YOUR_ZONE_ID \
  --query "ResourceRecordSets[?Type=='CNAME' && contains(Name, '_')]"
```

**If not found:** Re-run Step 2

### HTTPS Not Working

```bash
# Check listener exists
aws elbv2 describe-listeners \
  --load-balancer-arn ALB_ARN

# Check certificate is attached
aws elbv2 describe-listener-certificates \
  --listener-arn LISTENER_ARN
```

### CORS Errors

Check backend logs and ensure CORS middleware allows your domain.

---

## Cost Impact

**No additional costs!**
- ACM certificate: Free
- ALB HTTPS listener: No extra charge
- Route53 CNAME: Included in hosted zone cost

---

## Quick Command Reference

```bash
# Variables to set
export PERSONAL_PROFILE="personal-account"
export ZONE_ID="Z..." # Your Route53 zone ID
export ALB_ARN="arn:aws:elasticloadbalancing:..."
export CERT_ARN="arn:aws:acm:us-east-1:..."
export TARGET_GROUP_ARN="arn:aws:elasticloadbalancing:..."

# 1. Request certificate
aws acm request-certificate \
  --profile $PERSONAL_PROFILE \
  --domain-name api.samwylock.com \
  --validation-method DNS \
  --region us-east-1

# 2. Check certificate status
aws acm describe-certificate \
  --profile $PERSONAL_PROFILE \
  --certificate-arn $CERT_ARN \
  --region us-east-1 \
  --query 'Certificate.Status'

# 3. Add HTTPS listener
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=$CERT_ARN \
  --default-actions Type=forward,TargetGroupArn=$TARGET_GROUP_ARN

# 4. Create DNS record
aws route53 change-resource-record-sets \
  --profile $PERSONAL_PROFILE \
  --hosted-zone-id $ZONE_ID \
  --change-batch file://dns-record.json

# 5. Test
curl -I https://api.samwylock.com/
```

---

## Next Steps

1. Follow steps 1-7 to set up backend HTTPS
2. Wait for DNS propagation (5-30 minutes)
3. Test `https://api.samwylock.com/`
4. Rebuild and deploy frontend
5. Test login at `https://admin.samwylock.com`

The frontend is already configured to use `https://api.samwylock.com` - you just need to set up the backend!

