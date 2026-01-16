# Hover Admin Frontend - S3 + CloudFront Infrastructure
# This configuration deploys a Next.js static site to S3 with CloudFront CDN

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Uncomment to use S3 backend for state management
  # backend "s3" {
  #   bucket = "your-terraform-state-bucket"
  #   key    = "hover-admin-frontend/terraform.tfstate"
  #   region = "us-east-1"
  # }
}

provider "aws" {
  region  = var.aws_region
  profile = "iamadmin-dev"

  default_tags {
    tags = {
      Project     = "Hover Admin Frontend"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Provider for personal account (Route53, CloudFront, ACM)
# Used when personal account has CloudFront access and Route53 hosted zone
provider "aws" {
  alias  = "personal"
  region = var.aws_region

  # Use AWS CLI profile for personal account
  profile = var.route53_aws_profile != "" ? var.route53_aws_profile : null

  # Option 2: Use assume role (uncomment and configure if needed)
  # assume_role {
  #   role_arn     = var.route53_assume_role_arn
  #   session_name = "terraform-hover-admin-personal"
  # }

  default_tags {
    tags = {
      Project     = "Hover Admin Frontend"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# ==============================================================================
# LEGACY S3 + CLOUDFRONT RESOURCES - DEPRECATED
# ==============================================================================
# These resources are no longer used. The frontend is now hosted on AWS Amplify.
# The S3 bucket and related resources are kept in state for backwards compatibility
# but should be migrated to a separate state file or removed after confirming
# Amplify is working correctly.
#
# To remove these resources:
# 1. Ensure Amplify is fully working
# 2. Run: terraform state rm aws_s3_bucket.website
# 3. Run: terraform state rm aws_s3_bucket_policy.website
# 4. Run: terraform state rm aws_s3_bucket_public_access_block.website
# 5. Run: terraform state rm aws_s3_bucket_website_configuration.website
# 6. Run: terraform state rm aws_cloudfront_origin_access_identity.website
# 7. Run: terraform state rm aws_cloudfront_function.url_rewrite
# 8. Run: terraform state rm data.aws_iam_policy_document.s3_policy
# 9. Then remove this entire section from the file
#
# Note: Do NOT run terraform apply with these resources commented out or
# Terraform will try to destroy them. Remove from state first.
# ==============================================================================

