# AWS Amplify Deployment Checklist

Use this checklist to deploy your Hover Admin Frontend to AWS Amplify using your personal domain and certificate.

## Pre-Deployment Checklist

### GitHub Setup
- [ ] Code is pushed to GitHub repository
- [ ] Repository URL: ___________________________________
- [ ] Branch to deploy: ___________________________________
- [ ] Created GitHub Personal Access Token
  - Visit: https://github.com/settings/tokens
  - Required scopes: `repo`, `admin:repo_hook`
  - Token: ghp___________________________________ (keep secure!)

### Personal AWS Account (Domain & Certificate)
- [ ] Domain name: ___________________________________
- [ ] Route53 Hosted Zone ID: ___________________________________
- [ ] ACM Certificate created in **us-east-1** region
- [ ] ACM Certificate ARN: ___________________________________
- [ ] Certificate status: ISSUED ✓
- [ ] AWS CLI profile configured: ___________________________________
  - Test with: `aws route53 list-hosted-zones --profile personal`

### Work/Project AWS Account (Amplify)
- [ ] AWS CLI configured for work account
- [ ] Sufficient permissions to create Amplify apps
- [ ] Backend API deployed and URL: ___________________________________

## Configuration Steps

### 1. Terraform Configuration
```powershell
cd terraform
cp terraform.tfvars.amplify.example terraform.tfvars
```

- [ ] Edit `terraform.tfvars`:
  - [ ] `github_repository` = "___________________________________"
  - [ ] `github_access_token` = "___________________________________"
  - [ ] `github_branch` = "___________________________________"
  - [ ] `api_url` = "___________________________________"
  - [ ] `domain_name` = "___________________________________"
  - [ ] `acm_certificate_arn` = "___________________________________"
  - [ ] `route53_zone_id` = "___________________________________"
  - [ ] `route53_aws_profile` = "personal" (or your profile name)
  - [ ] `environment` = "prod" (or "dev", "staging")

### 2. AWS Credentials Configuration
- [ ] Edit `~/.aws/credentials`:
```ini
[default]
aws_access_key_id = YOUR_WORK_KEY
aws_secret_access_key = YOUR_WORK_SECRET

[personal]
aws_access_key_id = YOUR_PERSONAL_KEY
aws_secret_access_key = YOUR_PERSONAL_SECRET
```

- [ ] Edit `~/.aws/config`:
```ini
[default]
region = us-east-1

[profile personal]
region = us-east-1
```

- [ ] Test both profiles:
```powershell
aws sts get-caller-identity  # Work account
aws sts get-caller-identity --profile personal  # Personal account
```

## Deployment

### 3. Deploy to Amplify
- [ ] Navigate to terraform directory: `cd terraform`
- [ ] Initialize Terraform: `terraform init`
- [ ] Review plan: `terraform plan`
- [ ] Apply configuration: `terraform apply`
- [ ] Type "yes" to confirm
- [ ] Wait for deployment (5-10 minutes)
- [ ] Note the output URLs

### 4. Verify Deployment
- [ ] Amplify default URL works: ___________________________________
- [ ] Custom domain URL works: ___________________________________
- [ ] Amplify Console URL: ___________________________________
- [ ] Build completed successfully in Amplify Console
- [ ] SSL certificate is active (green lock in browser)

## Post-Deployment Configuration

### 5. Backend CORS Update
- [ ] Add new domain to backend CORS allowed origins:
```python
allow_origins=[
    "https://admin.yourdomain.com",  # Add this
    # ... existing origins
]
```
- [ ] Deploy backend changes
- [ ] Test API connectivity from frontend

### 6. Testing
- [ ] **Admin User Tests:**
  - [ ] Login successful
  - [ ] See "Admin" badge in header
  - [ ] Can access Customers page
  - [ ] Can create new customer
  - [ ] Can upload file to customer folder
  - [ ] Can upload file to general folder
  - [ ] Can filter gallery by customer
  - [ ] Can delete images

- [ ] **Customer User Tests:**
  - [ ] Login successful
  - [ ] See "Customer" badge in header
  - [ ] Cannot access Customers page (redirects to gallery)
  - [ ] Cannot access Upload page (redirects to gallery)
  - [ ] Gallery shows only own files + general files
  - [ ] Can view and download images
  - [ ] No delete button visible

- [ ] **Security Tests:**
  - [ ] HTTPS works (SSL certificate valid)
  - [ ] Redirects to login when not authenticated
  - [ ] Session timeout works
  - [ ] Token refresh works
  - [ ] CORS configured correctly (no console errors)

### 7. DNS Verification
- [ ] DNS propagation complete: `nslookup admin.yourdomain.com`
- [ ] Points to Amplify: ___________________________________.amplifyapp.com
- [ ] SSL certificate valid: `curl -vI https://admin.yourdomain.com`
- [ ] Both www and non-www work (if configured)

## Monitoring Setup

### 8. CloudWatch Configuration
- [ ] Enable CloudWatch logs in Amplify Console
- [ ] Create CloudWatch dashboard
- [ ] Setup SNS topic for alerts
- [ ] Create alarm: Build failures
- [ ] Create alarm: HTTP 5xx errors
- [ ] Create alarm: High response time

### 9. Documentation
- [ ] Document the deployment in team wiki
- [ ] Share URLs with team:
  - Production: ___________________________________
  - Staging: ___________________________________
  - Amplify Console: ___________________________________
- [ ] Update runbook with deployment process
- [ ] Create incident response plan

## Continuous Deployment Setup

### 10. Git Workflow
- [ ] Push to main branch triggers production deployment
- [ ] Create `dev` branch for development
- [ ] Configure branch protection rules in GitHub
- [ ] Setup PR preview deployments (optional)

### 11. Rollback Plan
- [ ] Document rollback procedure
- [ ] Test rollback: Revert to previous deployment in Amplify Console
- [ ] Verify rollback works correctly
- [ ] Document in runbook

## Cost Optimization

### 12. Cost Monitoring
- [ ] Setup AWS Budget alert for Amplify costs
- [ ] Review Cost Explorer for Amplify charges
- [ ] Expected monthly cost: ~$2-5
- [ ] Setup notification if cost exceeds $10/month

## Optional Enhancements

### 13. Advanced Features (Optional)
- [ ] Enable branch-based deployments for staging
- [ ] Setup PR preview environments
- [ ] Configure custom headers for security
- [ ] Enable access logs
- [ ] Setup custom error pages (404, 500)
- [ ] Configure password protection for staging
- [ ] Setup A/B testing (Amplify feature)

## Cleanup (If Migration from S3)

### 14. Remove Old S3 Resources
- [ ] Verify Amplify deployment is stable (wait 1 week)
- [ ] Backup any data from old S3 bucket
- [ ] Update DNS records (already done)
- [ ] Destroy S3 + CloudFront resources:
```powershell
terraform destroy -target=aws_s3_bucket.frontend
terraform destroy -target=aws_cloudfront_distribution.frontend
```
- [ ] Verify old resources are deleted
- [ ] Remove old terraform state files

## Final Verification

### 15. Production Readiness
- [ ] All admin features work correctly
- [ ] All customer features work correctly  
- [ ] SSL certificate is valid
- [ ] DNS resolves correctly
- [ ] Backend CORS configured
- [ ] Monitoring alerts configured
- [ ] Team has access to Amplify Console
- [ ] Documentation updated
- [ ] Rollback plan tested

## Sign-Off

**Deployed by:** ___________________________________ **Date:** ___________

**Verified by:** ___________________________________ **Date:** ___________

**Production URL:** ___________________________________________

**Amplify App ID:** ___________________________________________

**Notes:**
___________________________________________________________________________
___________________________________________________________________________
___________________________________________________________________________

---

## Quick Reference Commands

```powershell
# Deploy
cd terraform
terraform apply

# Check outputs
terraform output amplify_default_domain
terraform output amplify_custom_domain
terraform output amplify_console_url

# Trigger manual deployment (if webhook enabled)
$WEBHOOK_URL = terraform output -raw amplify_webhook_url
curl -X POST $WEBHOOK_URL

# Rollback in Amplify Console
# Go to: Amplify Console → App → Deployments → Select previous → Redeploy

# Destroy (cleanup)
terraform destroy
```

## Support Contacts

**AWS Support:** https://console.aws.amazon.com/support/  
**Amplify Docs:** https://docs.aws.amazon.com/amplify/  
**Terraform Docs:** https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/amplify_app

**Internal Team:**
- DevOps Lead: ___________________________________
- Backend Lead: ___________________________________
- Frontend Lead: ___________________________________

