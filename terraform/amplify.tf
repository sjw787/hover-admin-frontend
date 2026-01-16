# AWS Amplify App for Next.js Frontend
# This replaces the S3+CloudFront setup with AWS Amplify hosting

resource "aws_amplify_app" "frontend" {
  name       = "${var.project_name}-${var.environment}"
  repository = var.github_repository

  # GitHub access token for repository access
  access_token = var.github_access_token

  # Build settings for Next.js
  build_spec = <<-EOT
    version: 1
    frontend:
      phases:
        preBuild:
          commands:
            - npm ci
        build:
          commands:
            - npm run build
      artifacts:
        baseDirectory: .next
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
  EOT

  # Environment variables
  environment_variables = {
    NEXT_PUBLIC_API_URL = var.api_url
    _LIVE_UPDATES = jsonencode([{
      pkg     = "next-version"
      type    = "internal"
      version = "latest"
    }])
  }

  # Enable auto branch creation from Git
  enable_auto_branch_creation = false
  enable_branch_auto_build    = true
  enable_branch_auto_deletion = false

  # Platform - WEB_COMPUTE required for SSR
  platform = "WEB_COMPUTE"

  # Custom headers for security
  custom_rule {
    source = "/<*>"
    status = "404"
    target = "/index.html"
  }

  custom_rule {
    source = "</^[^.]+$|\\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json|webp)$)([^.]+$)/>"
    status = "200"
    target = "/index.html"
  }

  tags = {
    Name = "${var.project_name}-${var.environment}"
  }
}

# Main branch deployment
resource "aws_amplify_branch" "main" {
  app_id      = aws_amplify_app.frontend.id
  branch_name = var.github_branch

  framework = "Next.js - SSR"
  stage     = var.environment == "prod" ? "PRODUCTION" : "DEVELOPMENT"

  enable_auto_build           = true
  enable_pull_request_preview = var.environment != "prod"

  environment_variables = {
    NEXT_PUBLIC_API_URL = var.api_url
  }
}

# Custom domain configuration
# NOTE: Amplify will automatically provision an SSL certificate
# The ACM certificate from your personal account cannot be used directly
# Amplify creates its own certificate and validates via DNS
resource "aws_amplify_domain_association" "main" {
  count = var.domain_name != "" ? 1 : 0

  app_id      = aws_amplify_app.frontend.id
  domain_name = var.domain_name

  # Wait for DNS validation
  wait_for_verification = false

  # Subdomain configuration
  sub_domain {
    branch_name = aws_amplify_branch.main.branch_name
    prefix      = var.environment == "prod" ? "" : var.environment
  }

  depends_on = [aws_amplify_branch.main]
}

# IAM role for Amplify service
resource "aws_iam_role" "amplify_role" {
  name = "${var.project_name}-amplify-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "amplify.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-amplify-role"
  }
}

# Attach managed policy for Amplify
resource "aws_iam_role_policy_attachment" "amplify_backend_deployment" {
  role       = aws_iam_role.amplify_role.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess-Amplify"
}

# Custom policy for build process
resource "aws_iam_role_policy" "amplify_custom" {
  name = "${var.project_name}-amplify-custom-${var.environment}"
  role = aws_iam_role.amplify_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# Webhook for manual deployments (optional)
resource "aws_amplify_webhook" "main" {
  count = var.enable_webhook ? 1 : 0

  app_id      = aws_amplify_app.frontend.id
  branch_name = aws_amplify_branch.main.branch_name
  description = "Manual deployment trigger"
}

# Route53 DNS records in personal account
# Create CNAME records to point to Amplify
# Note: You may need to manually add the certificate validation CNAME from Amplify Console

# Main domain CNAME pointing to Amplify
resource "aws_route53_record" "amplify_domain" {
  count = var.domain_name != "" && var.route53_zone_id != "" ? 1 : 0

  provider = aws.personal

  zone_id = var.route53_zone_id
  name    = var.environment == "prod" ? "admin" : "${var.environment}.admin"
  type    = "CNAME"
  ttl     = 300

  # Point to Amplify's default domain
  records = ["${aws_amplify_branch.main.branch_name}.${aws_amplify_app.frontend.default_domain}"]

  depends_on = [aws_amplify_domain_association.main]
}

