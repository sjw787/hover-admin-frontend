# Quick Start - Deploy in 5 Minutes

Fast track deployment guide for the Hover Admin Frontend.

## Prerequisites Check

```bash
# Check if tools are installed
aws --version        # Should show AWS CLI version
terraform version    # Should show Terraform version
node --version       # Should show Node.js v20.x
```

If missing, see [DEPLOYMENT.md](DEPLOYMENT.md) for installation instructions.

## 1. Configure AWS

```bash
aws configure
# Enter your AWS credentials
```

## 2. Deploy Infrastructure

```bash
cd terraform
terraform init
terraform apply
# Type 'yes' when prompted
# Wait 10-15 minutes for CloudFront
```

## 3. Deploy Application

**Windows:**
```powershell
cd ..
.\terraform\deploy.ps1
```

**Linux/Mac:**
```bash
cd ..
chmod +x terraform/deploy.sh
./terraform/deploy.sh
```

## 4. Get Your URL

```bash
cd terraform
terraform output website_url
```

**Done!** 🎉 Visit the URL shown.

---

## Updating the Site

After making changes:

```bash
# Windows
.\terraform\deploy.ps1

# Linux/Mac
./terraform/deploy.sh
```

## Removing Everything

```bash
cd terraform
aws s3 rm s3://$(terraform output -raw s3_bucket_name) --recursive
terraform destroy
```

---

For detailed instructions, see [DEPLOYMENT.md](DEPLOYMENT.md)

