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
  region = var.aws_region

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

# S3 bucket for website hosting
resource "aws_s3_bucket" "website" {
  bucket = "${var.project_name}"

  tags = {
    Name = "Hover Admin Frontend Website"
  }
}

# S3 bucket public access block
resource "aws_s3_bucket_public_access_block" "website" {
  bucket = aws_s3_bucket.website.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3 bucket website configuration
resource "aws_s3_bucket_website_configuration" "website" {
  bucket = aws_s3_bucket.website.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "404.html"
  }
}

# CloudFront Origin Access Identity (created in personal account)
resource "aws_cloudfront_origin_access_identity" "website" {
  # Use personal account provider
  provider = aws.personal

  comment = "OAI for ${var.project_name}-${var.environment}"
}

# S3 bucket policy to allow CloudFront access
resource "aws_s3_bucket_policy" "website" {
  bucket = aws_s3_bucket.website.id
  policy = data.aws_iam_policy_document.s3_policy.json

  # Ensure OAI is created in personal account first
  depends_on = [aws_cloudfront_origin_access_identity.website]
}

data "aws_iam_policy_document" "s3_policy" {
  statement {
    sid = "AllowCloudFrontAccess"

    principals {
      type = "AWS"
      # Use the CloudFront canonical user ID format instead of iam_arn
      # This is constructed from the OAI ID and works cross-account
      identifiers = ["arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity ${aws_cloudfront_origin_access_identity.website.id}"]
    }

    actions = [
      "s3:GetObject"
    ]

    resources = [
      "${aws_s3_bucket.website.arn}/*"
    ]
  }
}

# CloudFront distribution (created in personal account)
resource "aws_cloudfront_distribution" "website" {
  # Use personal account provider (where CloudFront is available)
  provider = aws.personal

  enabled             = true
  is_ipv6_enabled     = true
  comment             = "Hover Admin Frontend - ${var.environment}"
  default_root_object = "index.html"
  price_class         = var.cloudfront_price_class
  aliases             = var.domain_name != "" ? [var.domain_name] : []

  origin {
    domain_name = aws_s3_bucket.website.bucket_regional_domain_name
    origin_id   = "S3-${aws_s3_bucket.website.id}"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.website.cloudfront_access_identity_path
    }
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.website.id}"

    # Add CloudFront Function for URL rewriting
    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.url_rewrite.arn
    }

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
    compress               = true
  }

  # Custom error responses for Next.js static export
  # Next.js static export creates .html files for each route
  # We need to handle 403/404 by checking if the HTML file exists
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/404.html"
    error_caching_min_ttl = 0
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    # Use ACM certificate if domain is provided
    acm_certificate_arn      = var.acm_certificate_arn != "" ? var.acm_certificate_arn : null
    ssl_support_method       = var.acm_certificate_arn != "" ? "sni-only" : null
    minimum_protocol_version = var.acm_certificate_arn != "" ? "TLSv1.2_2021" : null

    # Use default CloudFront certificate if no domain
    cloudfront_default_certificate = var.acm_certificate_arn == "" ? true : false
  }

  tags = {
    Name = "Hover Admin Frontend CDN"
  }
}

# CloudFront Function to add .html extension for Next.js static export
resource "aws_cloudfront_function" "url_rewrite" {
  provider = aws.personal

  name    = "${var.environment}-url-rewrite"
  runtime = "cloudfront-js-1.0"
  comment = "Add .html extension for Next.js static export"
  publish = true
  code    = <<-EOT
function handler(event) {
    var request = event.request;
    var uri = request.uri;

    // Check if the URI already has a file extension
    if (!uri.includes('.')) {
        // Add .html extension
        request.uri = uri + '.html';
    } else if (uri.endsWith('/')) {
        // If it ends with /, add index.html
        request.uri = uri + 'index.html';
    }

    return request;
}
EOT
}

# Route53 record - Same account (default provider)
resource "aws_route53_record" "website" {
  count = var.domain_name != "" && var.route53_zone_id != "" && var.route53_aws_profile == "" ? 1 : 0

  zone_id = var.route53_zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.website.domain_name
    zone_id                = aws_cloudfront_distribution.website.hosted_zone_id
    evaluate_target_health = false
  }
}

# Route53 record - Cross-account (personal account provider)
resource "aws_route53_record" "website_cross_account" {
  count = var.domain_name != "" && var.route53_zone_id != "" && var.route53_aws_profile != "" ? 1 : 0

  provider = aws.personal

  zone_id = var.route53_zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.website.domain_name
    zone_id                = aws_cloudfront_distribution.website.hosted_zone_id
    evaluate_target_health = false
  }
}

