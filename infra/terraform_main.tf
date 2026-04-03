# ═══════════════════════════════════════════════════════════════
# DIALBEE — AWS MULTI-REGION TERRAFORM
# Primary: eu-west-1 (Ireland) — covers Europe + Africa latency
# Secondary: af-south-1 (Cape Town) — Africa < 50ms
# ═══════════════════════════════════════════════════════════════

terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  backend "s3" {
    bucket         = "dialbee-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "eu-west-1"
    encrypt        = true
    dynamodb_table = "dialbee-tf-lock"
  }
}

# ── Providers ─────────────────────────────────────────────────
provider "aws" {
  alias  = "eu"
  region = "eu-west-1"
}

provider "aws" {
  alias  = "af"
  region = "af-south-1"
}

# ── Variables ─────────────────────────────────────────────────
variable "environment" {
  default = "production"
}

variable "app_name" {
  default = "dialbee"
}

variable "db_password" {
  sensitive = true
}

variable "redis_password" {
  sensitive = true
}

# ── VPC (EU Primary) ──────────────────────────────────────────
module "vpc_eu" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  providers = { aws = aws.eu }

  name = "${var.app_name}-vpc-eu"
  cidr = "10.0.0.0/16"

  azs              = ["eu-west-1a", "eu-west-1b", "eu-west-1c"]
  private_subnets  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets   = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway   = true
  single_nat_gateway   = false  # One per AZ for HA
  enable_dns_hostnames = true

  tags = { Environment = var.environment, Project = var.app_name }
}

# ── RDS Aurora PostgreSQL (EU) ────────────────────────────────
resource "aws_rds_cluster" "primary" {
  provider = aws.eu

  cluster_identifier      = "${var.app_name}-aurora-eu"
  engine                  = "aurora-postgresql"
  engine_version          = "16.1"
  database_name           = "dialbee"
  master_username         = "dialbee"
  master_password         = var.db_password
  backup_retention_period = 7
  preferred_backup_window = "03:00-04:00"
  deletion_protection     = true
  storage_encrypted       = true

  vpc_security_group_ids = [aws_security_group.rds_eu.id]
  db_subnet_group_name   = aws_db_subnet_group.eu.name

  enable_global_write_forwarding = true  # For global cluster

  tags = { Environment = var.environment }
}

resource "aws_rds_cluster_instance" "primary_instances" {
  provider = aws.eu
  count    = 2  # 1 writer + 1 reader

  identifier         = "${var.app_name}-aurora-eu-${count.index}"
  cluster_identifier = aws_rds_cluster.primary.id
  instance_class     = "db.r7g.large"
  engine             = aws_rds_cluster.primary.engine

  performance_insights_enabled = true
  monitoring_interval          = 60
}

# ── Global Aurora Cluster (EU + AF replication) ───────────────
resource "aws_rds_global_cluster" "global" {
  provider = aws.eu

  global_cluster_identifier = "${var.app_name}-global-db"
  engine                    = "aurora-postgresql"
  engine_version            = "16.1"
  source_db_cluster_identifier = aws_rds_cluster.primary.arn
}

# Africa read replica
resource "aws_rds_cluster" "replica_af" {
  provider = aws.af

  cluster_identifier   = "${var.app_name}-aurora-af"
  engine               = "aurora-postgresql"
  global_cluster_identifier = aws_rds_global_cluster.global.id

  vpc_security_group_ids = [aws_security_group.rds_af.id]
  db_subnet_group_name   = aws_db_subnet_group.af.name

  deletion_protection = true
  storage_encrypted   = true

  lifecycle {
    ignore_changes = [replication_source_identifier, master_username, master_password, database_name]
  }
}

# ── ElastiCache Redis (EU) ────────────────────────────────────
resource "aws_elasticache_replication_group" "redis_eu" {
  provider = aws.eu

  replication_group_id       = "${var.app_name}-redis-eu"
  description                = "Dialbee Redis EU"
  node_type                  = "cache.r7g.large"
  port                       = 6379
  parameter_group_name       = "default.redis7"
  num_cache_clusters         = 2
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = var.redis_password
  automatic_failover_enabled = true

  subnet_group_name  = aws_elasticache_subnet_group.eu.name
  security_group_ids = [aws_security_group.redis_eu.id]

  tags = { Environment = var.environment }
}

# ── ECS Cluster (EU) ──────────────────────────────────────────
resource "aws_ecs_cluster" "eu" {
  provider = aws.eu
  name     = "${var.app_name}-cluster-eu"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# ── ECS Service: API ──────────────────────────────────────────
resource "aws_ecs_service" "api" {
  provider = aws.eu

  name            = "${var.app_name}-api"
  cluster         = aws_ecs_cluster.eu.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = module.vpc_eu.private_subnets
    security_groups  = [aws_security_group.api_eu.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 3001
  }

  # Auto-scaling
  lifecycle {
    ignore_changes = [desired_count]
  }
}

# ── Auto-scaling (2-10 tasks) ─────────────────────────────────
resource "aws_appautoscaling_target" "api" {
  provider           = aws.eu
  max_capacity       = 10
  min_capacity       = 2
  resource_id        = "service/${aws_ecs_cluster.eu.name}/${aws_ecs_service.api.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "api_cpu" {
  provider           = aws.eu
  name               = "${var.app_name}-api-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.api.resource_id
  scalable_dimension = aws_appautoscaling_target.api.scalable_dimension
  service_namespace  = aws_appautoscaling_target.api.service_namespace

  target_tracking_scaling_policy_configuration {
    target_value = 70.0  # Scale when CPU > 70%
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# ── ALB (EU) ──────────────────────────────────────────────────
resource "aws_lb" "eu" {
  provider           = aws.eu
  name               = "${var.app_name}-alb-eu"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_eu.id]
  subnets            = module.vpc_eu.public_subnets

  access_logs {
    bucket  = aws_s3_bucket.alb_logs.bucket
    prefix  = "eu-alb"
    enabled = true
  }
}

# ── CloudFront Distribution ───────────────────────────────────
resource "aws_cloudfront_distribution" "main" {
  provider = aws.eu
  enabled  = true
  comment  = "Dialbee CDN — Africa + Europe"

  aliases = ["dialbee.com", "www.dialbee.com", "api.dialbee.com"]

  # S3 origin for static files
  origin {
    domain_name = aws_s3_bucket.media.bucket_regional_domain_name
    origin_id   = "s3-media"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.media.cloudfront_access_identity_path
    }
  }

  # API origin
  origin {
    domain_name = aws_lb.eu.dns_name
    origin_id   = "api-eu"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Media: long cache (1 year)
  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "s3-media"
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }

    min_ttl     = 0
    default_ttl = 86400     # 1 day
    max_ttl     = 31536000  # 1 year
    compress    = true
  }

  # API: no cache
  ordered_cache_behavior {
    path_pattern     = "/api/*"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "api-eu"
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Content-Type", "X-Session-Id"]
      cookies { forward = "all" }
    }

    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0
  }

  # Search results: 3-minute cache
  ordered_cache_behavior {
    path_pattern     = "/api/v1/search*"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "api-eu"
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = true
      cookies { forward = "none" }
    }

    min_ttl     = 0
    default_ttl = 180  # 3 minutes
    max_ttl     = 300
    compress    = true
  }

  # Africa edge locations
  price_class = "PriceClass_All"

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.main.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  # WAF
  web_acl_id = aws_wafv2_web_acl.main.arn

  tags = { Environment = var.environment }
}

# ── WAF Rules ─────────────────────────────────────────────────
resource "aws_wafv2_web_acl" "main" {
  provider = aws.eu
  name     = "${var.app_name}-waf"
  scope    = "CLOUDFRONT"

  default_action { allow {} }

  # AWS Managed: SQL injection protection
  rule {
    name     = "AWSManagedRulesSQLiRuleSet"
    priority = 1
    override_action { none {} }
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "SQLi"
      sampled_requests_enabled   = true
    }
  }

  # Rate limit: 100 req/5min per IP
  rule {
    name     = "RateLimit"
    priority = 2
    action   { block {} }
    statement {
      rate_based_statement {
        limit              = 500
        aggregate_key_type = "IP"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimit"
      sampled_requests_enabled   = true
    }
  }

  # Lead submission: stricter rate limit
  rule {
    name     = "LeadRateLimit"
    priority = 3
    action   { block {} }
    statement {
      rate_based_statement {
        limit              = 50
        aggregate_key_type = "IP"
        scope_down_statement {
          byte_match_statement {
            search_string = "/api/v1/leads"
            field_to_match { uri_path {} }
            text_transformations { priority = 0; type = "LOWERCASE" }
            positional_constraint = "CONTAINS"
          }
        }
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "LeadRateLimit"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "DialbeeWAF"
    sampled_requests_enabled   = true
  }
}

# ── S3 Buckets ────────────────────────────────────────────────
resource "aws_s3_bucket" "media" {
  provider = aws.eu
  bucket   = "${var.app_name}-media-production"
  tags     = { Environment = var.environment }
}

resource "aws_s3_bucket_versioning" "media" {
  provider = aws.eu
  bucket   = aws_s3_bucket.media.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_lifecycle_configuration" "media" {
  provider = aws.eu
  bucket   = aws_s3_bucket.media.id

  rule {
    id     = "move-to-ia"
    status = "Enabled"
    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    }
    transition {
      days          = 365
      storage_class = "GLACIER"
    }
  }
}

# ── Secrets Manager ───────────────────────────────────────────
resource "aws_secretsmanager_secret" "app_secrets" {
  provider = aws.eu
  name     = "${var.app_name}/production/app"
  description = "Dialbee application secrets"

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_secretsmanager_secret_version" "app_secrets" {
  provider  = aws.eu
  secret_id = aws_secretsmanager_secret.app_secrets.id
  secret_string = jsonencode({
    jwt_access_secret  = "REPLACE_ME"
    jwt_refresh_secret = "REPLACE_ME"
    stripe_secret_key  = "REPLACE_ME"
    paystack_secret_key = "REPLACE_ME"
    whatsapp_api_key   = "REPLACE_ME"
  })
}

# ── CloudWatch Alarms ─────────────────────────────────────────
resource "aws_cloudwatch_metric_alarm" "api_high_error_rate" {
  provider            = aws.eu
  alarm_name          = "${var.app_name}-high-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = "60"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "API error rate > 10 per minute"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    LoadBalancer = aws_lb.eu.arn_suffix
  }
}

resource "aws_sns_topic" "alerts" {
  provider = aws.eu
  name     = "${var.app_name}-production-alerts"
}

# ── Outputs ───────────────────────────────────────────────────
output "api_url" {
  value = "https://${aws_cloudfront_distribution.main.domain_name}"
}

output "rds_endpoint" {
  value     = aws_rds_cluster.primary.endpoint
  sensitive = true
}

output "redis_endpoint" {
  value     = aws_elasticache_replication_group.redis_eu.primary_endpoint_address
  sensitive = true
}

output "s3_media_bucket" {
  value = aws_s3_bucket.media.bucket
}

output "cloudfront_domain" {
  value = aws_cloudfront_distribution.main.domain_name
}
