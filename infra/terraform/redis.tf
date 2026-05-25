resource "aws_elasticache_subnet_group" "voice_agent" {
  name       = "flawless-voice-agent-redis"
  subnet_ids = var.private_subnet_ids
}

resource "aws_elasticache_replication_group" "voice_agent" {
  replication_group_id       = "flawless-voice-agent"
  description                = "Redis session store for flawless-voice-agent"
  node_type                  = "cache.t4g.small"
  num_cache_clusters         = 2
  automatic_failover_enabled = true
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  subnet_group_name          = aws_elasticache_subnet_group.voice_agent.name

  tags = {
    Environment = var.environment
    Project     = "flawless-voice-agent"
  }
}

variable "private_subnet_ids" {
  type    = list(string)
  default = []
}
