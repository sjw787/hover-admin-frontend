# Deployment script for Hover Admin Frontend (Windows PowerShell)
# Usage: .\deploy.ps1 [environment]

param(
    [string]$Environment = "dev"
)

$ErrorActionPreference = "Stop"

# Determine the correct paths based on where the script is run from
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$TerraformDir = $ScriptDir

# Change to project root for building
Set-Location $ProjectRoot

Write-Host "Deploying Hover Admin Frontend to AWS ($Environment)" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# Check if terraform is initialized
if (-not (Test-Path "$TerraformDir\.terraform")) {
    Write-Host "`nInitializing Terraform..." -ForegroundColor Yellow
    Push-Location $TerraformDir
    terraform init
    Pop-Location
}

# Build Next.js app
Write-Host "`nBuilding Next.js application..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

# Get S3 bucket name and CloudFront distribution ID
Push-Location $TerraformDir
$S3Bucket = (terraform output -raw s3_bucket_name 2>$null)
$CFDistId = (terraform output -raw cloudfront_distribution_id 2>$null)

# Try to get the personal profile (may not exist if not using cross-account)
$PersonalProfile = ""
try {
    $PersonalProfile = (terraform output -raw route53_aws_profile 2>&1) | Out-String
    $PersonalProfile = $PersonalProfile.Trim()
    # If output contains error messages or is empty, set to empty string
    if ($PersonalProfile -match "Warning|Error|╖" -or [string]::IsNullOrWhiteSpace($PersonalProfile)) {
        $PersonalProfile = ""
    }
} catch {
    $PersonalProfile = ""
}
Pop-Location

if ([string]::IsNullOrEmpty($S3Bucket)) {
    Write-Host "Error: Infrastructure not deployed. Run 'cd terraform && terraform apply' first" -ForegroundColor Red
    exit 1
}

# Determine if we need to use a profile for CloudFront (cross-account setup)
$UseProfile = -not ([string]::IsNullOrEmpty($PersonalProfile))
if ($UseProfile) {
    Write-Host "`nNote: Using AWS profile '$PersonalProfile' for CloudFront operations" -ForegroundColor Cyan
}

# Sync to S3
Write-Host "`nUploading to S3 bucket: $S3Bucket" -ForegroundColor Yellow

# Upload JS/CSS/font files with long cache (they have hashed filenames)
Write-Host "Uploading static assets (JS, CSS, fonts)..." -ForegroundColor Gray
aws s3 sync out/ "s3://$S3Bucket" `
    --delete `
    --cache-control "public,max-age=31536000,immutable" `
    --exclude "*" `
    --include "*.js" `
    --include "*.css" `
    --include "*.woff" `
    --include "*.woff2" `
    --include "*.ttf" `
    --include "*.eot"

# Upload images with medium cache
Write-Host "Uploading images..." -ForegroundColor Gray
aws s3 sync out/ "s3://$S3Bucket" `
    --cache-control "public,max-age=86400" `
    --exclude "*" `
    --include "*.png" `
    --include "*.jpg" `
    --include "*.jpeg" `
    --include "*.gif" `
    --include "*.svg" `
    --include "*.ico" `
    --include "*.webp"

# Upload HTML files with NO cache (always fetch fresh)
Write-Host "Uploading HTML files..." -ForegroundColor Gray
aws s3 sync out/ "s3://$S3Bucket" `
    --exclude "*" `
    --include "*.html" `
    --cache-control "public,max-age=0,must-revalidate,no-cache,no-store"

# Upload JSON files with NO cache (build manifests, etc)
Write-Host "Uploading JSON/metadata files..." -ForegroundColor Gray
aws s3 sync out/ "s3://$S3Bucket" `
    --exclude "*" `
    --include "*.json" `
    --include "*.txt" `
    --cache-control "public,max-age=0,must-revalidate"

# Invalidate CloudFront cache
Write-Host "`nInvalidating CloudFront cache..." -ForegroundColor Yellow

# Build the AWS CLI command with profile if needed
if ($UseProfile) {
    $InvalidationOutput = aws cloudfront create-invalidation `
        --profile $PersonalProfile `
        --distribution-id $CFDistId `
        --paths "/*" `
        --query 'Invalidation.Id' `
        --output text
} else {
    $InvalidationOutput = aws cloudfront create-invalidation `
        --distribution-id $CFDistId `
        --paths "/*" `
        --query 'Invalidation.Id' `
        --output text
}

Write-Host "   Invalidation ID: $InvalidationOutput" -ForegroundColor Gray

# Get website URL
Push-Location $TerraformDir
$WebsiteUrl = (terraform output -raw website_url)
Pop-Location

Write-Host "`nDeployment complete!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Website URL: $WebsiteUrl" -ForegroundColor Cyan
Write-Host "`nNote: CloudFront invalidation may take a few minutes to complete." -ForegroundColor Gray

if ($UseProfile) {
    Write-Host "Check status: aws cloudfront get-invalidation --profile $PersonalProfile --id $InvalidationOutput --distribution-id $CFDistId" -ForegroundColor Gray
} else {
    Write-Host "Check status: aws cloudfront get-invalidation --id $InvalidationOutput --distribution-id $CFDistId" -ForegroundColor Gray
}

