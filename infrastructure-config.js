const crypto = require('crypto');

class InfrastructureConfig {
    constructor(config) {
        this.config = config;
        this.resources = {};
    }

    // Generate infrastructure configuration based on user inputs
    generateInfrastructure() {
        return {
            droplet: this.generateDropletConfig(),
            database: this.generateDatabaseConfig(),
            firewall: this.generateFirewallConfig(),
            loadBalancer: this.generateLoadBalancerConfig(),
            domain: this.generateDomainConfig(),
            monitoring: this.generateMonitoringConfig(),
            backup: this.generateBackupConfig()
        };
    }

    generateDropletConfig() {
        const sshKeys = [];
        if (this.config.sshKeyPath) {
            // SSH key will be uploaded to DO and ID added here
            sshKeys.push('ssh_key_id_placeholder');
        }

        return {
            name: `${this.config.projectName}-app`,
            region: this.config.region,
            size: this.config.dropletSize,
            image: 'ubuntu-22-04-x64',
            ssh_keys: [50034482], // Use the uploaded SSH key ID
            backups: this.config.enableBackups,
            ipv6: true,
            user_data: this.generateCloudInitScript(),
            monitoring: this.config.enableMonitoring,
            tags: [
                this.config.projectName,
                'nextjs-cms',
                'auto-deployed'
            ]
        };
    }

    generateDatabaseConfig() {
        if (this.config.databaseType === 'local') {
            return {
                type: 'local',
                config: {
                    name: this.config.dbName,
                    user: this.config.dbUser,
                    password: this.config.dbPassword,
                    host: 'localhost',
                    port: 5432
                }
            };
        }

        return {
            type: 'managed',
            config: {
                name: `${this.config.projectName}-db`,
                engine: 'pg',
                version: '15',
                size: 'db-s-1vcpu-1gb', // Smallest managed DB
                region: this.config.region,
                num_nodes: 1,
                db_name: this.config.dbName,
                db_user: this.config.dbUser,
                tags: [
                    this.config.projectName,
                    'postgresql',
                    'auto-deployed'
                ]
            }
        };
    }

    generateFirewallConfig() {
        const inboundRules = [
            {
                protocol: 'tcp',
                ports: '22',
                sources: { addresses: ['0.0.0.0/0', '::/0'] }
            },
            {
                protocol: 'tcp', 
                ports: '80',
                sources: { addresses: ['0.0.0.0/0', '::/0'] }
            }
        ];

        if (this.config.enableSSL) {
            inboundRules.push({
                protocol: 'tcp',
                ports: '443', 
                sources: { addresses: ['0.0.0.0/0', '::/0'] }
            });
        }

        return {
            name: `${this.config.projectName}-firewall-${Date.now()}`,
            inbound_rules: inboundRules,
            outbound_rules: [
                {
                    protocol: 'tcp',
                    ports: '1-65535',
                    destinations: { addresses: ['0.0.0.0/0', '::/0'] }
                },
                {
                    protocol: 'udp', 
                    ports: '1-65535',
                    destinations: { addresses: ['0.0.0.0/0', '::/0'] }
                }
            ],
            tags: [this.config.projectName]
        };
    }

    generateLoadBalancerConfig() {
        if (!this.config.enableSSL && !this.config.domain) {
            return null;
        }

        return {
            name: `${this.config.projectName}-lb`,
            algorithm: 'round_robin',
            status: 'new',
            forwarding_rules: [
                {
                    entry_protocol: 'http',
                    entry_port: 80,
                    target_protocol: 'http',
                    target_port: 3000,
                    certificate_id: '',
                    tls_passthrough: false
                }
            ],
            health_check: {
                protocol: 'http',
                port: 3000,
                path: '/health',
                check_interval_seconds: 10,
                response_timeout_seconds: 5,
                healthy_threshold: 3,
                unhealthy_threshold: 3
            },
            sticky_sessions: {
                type: 'cookies',
                cookie_name: 'lb-session',
                cookie_ttl_seconds: 300
            },
            region: this.config.region,
            tags: [this.config.projectName]
        };
    }

    generateDomainConfig() {
        if (!this.config.domain) {
            return null;
        }

        return {
            domain: this.config.domain,
            provider: this.config.domainProvider,
            records: [
                {
                    type: 'A',
                    name: '@',
                    ttl: 1800,
                    data: 'droplet_ip_placeholder'
                },
                {
                    type: 'A', 
                    name: 'www',
                    ttl: 1800,
                    data: 'droplet_ip_placeholder'
                }
            ]
        };
    }

    generateMonitoringConfig() {
        if (!this.config.enableMonitoring) {
            return null;
        }

        return {
            alerts: [
                {
                    type: 'cpu',
                    description: 'High CPU usage',
                    compare: '>',
                    value: 80,
                    window: '5m',
                    entities: ['droplet']
                },
                {
                    type: 'memory',
                    description: 'High memory usage', 
                    compare: '>',
                    value: 85,
                    window: '5m',
                    entities: ['droplet']
                },
                {
                    type: 'disk',
                    description: 'High disk usage',
                    compare: '>',
                    value: 90,
                    window: '5m', 
                    entities: ['droplet']
                }
            ],
            notifications: [
                {
                    type: 'email',
                    address: this.config.adminEmail
                }
            ]
        };
    }

    generateBackupConfig() {
        if (!this.config.enableBackups) {
            return null;
        }

        return {
            droplet_backup: true,
            database_backup: this.config.databaseType === 'managed',
            backup_policy: {
                droplet: {
                    enabled: true,
                    frequency: 'daily',
                    retention: 7
                },
                database: {
                    enabled: this.config.databaseType === 'managed',
                    frequency: 'daily',
                    retention: 7
                }
            }
        };
    }

    generateCloudInitScript() {
        return `#cloud-config
package_update: true
package_upgrade: true

packages:
  - nginx
  - nodejs
  - npm
  - git
  - ufw
  - fail2ban
  - htop
  - curl
  - wget
  - unzip
  - supervisor
  ${this.config.databaseType === 'local' ? '  - postgresql\n  - postgresql-contrib' : ''}

groups:
  - docker

users:
  - default
  - name: deploy
    groups: sudo, docker
    shell: /bin/bash
    sudo: ['ALL=(ALL) NOPASSWD:ALL']

write_files:
  - path: /etc/supervisor/conf.d/nextjs-app.conf
    content: |
      [program:nextjs-app]
      command=npm start
      directory=/var/www/${this.config.projectName}
      autostart=true
      autorestart=true
      stderr_logfile=/var/log/nextjs-app.err.log
      stdout_logfile=/var/log/nextjs-app.out.log
      user=deploy
      environment=NODE_ENV=production

  - path: /etc/nginx/sites-available/${this.config.projectName}
    content: |
      server {
          listen 80;
          server_name ${this.config.domain || '_'};

          location / {
              proxy_pass http://localhost:3000;
              proxy_http_version 1.1;
              proxy_set_header Upgrade $http_upgrade;
              proxy_set_header Connection 'upgrade';
              proxy_set_header Host $host;
              proxy_set_header X-Real-IP $remote_addr;
              proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
              proxy_set_header X-Forwarded-Proto $scheme;
              proxy_cache_bypass $http_upgrade;
          }

          location /health {
              access_log off;
              return 200 "healthy\\n";
              add_header Content-Type text/plain;
          }
      }

  - path: /var/www/${this.config.projectName}/.env
    content: |
      NODE_ENV=production
      PORT=3000
      DATABASE_URL=${this.generateDatabaseUrl()}
      JWT_SECRET=${this.config.jwtSecret}
      JWT_REFRESH_SECRET=${this.config.jwtRefreshSecret}
      SESSION_SECRET=${this.config.sessionSecret}
      ADMIN_EMAIL=${this.config.adminEmail}
      ADMIN_PASSWORD=${this.config.adminPassword}
      BASE_URL=${this.config.domain ? `https://${this.config.domain}` : 'http://droplet_ip_placeholder'}
      ${this.config.smtpHost ? `
      SMTP_HOST=${this.config.smtpHost}
      SMTP_PORT=${this.config.smtpPort}
      SMTP_USER=${this.config.smtpUser}
      SMTP_PASS=${this.config.smtpPassword}
      SMTP_FROM=${this.config.smtpFrom}` : ''}
      ${this.config.lemonSqueezyApiKey ? `
      LEMON_SQUEEZY_API_KEY=${this.config.lemonSqueezyApiKey}
      LEMON_SQUEEZY_STORE_ID=${this.config.lemonSqueezyStoreId}
      LEMON_SQUEEZY_WEBHOOK_SECRET=${this.config.lemonSqueezyWebhookSecret}` : ''}

runcmd:
  # Setup firewall
  - ufw --force enable
  - ufw allow ssh
  - ufw allow 'Nginx Full'
  
  # Setup fail2ban
  - systemctl enable fail2ban
  - systemctl start fail2ban
  
  # Setup nginx
  - ln -sf /etc/nginx/sites-available/${this.config.projectName} /etc/nginx/sites-enabled/
  - rm -f /etc/nginx/sites-enabled/default
  - nginx -t && systemctl restart nginx
  
  # Setup Node.js
  - curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
  - apt-get install -y nodejs
  
  # Create application directory
  - mkdir -p /var/www/${this.config.projectName}
  - chown deploy:deploy /var/www/${this.config.projectName}
  
  ${this.config.databaseType === 'local' ? `
  # Setup PostgreSQL
  - sudo -u postgres createuser ${this.config.dbUser}
  - sudo -u postgres createdb ${this.config.dbName} 
  - sudo -u postgres psql -c "ALTER USER ${this.config.dbUser} WITH PASSWORD '${this.config.dbPassword}';"
  - sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${this.config.dbName} TO ${this.config.dbUser};"` : ''}
  
  # Start supervisor
  - systemctl enable supervisor
  - systemctl start supervisor

final_message: "System setup complete. Ready for application deployment."`;
    }

    generateDatabaseUrl() {
        if (this.config.databaseType === 'local') {
            return `postgresql://${this.config.dbUser}:${this.config.dbPassword}@localhost:5432/${this.config.dbName}`;
        }
        return 'managed_db_connection_string_placeholder';
    }

    // Generate Terraform configuration (alternative to API calls)
    generateTerraformConfig() {
        const infrastructure = this.generateInfrastructure();
        
        return `
terraform {
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
  }
}

variable "do_token" {
  description = "DigitalOcean API token"
  type        = string
}

variable "ssh_key_content" {
  description = "SSH public key content"
  type        = string
  default     = ""
}

provider "digitalocean" {
  token = var.do_token
}

# SSH Key
resource "digitalocean_ssh_key" "default" {
  count      = var.ssh_key_content != "" ? 1 : 0
  name       = "${infrastructure.droplet.name}-key"
  public_key = var.ssh_key_content
}

# Droplet
resource "digitalocean_droplet" "app" {
  image      = "${infrastructure.droplet.image}"
  name       = "${infrastructure.droplet.name}"
  region     = "${infrastructure.droplet.region}"
  size       = "${infrastructure.droplet.size}"
  ssh_keys   = var.ssh_key_content != "" ? [digitalocean_ssh_key.default[0].id] : []
  backups    = ${infrastructure.droplet.backups}
  monitoring = ${infrastructure.droplet.monitoring}
  ipv6       = ${infrastructure.droplet.ipv6}
  user_data  = base64encode(templatefile("cloud-init.yml", {
    project_name = "${this.config.projectName}"
    domain = "${this.config.domain || '_'}"
    db_url = "${this.generateDatabaseUrl()}"
  }))
  
  tags = ${JSON.stringify(infrastructure.droplet.tags)}
}

${infrastructure.database.type === 'managed' ? `
# Managed Database
resource "digitalocean_database_cluster" "postgres" {
  name       = "${infrastructure.database.config.name}"
  engine     = "${infrastructure.database.config.engine}"
  version    = "${infrastructure.database.config.version}"
  size       = "${infrastructure.database.config.size}"
  region     = "${infrastructure.database.config.region}"
  node_count = ${infrastructure.database.config.num_nodes}
  
  tags = ${JSON.stringify(infrastructure.database.config.tags)}
}

resource "digitalocean_database_db" "app_db" {
  cluster_id = digitalocean_database_cluster.postgres.id
  name       = "${infrastructure.database.config.db_name}"
}

resource "digitalocean_database_user" "app_user" {
  cluster_id = digitalocean_database_cluster.postgres.id
  name       = "${infrastructure.database.config.db_user}"
}
` : ''}

# Firewall
resource "digitalocean_firewall" "app" {
  name = "${infrastructure.firewall.name}"
  
  droplet_ids = [digitalocean_droplet.app.id]
  
  ${infrastructure.firewall.inbound_rules.map(rule => `
  inbound_rule {
    protocol         = "${rule.protocol}"
    port_range       = "${rule.ports}"
    source_addresses = ${JSON.stringify(rule.sources.addresses)}
  }`).join('')}
  
  ${infrastructure.firewall.outbound_rules.map(rule => `
  outbound_rule {
    protocol              = "${rule.protocol}"
    port_range            = "${rule.ports}"
    destination_addresses = ${JSON.stringify(rule.destinations.addresses)}
  }`).join('')}
  
  tags = ${JSON.stringify([this.config.projectName])}
}

${this.config.domain ? `
# Domain Records
resource "digitalocean_domain" "app" {
  name = "${this.config.domain}"
}

resource "digitalocean_record" "root" {
  domain = digitalocean_domain.app.name
  type   = "A"
  name   = "@"
  value  = digitalocean_droplet.app.ipv4_address
  ttl    = 1800
}

resource "digitalocean_record" "www" {
  domain = digitalocean_domain.app.name
  type   = "A"
  name   = "www"
  value  = digitalocean_droplet.app.ipv4_address
  ttl    = 1800
}
` : ''}

# Outputs
output "droplet_ip" {
  value = digitalocean_droplet.app.ipv4_address
}

output "droplet_id" {
  value = digitalocean_droplet.app.id
}

${infrastructure.database.type === 'managed' ? `
output "database_connection_string" {
  value = digitalocean_database_cluster.postgres.uri
  sensitive = true
}
` : ''}

${this.config.domain ? `
output "domain" {
  value = digitalocean_domain.app.name
}
` : ''}
`;
    }
}

module.exports = InfrastructureConfig;