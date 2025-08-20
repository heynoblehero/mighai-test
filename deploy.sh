#!/bin/bash

# 🚀 Universal SaaS Deployment Script
# Works on any Linux server with one command
# Usage: curl -sSL https://raw.githubusercontent.com/user/repo/main/deploy.sh | bash -s -- --domain=example.com --email=admin@example.com

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
DOMAIN=""
EMAIL=""
DB_TYPE="sqlite"
SSL_TYPE="letsencrypt"
PORT=3000
INSTALL_DOCKER=true
UPDATE_SYSTEM=true
CREATE_USER=true

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --domain=*)
            DOMAIN="${1#*=}"
            shift
            ;;
        --email=*)
            EMAIL="${1#*=}"
            shift
            ;;
        --db=*)
            DB_TYPE="${1#*=}"
            shift
            ;;
        --ssl=*)
            SSL_TYPE="${1#*=}"
            shift
            ;;
        --port=*)
            PORT="${1#*=}"
            shift
            ;;
        --no-docker)
            INSTALL_DOCKER=false
            shift
            ;;
        --no-update)
            UPDATE_SYSTEM=false
            shift
            ;;
        --no-user)
            CREATE_USER=false
            shift
            ;;
        -h|--help)
            echo "🚀 Universal SaaS Deployment Script"
            echo ""
            echo "Usage Examples:"
            echo "  # Domain deployment (with SSL):"
            echo "  $0 --domain=example.com --email=admin@example.com"
            echo ""
            echo "  # IP-only deployment (no domain required):"
            echo "  $0"
            echo ""
            echo "Options:"
            echo "  --domain=DOMAIN    Your domain name (optional - uses server IP if omitted)"
            echo "  --email=EMAIL      Admin email for SSL certificates (required for domains)"
            echo "  --db=TYPE          Database type: sqlite (default) | postgresql"
            echo "  --ssl=TYPE         SSL type: letsencrypt (default) | self-signed"
            echo "  --port=PORT        Application port (default: 3000)"
            echo "  --no-docker        Skip Docker installation"
            echo "  --no-update        Skip system updates"
            echo "  --no-user          Skip creating deploy user"
            echo "  -h, --help         Show this help message"
            echo ""
            echo "💡 For testing without a domain, just run: curl -sSL url/deploy.sh | sudo bash"
            echo ""
            exit 0
            ;;
        *)
            echo "❌ Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Get server IP for IP-only deployments
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || echo "localhost")

# Validation - make domain optional
if [[ -z "$DOMAIN" ]]; then
    echo -e "${YELLOW}⚠️  No domain provided. Using IP-only deployment: $SERVER_IP${NC}"
    DOMAIN="$SERVER_IP"
    DOMAIN_MODE="ip"
else
    DOMAIN_MODE="domain"
fi

if [[ -z "$EMAIL" && "$DOMAIN_MODE" == "domain" ]]; then
    echo -e "${RED}❌ Error: Email is required for domain deployments (SSL certificates)${NC}"
    echo -e "${YELLOW}💡 For IP-only deployment, skip --email parameter${NC}"
    exit 1
fi

# Set default email for IP deployments
if [[ -z "$EMAIL" ]]; then
    EMAIL="admin@$DOMAIN"
fi

# Header
echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    🚀 SaaS Auto-Deploy                       ║"
echo "║              Universal One-Command Deployment                 ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo -e "${GREEN}🌐 Domain: ${DOMAIN}${NC}"
echo -e "${GREEN}📧 Email: ${EMAIL}${NC}"
echo -e "${GREEN}🗄️  Database: ${DB_TYPE}${NC}"
echo -e "${GREEN}🔒 SSL: ${SSL_TYPE}${NC}"
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}❌ This script must be run as root or with sudo${NC}"
   echo "   Try: sudo $0 $@"
   exit 1
fi

# Detect OS
if [[ -f /etc/os-release ]]; then
    . /etc/os-release
    OS=$ID
    VERSION=$VERSION_ID
else
    echo -e "${RED}❌ Cannot detect operating system${NC}"
    exit 1
fi

echo -e "${BLUE}🔍 Detected OS: $OS $VERSION${NC}"

# Update system
if [[ "$UPDATE_SYSTEM" == "true" ]]; then
    echo -e "${BLUE}📦 Updating system packages...${NC}"
    case $OS in
        ubuntu|debian)
            apt-get update && apt-get upgrade -y
            apt-get install -y curl wget gnupg2 software-properties-common apt-transport-https ca-certificates lsb-release
            ;;
        centos|rhel|rocky|almalinux)
            yum update -y
            yum install -y curl wget gnupg2 yum-utils
            ;;
        fedora)
            dnf update -y
            dnf install -y curl wget gnupg2
            ;;
        *)
            echo -e "${YELLOW}⚠️  Unknown OS, skipping system update${NC}"
            ;;
    esac
fi

# Install Docker
if [[ "$INSTALL_DOCKER" == "true" ]]; then
    if ! command -v docker &> /dev/null; then
        echo -e "${BLUE}🐳 Installing Docker...${NC}"
        curl -fsSL https://get.docker.com | sh
        systemctl enable docker
        systemctl start docker
        
        # Install Docker Compose
        curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose
        ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
    else
        echo -e "${GREEN}✅ Docker already installed${NC}"
    fi
fi

# Create deployment user
if [[ "$CREATE_USER" == "true" ]]; then
    if ! id "deploy" &>/dev/null; then
        echo -e "${BLUE}👤 Creating deployment user...${NC}"
        useradd -m -s /bin/bash deploy
        usermod -aG docker deploy
        mkdir -p /home/deploy/.ssh
        chmod 700 /home/deploy/.ssh
        chown -R deploy:deploy /home/deploy
    else
        echo -e "${GREEN}✅ Deploy user already exists${NC}"
    fi
fi

# Setup firewall
echo -e "${BLUE}🔥 Configuring firewall...${NC}"
if command -v ufw &> /dev/null; then
    ufw --force enable
    ufw allow ssh
    ufw allow 80/tcp
    ufw allow 443/tcp
elif command -v firewall-cmd &> /dev/null; then
    systemctl enable firewalld
    systemctl start firewalld
    firewall-cmd --permanent --add-service=ssh
    firewall-cmd --permanent --add-service=http
    firewall-cmd --permanent --add-service=https
    firewall-cmd --reload
fi

# Create application directory
APP_DIR="/opt/saas-app"
echo -e "${BLUE}📁 Creating application directory: $APP_DIR${NC}"
mkdir -p $APP_DIR/{data,uploads,logs,ssl}
chown -R deploy:deploy $APP_DIR

# Generate environment file
echo -e "${BLUE}⚙️  Generating environment configuration...${NC}"
cat > $APP_DIR/.env << EOF
# Production Environment Configuration
NODE_ENV=production
PORT=$PORT
DOMAIN=$DOMAIN
ADMIN_EMAIL=$EMAIL

# Security
SESSION_SECRET=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(openssl rand -hex 32)

# Database - Use the hardcoded path the app expects
DATABASE_URL=./site_builder.db

# Optional API Keys (set these manually)
OPENAI_API_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET=

# Email (optional)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=

# Redis
REDIS_URL=redis://redis:6379
EOF

# Download and extract application source code
echo -e "${BLUE}📥 Downloading application source code...${NC}"
cd $APP_DIR
curl -sL https://github.com/heynoblehero/mighai-test/archive/refs/heads/main.tar.gz | tar xz --strip-components=1

# Create docker-compose.yml based on deployment mode
echo -e "${BLUE}🐳 Creating Docker Compose configuration...${NC}"
if [[ "$DOMAIN_MODE" == "ip" ]]; then
    # IP-only deployment - no SSL/certbot
    cat > docker-compose.yml << EOF
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.prod
    container_name: saas-app
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DOMAIN=$DOMAIN
      - ADMIN_EMAIL=$EMAIL
      - DATABASE_URL=./site_builder.db
      - SESSION_SECRET=$SESSION_SECRET
      - ENCRYPTION_KEY=$ENCRYPTION_KEY
    volumes:
      - ./data:/app/data:rw
      - ./uploads:/app/uploads:rw
      - ./logs:/app/logs:rw
    networks:
      - saas-network
    depends_on:
      - redis
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  nginx:
    image: nginx:alpine
    container_name: saas-nginx
    restart: unless-stopped
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./logs/nginx:/var/log/nginx:rw
    networks:
      - saas-network
    depends_on:
      - app

  redis:
    image: redis:alpine
    container_name: saas-redis
    restart: unless-stopped
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    networks:
      - saas-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3

volumes:
  redis_data:
    driver: local

networks:
  saas-network:
    driver: bridge
EOF
else
    # Domain deployment - with SSL
    export DOMAIN EMAIL
    envsubst '$DOMAIN $EMAIL' < docker-compose.prod.yml > docker-compose.yml
fi

# Create nginx configuration based on deployment mode
echo -e "${BLUE}🌐 Creating web server configuration...${NC}"
if [[ "$DOMAIN_MODE" == "ip" ]]; then
    # Simple HTTP-only nginx for IP access
    cat > nginx.conf << EOF
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    log_format main '\$remote_addr - \$remote_user [\$time_local] "\$request" '
                    '\$status \$body_bytes_sent "\$http_referer" '
                    '"\$http_user_agent" "\$http_x_forwarded_for"';
    access_log /var/log/nginx/access.log main;
    
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 100M;
    
    gzip on;
    gzip_vary on;
    gzip_min_length 1000;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;
    
    upstream app {
        server app:3000;
        keepalive 32;
    }
    
    server {
        listen 80;
        server_name _;
        
        # Health check endpoint
        location /health {
            access_log off;
            return 200 "OK\n";
            add_header Content-Type text/plain;
        }
        
        # Static files caching
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)\$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            proxy_pass http://app;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }
        
        # Everything else to the app
        location / {
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
            proxy_cache_bypass \$http_upgrade;
            proxy_read_timeout 300s;
            proxy_connect_timeout 75s;
        }
    }
}
EOF
else
    # Domain deployment with SSL
    envsubst '$DOMAIN' < nginx.prod.conf > nginx.conf
fi

# Create startup script
cat > $APP_DIR/start.sh << 'EOF'
#!/bin/bash
set -e

echo "🚀 Starting SaaS Application..."
echo "🌐 Domain: $DOMAIN"
echo "📧 Email: $ADMIN_EMAIL"

cd /opt/saas-app

# Load environment (skip comments and empty lines)
set -a
source .env
set +a

# Start services with force rebuild
docker-compose down --remove-orphans 2>/dev/null || true
docker-compose build --no-cache
docker-compose up -d

echo "✅ Application started successfully!"
echo "🌐 Your app will be available at: https://$DOMAIN"
echo ""
echo "📋 Next steps:"
echo "   1. Point your domain DNS to this server's IP"
echo "   2. Wait for SSL certificate generation (2-5 minutes)"
echo "   3. Configure your API keys in: /opt/saas-app/.env"
echo "   4. Restart with: sudo systemctl restart saas-app"
EOF

chmod +x $APP_DIR/start.sh
chown deploy:deploy $APP_DIR/start.sh

# Create systemd service
echo -e "${BLUE}🔧 Creating systemd service...${NC}"
cat > /etc/systemd/system/saas-app.service << EOF
[Unit]
Description=SaaS Application
Requires=docker.service
After=docker.service
StartLimitIntervalSec=0

[Service]
Type=oneshot
RemainAfterExit=yes
User=deploy
Group=deploy
WorkingDirectory=/opt/saas-app
Environment=HOME=/home/deploy
ExecStart=/opt/saas-app/start.sh
ExecStop=/bin/bash -c "cd /opt/saas-app && docker-compose down"
TimeoutStartSec=300
Restart=on-failure
RestartSec=30

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable saas-app.service

# Create comprehensive health check script
cat > /opt/saas-app/health-check.sh << EOF
#!/bin/bash
# Comprehensive health check script

DOMAIN_MODE="$DOMAIN_MODE"
DOMAIN="$DOMAIN"
SERVER_IP="$SERVER_IP"
STATUS_FILE="/opt/saas-app/health.status"
LOG_FILE="/opt/saas-app/logs/health.log"

# Create log directory
mkdir -p /opt/saas-app/logs

# Function to log with timestamp
log() {
    echo "\$(date '+%Y-%m-%d %H:%M:%S'): \$1" | tee -a \$LOG_FILE
}

# Function to check service
check_service() {
    local service_name=\$1
    local container_name=\$2
    
    if docker ps --format "table {{.Names}}" | grep -q "^\$container_name\$"; then
        log "✅ \$service_name container is running"
        return 0
    else
        log "❌ \$service_name container is not running"
        return 1
    fi
}

# Function to check HTTP endpoint
check_endpoint() {
    local url=\$1
    local name=\$2
    
    if curl -f -s --max-time 10 "\$url" > /dev/null 2>&1; then
        log "✅ \$name endpoint is responding"
        return 0
    else
        log "❌ \$name endpoint is not responding"
        return 1
    fi
}

log "🔍 Starting health check..."

# Check Docker containers
CONTAINERS_OK=0
check_service "Application" "saas-app" && ((CONTAINERS_OK++))
check_service "Nginx" "saas-nginx" && ((CONTAINERS_OK++))
check_service "Redis" "saas-redis" && ((CONTAINERS_OK++))

# Check endpoints based on deployment mode
ENDPOINTS_OK=0
if [[ "\$DOMAIN_MODE" == "ip" ]]; then
    # IP-only deployment - check HTTP
    check_endpoint "http://\$SERVER_IP/health" "Nginx health check" && ((ENDPOINTS_OK++))
    check_endpoint "http://localhost:3000/api/health" "App health check" && ((ENDPOINTS_OK++))
    REQUIRED_ENDPOINTS=2
    ACCESS_URL="http://\$SERVER_IP"
else
    # Domain deployment - check both HTTP and HTTPS
    check_endpoint "http://\$DOMAIN/health" "HTTP health check" && ((ENDPOINTS_OK++))
    check_endpoint "https://\$DOMAIN/api/health" "HTTPS App health check" && ((ENDPOINTS_OK++))
    REQUIRED_ENDPOINTS=2
    ACCESS_URL="https://\$DOMAIN"
fi

# Overall health assessment
TOTAL_SCORE=\$((CONTAINERS_OK + ENDPOINTS_OK))
MAX_SCORE=\$((3 + REQUIRED_ENDPOINTS))

if [[ \$TOTAL_SCORE -eq \$MAX_SCORE ]]; then
    STATUS="HEALTHY"
    log "✅ All systems healthy (\$TOTAL_SCORE/\$MAX_SCORE)"
    echo "HEALTHY - \$(date)" > \$STATUS_FILE
    EXIT_CODE=0
elif [[ \$TOTAL_SCORE -ge \$((MAX_SCORE / 2)) ]]; then
    STATUS="DEGRADED" 
    log "⚠️  System partially healthy (\$TOTAL_SCORE/\$MAX_SCORE)"
    echo "DEGRADED - \$(date)" > \$STATUS_FILE
    EXIT_CODE=1
else
    STATUS="UNHEALTHY"
    log "❌ System unhealthy (\$TOTAL_SCORE/\$MAX_SCORE) - Restarting..."
    echo "UNHEALTHY - \$(date)" > \$STATUS_FILE
    systemctl restart saas-app.service
    EXIT_CODE=2
fi

# Display status
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏥 HEALTH CHECK REPORT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Status: \$STATUS (\$TOTAL_SCORE/\$MAX_SCORE)"
echo "🌐 Access URL: \$ACCESS_URL"
echo "📅 Checked: \$(date)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

exit \$EXIT_CODE
EOF

chmod +x /opt/saas-app/health-check.sh

# Add to crontab for deploy user
echo "*/5 * * * * /opt/saas-app/health-check.sh $DOMAIN >> /opt/saas-app/logs/health.log 2>&1" | crontab -u deploy -

# Set proper permissions and ensure data directory exists on host
chown -R deploy:deploy $APP_DIR
mkdir -p $APP_DIR/data $APP_DIR/uploads $APP_DIR/logs

# Clean any existing database files to avoid permission conflicts
echo -e "${BLUE}🧹 Cleaning database directory for fresh start...${NC}"
rm -f $APP_DIR/data/production.db
rm -f $APP_DIR/data/*.json
rm -f $APP_DIR/data/*.md
rm -rf $APP_DIR/data/reserved-pages

# Set more permissive permissions for database directory (SQLite needs write access to directory)
chmod -R 777 $APP_DIR/data $APP_DIR/uploads $APP_DIR/logs
chown -R deploy:deploy $APP_DIR/data $APP_DIR/uploads $APP_DIR/logs

# Start the application
echo -e "${BLUE}🚀 Starting application...${NC}"
sudo -u deploy $APP_DIR/start.sh

# Final instructions
echo -e "${GREEN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                     ✅ DEPLOYMENT COMPLETE!                   ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo -e "${GREEN}🎉 Your SaaS application is now deployed!${NC}"
echo ""

if [[ "$DOMAIN_MODE" == "ip" ]]; then
    echo -e "${BLUE}🌐 ACCESS YOUR APPLICATION:${NC}"
    echo "   http://$SERVER_IP"
    echo ""
    echo -e "${YELLOW}📋 NEXT STEPS (Optional):${NC}"
    echo "   1. 🔧 Edit configuration: /opt/saas-app/.env"
    echo "   2. 🔄 Restart after config changes: sudo systemctl restart saas-app"
    echo "   3. 🌐 Add domain later: Point DNS to $SERVER_IP and redeploy with domain"
else
    echo -e "${YELLOW}📋 NEXT STEPS:${NC}"
    echo "   1. 🌐 Point your domain DNS A record to: $SERVER_IP"
    echo "   2. ⏳ Wait 2-5 minutes for SSL certificate generation"
    echo "   3. 🔧 Edit configuration: /opt/saas-app/.env"
    echo "   4. 🔄 Restart after config changes: sudo systemctl restart saas-app"
    echo ""
    echo -e "${BLUE}🌐 Your application will be available at:${NC}"
    echo "   https://$DOMAIN"
fi

echo ""
echo -e "${BLUE}📊 MANAGEMENT COMMANDS:${NC}"
echo "   Status:     sudo systemctl status saas-app"
echo "   Restart:    sudo systemctl restart saas-app"
echo "   Logs:       sudo journalctl -fu saas-app"
echo "   App logs:   docker logs saas-app"
echo "   Health:     /opt/saas-app/health-check.sh"
echo ""
echo -e "${BLUE}🏥 HEALTH CHECK:${NC}"
echo "   Run health check: /opt/saas-app/health-check.sh"
echo "   View logs: tail -f /opt/saas-app/logs/health.log"
echo "   Auto-check runs every 5 minutes via cron"
echo ""

# Run automatic health check after deployment
echo -e "${BLUE}🏥 Running automatic health check...${NC}"
sleep 10  # Give containers time to start

# Run health check and show results
/opt/saas-app/health-check.sh

# Show final status
echo ""
echo -e "${BLUE}📊 Final System Status:${NC}"
systemctl status saas-app.service --no-pager
echo ""
docker ps