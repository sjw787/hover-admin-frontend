# Migration Script: S3+CloudFront to Amplify
# This script removes the old S3+CloudFront resources from Terraform state
# without destroying them, allowing you to clean them up manually later

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Migrate to AWS Amplify" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "This script will:" -ForegroundColor Yellow
Write-Host "  1. Remove old S3+CloudFront resources from Terraform state" -ForegroundColor White
Write-Host "  2. Keep the resources in AWS (not destroyed)" -ForegroundColor White
Write-Host "  3. Allow Terraform to manage only Amplify resources" -ForegroundColor White
Write-Host ""

$confirm = Read-Host "Do you want to proceed? (yes/no)"

if ($confirm -ne "yes") {
    Write-Host "[INFO] Migration cancelled" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Step 1: Removing old S3+CloudFront resources from state..." -ForegroundColor Cyan
Write-Host ""

# List of resources to remove
$resources = @(
    "data.aws_iam_policy_document.s3_policy",
    "aws_s3_bucket.website",
    "aws_s3_bucket_policy.website",
    "aws_s3_bucket_public_access_block.website",
    "aws_s3_bucket_website_configuration.website",
    "aws_cloudfront_origin_access_identity.website",
    "aws_cloudfront_function.url_rewrite"
)

foreach ($resource in $resources) {
    Write-Host "Removing: $resource" -ForegroundColor Yellow
    terraform state rm $resource

    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Removed successfully" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ Resource not found in state (already removed?)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Migration Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Run: terraform plan" -ForegroundColor White
Write-Host "     (Should show no changes for S3/CloudFront)" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Run: terraform apply" -ForegroundColor White
Write-Host "     (Will manage only Amplify resources)" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. Optional: Clean up old resources manually" -ForegroundColor White
Write-Host "     - S3 bucket: hover-admin-frontend-files" -ForegroundColor Gray
Write-Host "     - CloudFront OAI and Function in personal account" -ForegroundColor Gray
Write-Host ""

Write-Host "Resources left in AWS (not destroyed):" -ForegroundColor Yellow
Write-Host "  - S3 bucket: hover-admin-frontend-files" -ForegroundColor White
Write-Host "  - CloudFront OAI (in admin-legacy account)" -ForegroundColor White
Write-Host "  - CloudFront Function (in admin-legacy account)" -ForegroundColor White
Write-Host ""
Write-Host "You can delete these manually if no longer needed." -ForegroundColor Gray
Write-Host ""
