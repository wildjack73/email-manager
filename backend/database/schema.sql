-- Email Manager Database Schema
-- PostgreSQL

-- Processed emails tracking
CREATE TABLE IF NOT EXISTS processed_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id VARCHAR(255) UNIQUE NOT NULL,
  from_email VARCHAR(255) NOT NULL,
  subject TEXT,
  classification VARCHAR(20) NOT NULL CHECK (classification IN ('SPAM', 'INUTILE', 'IMPORTANT')),
  claude_reasoning TEXT,
  action_taken VARCHAR(20) NOT NULL CHECK (action_taken IN ('KEPT', 'DELETED')),
  processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_message_id ON processed_emails(message_id);
CREATE INDEX idx_processed_at ON processed_emails(processed_at DESC);
CREATE INDEX idx_classification ON processed_emails(classification);
CREATE INDEX idx_action_taken ON processed_emails(action_taken);

-- Whitelist domains (never delete)
CREATE TABLE IF NOT EXISTS whitelist (
  id SERIAL PRIMARY KEY,
  domain VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_whitelist_domain ON whitelist(LOWER(domain));

-- Banned keywords
CREATE TABLE IF NOT EXISTS keywords (
  id SERIAL PRIMARY KEY,
  keyword VARCHAR(255) NOT NULL,
  case_sensitive BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_keywords_keyword ON keywords(keyword);

-- Users for dashboard authentication
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default protected domains
INSERT INTO whitelist (domain, description) VALUES
  ('impots.gouv.fr', 'Administration fiscale française'),
  ('urssaf.fr', 'URSSAF - Sécurité sociale'),
  ('ameli.fr', 'Assurance maladie'),
  ('service-public.fr', 'Service public français')
ON CONFLICT (domain) DO NOTHING;
