#!/bin/bash
# Deployment script for Hover Admin Frontend
# Usage: ./deploy.sh [environment]

set -e

ENVIRONMENT=${1:-dev}
TERRAFORM_DIR="terraform"

echo "🚀 Deploying Hover Admin Frontend to AWS (${ENVIRONMENT})"
echo "=================================================="

# Check if terraform is initialized
if [ ! -d "${TERRAFORM_DIR}/.terraform" ]; then
    echo "📦 Initializing Terraform..."
    cd ${TERRAFORM_DIR}
    terraform init
    cd ..
fi

# Build Next.js app
echo ""
echo "🔨 Building Next.js application..."
npm run build

# Get S3 bucket name and CloudFront distribution ID
cd ${TERRAFORM_DIR}
S3_BUCKET=$(terraform output -raw s3_bucket_name 2>/dev/null || echo "")
CF_DIST_ID=$(terraform output -raw cloudfront_distribution_id 2>/dev/null || echo "")
cd ..

if [ -z "$S3_BUCKET" ]; then
    echo "❌ Error: Infrastructure not deployed. Run 'cd terraform && terraform apply' first"
    exit 1
fi

# Sync to S3
echo ""
echo "📤 Uploading to S3 bucket: ${S3_BUCKET}"
aws s3 sync out/ s3://${S3_BUCKET} \
    --delete \
    --cache-control "public,max-age=31536000,immutable" \
    --exclude "*.html" \
    --exclude "*.json"

# Upload HTML files with different cache settings
aws s3 sync out/ s3://${S3_BUCKET} \
    --exclude "*" \
    --include "*.html" \
    --include "*.json" \
    --cache-control "public,max-age=0,must-revalidate"

# Invalidate CloudFront cache
echo ""
echo "🔄 Invalidating CloudFront cache..."
INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --distribution-id ${CF_DIST_ID} \
    --paths "/*" \
    --query 'Invalidation.Id' \
    --output text)

echo "   Invalidation ID: ${INVALIDATION_ID}"

# Get website URL
cd ${TERRAFORM_DIR}
WEBSITE_URL=$(terraform output -raw website_url)
cd ..

echo ""
echo "✅ Deployment complete!"
echo "=================================================="
echo "🌐 Website URL: ${WEBSITE_URL}"
echo ""
echo "Note: CloudFront invalidation may take a few minutes to complete."
echo "Check status: aws cloudfront get-invalidation --id ${INVALIDATION_ID} --distribution-id ${CF_DIST_ID}"

