# Deployment Checklist

Use this checklist to ensure a successful deployment.

## ✅ Pre-Deployment

### Local Environment
- [ ] Node.js 20+ installed (`node --version`)
- [ ] AWS CLI installed (`aws --version`)
- [ ] Terraform installed (`terraform version`)
- [ ] AWS credentials configured (`aws sts get-caller-identity`)
- [ ] Repository cloned locally

### AWS Account
- [ ] IAM user created with appropriate permissions
- [ ] Access Key ID and Secret Access Key available
- [ ] S3 access permission
- [ ] CloudFront access permission
- [ ] Route53 access permission (if using custom domain)

### Project Configuration
- [ ] `.env.local` has correct API URL
- [ ] `next.config.ts` has `output: 'export'`
- [ ] Backend API is accessible
- [ ] Test login works locally (`npm run dev`)

## ✅ Initial Infrastructure Setup

### Terraform Configuration
- [ ] Navigate to `terraform/` directory
- [ ] Copy `terraform.tfvars.example` to `terraform.tfvars`
- [ ] Edit `terraform.tfvars` with your settings
- [ ] Review `main.tf` configuration

### Deploy Infrastructure
- [ ] Run `terraform init`
- [ ] Run `terraform plan` (review output)
- [ ] Run `terraform apply` (type 'yes')
- [ ] Wait 10-15 minutes for CloudFront distribution
- [ ] Save outputs: `terraform output` (copy to safe place)

### Verify Infrastructure
- [ ] S3 bucket created
- [ ] CloudFront distribution status: "Deployed"
- [ ] CloudFront domain name works (may show empty initially)

## ✅ First Deployment

### Build Application
- [ ] Run `npm install` (if not done)
- [ ] Run `npm run build`
- [ ] Verify `out/` directory created
- [ ] Check `out/index.html` exists

### Deploy to S3
- [ ] Get S3 bucket name from terraform output
- [ ] Run deployment script:
  - Windows: `.\terraform\deploy.ps1`
  - Linux/Mac: `./terraform/deploy.sh`
- [ ] Wait for upload to complete
- [ ] Wait for CloudFront invalidation

### Test Deployment
- [ ] Get website URL: `terraform output website_url`
- [ ] Visit URL in browser
- [ ] Test login functionality
- [ ] Test image upload
- [ ] Test image gallery
- [ ] Test image deletion
- [ ] Test on mobile device

## ✅ Custom Domain (Optional)

### Cross-Account DNS (if applicable)
- [ ] **If Route53 zone is in different AWS account:**
  - [ ] Configure AWS CLI profile for DNS account
  - [ ] Test profile: `aws route53 list-hosted-zones --profile PROFILE_NAME`
  - [ ] Get Route53 zone ID from DNS account
  - [ ] Add `route53_aws_profile` to terraform.tfvars
  - [ ] See [terraform/CROSS-ACCOUNT-DNS.md](terraform/CROSS-ACCOUNT-DNS.md)

### Certificate Setup
- [ ] Request ACM certificate in us-east-1
- [ ] Add DNS validation record
- [ ] Wait for certificate to be "Issued"
- [ ] Copy certificate ARN

### DNS Configuration
- [ ] Get Route53 hosted zone ID (from correct AWS account)
- [ ] Update `terraform.tfvars` with:
  - domain_name (e.g., "admin.samwylock.com")
  - acm_certificate_arn
  - route53_zone_id
  - route53_aws_profile (if cross-account)
- [ ] Run `terraform apply`
- [ ] Wait for DNS propagation (5-30 minutes)
- [ ] Test custom domain

## ✅ CI/CD Setup (Optional)

### GitHub Secrets
- [ ] Add `AWS_ACCESS_KEY_ID` (or setup OIDC)
- [ ] Add `AWS_SECRET_ACCESS_KEY`
- [ ] Add `NEXT_PUBLIC_API_URL`

### Verify Workflow
- [ ] Push to main branch
- [ ] Check GitHub Actions tab
- [ ] Verify workflow runs successfully
- [ ] Test deployed site

## ✅ Post-Deployment

### Security
- [ ] Verify S3 bucket is not public
- [ ] Test access without CloudFront URL (should fail)
- [ ] Check HTTPS redirects working
- [ ] Review CloudFront settings

### Performance
- [ ] Test page load speed
- [ ] Check CloudFront cache hits
- [ ] Verify compression enabled
- [ ] Test from different geographic locations

### Monitoring
- [ ] Review CloudWatch metrics
- [ ] Set up billing alerts
- [ ] Enable CloudFront logging (optional)
- [ ] Document access logs location

### Documentation
- [ ] Update README with production URL
- [ ] Document custom domain (if used)
- [ ] Save terraform outputs in secure location
- [ ] Document deployment process for team

## ✅ Maintenance

### Regular Tasks
- [ ] Review AWS costs monthly
- [ ] Check for Terraform updates
- [ ] Review CloudFront cache efficiency
- [ ] Update dependencies (`npm update`)

### When Updating Content
- [ ] Make changes locally
- [ ] Test with `npm run dev`
- [ ] Build: `npm run build`
- [ ] Deploy: Run deployment script
- [ ] Verify changes live

### When Updating Infrastructure
- [ ] Update terraform files
- [ ] Run `terraform plan`
- [ ] Review changes carefully
- [ ] Run `terraform apply`
- [ ] Verify no breaking changes

## 📋 Quick Reference

### Common Commands

```bash
# Infrastructure
cd terraform
terraform init              # Initialize
terraform plan              # Preview changes
terraform apply             # Deploy infrastructure
terraform destroy           # Remove all resources
terraform output            # Show outputs

# Application deployment
npm run build               # Build app
.\terraform\deploy.ps1      # Deploy (Windows)
./terraform/deploy.sh       # Deploy (Linux/Mac)

# AWS CLI
aws s3 ls s3://BUCKET_NAME/           # List S3 files
aws cloudfront list-distributions     # List distributions
aws cloudfront create-invalidation    # Invalidate cache
```

### Important URLs

- CloudFront URL: `terraform output website_url`
- S3 Bucket: `terraform output s3_bucket_name`
- Distribution ID: `terraform output cloudfront_distribution_id`
- AWS Console: https://console.aws.amazon.com
- Terraform Registry: https://registry.terraform.io

## 🆘 Troubleshooting

If something goes wrong:

1. **Check this checklist** - Did you skip a step?
2. **Review error messages** - Terraform errors are usually descriptive
3. **Check AWS Console** - Verify resources are created
4. **Check CloudWatch Logs** - For runtime errors
5. **See DEPLOYMENT.md** - Troubleshooting section

## 🎉 Success Criteria

Your deployment is successful when:

- ✅ Website loads at CloudFront URL
- ✅ Login works
- ✅ Image upload works
- ✅ Gallery displays images
- ✅ Delete works
- ✅ HTTPS enabled
- ✅ No console errors
- ✅ Works on mobile

## 📞 Support

- Terraform Issues: https://github.com/hashicorp/terraform/issues
- AWS Support: https://console.aws.amazon.com/support
- Next.js Docs: https://nextjs.org/docs

---

**Last Updated:** January 15, 2026

