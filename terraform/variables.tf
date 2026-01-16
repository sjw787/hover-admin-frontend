variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "hover-admin-frontend"
}

variable "domain_name" {
  description = "Custom domain name (e.g., 'samwylock.com' - will create admin.samwylock.com or dev.admin.samwylock.com)"
  type        = string
  default     = ""
}

variable "acm_certificate_arn" {
  description = "DEPRECATED - Not used. Amplify automatically provisions SSL certificates via ACM."
  type        = string
  default     = ""
}

variable "route53_zone_id" {
  description = "Route53 hosted zone ID for DNS record"
  type        = string
  default     = ""
}

variable "route53_aws_profile" {
  description = "AWS CLI profile name for Route53 (if in different account). Leave empty if same account."
  type        = string
  default     = ""
}

variable "route53_assume_role_arn" {
  description = "IAM role ARN to assume for Route53 access (alternative to profile)"
  type        = string
  default     = ""
}

variable "cloudfront_price_class" {
  description = "CloudFront price class (PriceClass_All, PriceClass_200, PriceClass_100)"
  type        = string
  default     = "PriceClass_100"
}

# ============================================
# AWS Amplify Variables
# ============================================

variable "github_repository" {
  description = "GitHub repository URL (e.g., https://github.com/username/repo)"
  type        = string
}

variable "github_branch" {
  description = "GitHub branch to deploy"
  type        = string
  default     = "main"
}

variable "github_access_token" {
  description = "GitHub personal access token for Amplify to access repository"
  type        = string
  sensitive   = true
}

variable "api_url" {
  description = "Backend API URL for NEXT_PUBLIC_API_URL environment variable"
  type        = string
}

variable "enable_webhook" {
  description = "Enable webhook for manual deployments"
  type        = bool
  default     = false
}


