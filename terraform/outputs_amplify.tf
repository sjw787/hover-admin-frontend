# Amplify Outputs

output "amplify_app_id" {
  description = "Amplify App ID"
  value       = aws_amplify_app.frontend.id
}

output "amplify_app_arn" {
  description = "Amplify App ARN"
  value       = aws_amplify_app.frontend.arn
}

output "amplify_default_domain" {
  description = "Default Amplify domain"
  value       = "https://${aws_amplify_branch.main.branch_name}.${aws_amplify_app.frontend.default_domain}"
}

output "amplify_custom_domain" {
  description = "Custom domain URL (if configured)"
  value       = var.domain_name != "" ? "https://${var.environment == "prod" ? "" : "${var.environment}."}${var.domain_name}" : null
}

output "amplify_webhook_url" {
  description = "Webhook URL for manual deployments"
  value       = var.enable_webhook ? aws_amplify_webhook.main[0].url : null
  sensitive   = true
}

output "amplify_console_url" {
  description = "AWS Amplify Console URL"
  value       = "https://console.aws.amazon.com/amplify/home?region=${var.aws_region}#/${aws_amplify_app.frontend.id}"
}

output "dns_instructions" {
  description = "DNS configuration instructions"
  value = var.domain_name != "" ? format(
    "Custom Domain Configuration:\n============================\nDomain: %s\n\nIf DNS is not automatically configured, add the following CNAME record in Route53:\n\nName: %s\nType: CNAME\nValue: [From Amplify Console - Domain management]\n\nSSL Certificate will be automatically provisioned by Amplify.",
    var.environment == "prod" ? var.domain_name : "${var.environment}.${var.domain_name}",
    var.environment == "prod" ? "@" : var.environment
  ) : "Using default Amplify domain - no DNS configuration needed"
}

