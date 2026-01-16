# Quick Deploy to AWS Amplify
# This script helps you deploy the frontend to AWS Amplify

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Hover Admin Frontend - Amplify Deploy" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if terraform is installed
if (-not (Get-Command terraform -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Terraform is not installed!" -ForegroundColor Red
    Write-Host "   Install from: https://www.terraform.io/downloads" -ForegroundColor Yellow
    exit 1
}

Write-Host "[OK] Terraform found" -ForegroundColor Green

# Check if we're in the right directory
if (-not (Test-Path "terraform")) {
    Write-Host "[ERROR] Please run this script from the project root directory" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Project directory verified" -ForegroundColor Green
Write-Host ""

# Check if terraform.tfvars exists
if (-not (Test-Path "terraform/terraform.tfvars")) {
    Write-Host "[WARN] terraform.tfvars not found" -ForegroundColor Yellow
    Write-Host ""

    $createConfig = Read-Host "Would you like to create it from the example? (y/n)"

    if ($createConfig -eq "y" -or $createConfig -eq "Y") {
        Copy-Item "terraform/terraform.tfvars.amplify.example" "terraform/terraform.tfvars"
        Write-Host "[OK] Created terraform/terraform.tfvars" -ForegroundColor Green
        Write-Host ""
        Write-Host "Please edit terraform/terraform.tfvars with your settings:" -ForegroundColor Cyan
        Write-Host "   - GitHub repository URL" -ForegroundColor White
        Write-Host "   - GitHub access token" -ForegroundColor White
        Write-Host "   - Backend API URL" -ForegroundColor White
        Write-Host "   - Domain name (from personal account)" -ForegroundColor White
        Write-Host "   - ACM certificate ARN (us-east-1)" -ForegroundColor White
        Write-Host "   - Route53 zone ID" -ForegroundColor White
        Write-Host "   - AWS profile for personal account" -ForegroundColor White
        Write-Host ""

        $editNow = Read-Host "Press Enter when done editing, or Ctrl+C to exit"
    } else {
        Write-Host "[ERROR] Cannot proceed without terraform.tfvars" -ForegroundColor Red
        exit 1
    }
}

Write-Host "[OK] Configuration file found" -ForegroundColor Green
Write-Host ""

# Change to terraform directory
Set-Location terraform

# Initialize Terraform
Write-Host "Initializing Terraform..." -ForegroundColor Cyan
terraform init

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Terraform init failed!" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Write-Host "[OK] Terraform initialized" -ForegroundColor Green
Write-Host ""

# Show plan
Write-Host "Generating deployment plan..." -ForegroundColor Cyan
Write-Host ""
terraform plan

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Terraform plan failed!" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

$deploy = Read-Host "Deploy to AWS Amplify? (yes/no)"

if ($deploy -eq "yes") {
    Write-Host ""
    Write-Host "Deploying to AWS Amplify..." -ForegroundColor Cyan
    Write-Host "   This may take 5-10 minutes..." -ForegroundColor Yellow
    Write-Host ""

    terraform apply

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "  Deployment Successful!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Important URLs:" -ForegroundColor Cyan
        Write-Host ""

        terraform output amplify_default_domain
        terraform output amplify_custom_domain
        terraform output amplify_console_url

        Write-Host ""
        Write-Host "Next Steps:" -ForegroundColor Cyan
        Write-Host "   1. Visit the Amplify Console to monitor the build" -ForegroundColor White
        Write-Host "   2. Update your backend CORS to allow the new domain" -ForegroundColor White
        Write-Host "   3. Test admin and customer login flows" -ForegroundColor White
        Write-Host "   4. Verify SSL certificate is working" -ForegroundColor White
        Write-Host ""
        Write-Host "See terraform/AMPLIFY_DEPLOYMENT.md for more details" -ForegroundColor Yellow
        Write-Host ""
    } else {
        Write-Host ""
        Write-Host "[ERROR] Deployment failed!" -ForegroundColor Red
        Write-Host "   Check the error messages above" -ForegroundColor Yellow
        Set-Location ..
        exit 1
    }
} else {
    Write-Host ""
    Write-Host "[INFO] Deployment cancelled" -ForegroundColor Yellow
    Write-Host "   Run 'terraform apply' in the terraform/ directory when ready" -ForegroundColor White
}

# Return to project root
Set-Location ..

Write-Host ""
Write-Host "Done!" -ForegroundColor Green

