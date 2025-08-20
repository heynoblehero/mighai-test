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
            echo "Usage: $0 --domain=example.com --email=admin@example.com [options]"
            echo ""
            echo "Required:"
            echo "  --domain=DOMAIN     Your domain name (e.g., myapp.com)"
            echo "  --email=EMAIL       Admin email for SSL certificates"
            echo ""
            echo "Options:"
            echo "  --db=TYPE          Database type: sqlite (default) | postgresql"
            echo "  --ssl=TYPE         SSL type: letsencrypt (default) | self-signed"
            echo "  --port=PORT        Application port (default: 3000)"
            echo "  --no-docker        Skip Docker installation"
            echo "  --no-update        Skip system updates"
            echo "  --no-user          Skip creating deploy user"
            echo "  -h, --help         Show this help message"
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

# Validation
if [[ -z "$DOMAIN" ]]; then
    echo -e "${RED}❌ Error: Domain is required. Use --domain=yourdomain.com${NC}"
    exit 1
fi

if [[ -z "$EMAIL" ]]; then
    echo -e "${RED}❌ Error: Email is required. Use --email=admin@yourdomain.com${NC}"
    exit 1
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

# Database
DATABASE_URL=sqlite:/app/data/production.db

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

# Create docker-compose.yml with environment substitution
echo -e "${BLUE}🐳 Creating Docker Compose configuration...${NC}"
export DOMAIN EMAIL
envsubst '$DOMAIN $EMAIL' < docker-compose.prod.yml > docker-compose.yml

# Create nginx configuration with domain substitution
envsubst '$DOMAIN' < nginx.prod.conf > nginx.conf

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

# Start services
docker-compose down --remove-orphans 2>/dev/null || true
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

# Create health check script
cat > /opt/saas-app/health-check.sh << 'EOF'
#!/bin/bash
# Health check script - runs every 5 minutes via cron

DOMAIN=${1:-localhost}
STATUS_FILE="/opt/saas-app/health.status"

# Check if application is responding
if curl -f -s --max-time 10 "https://$DOMAIN/api/health" > /dev/null; then
    echo "$(date): OK" > $STATUS_FILE
    exit 0
else
    echo "$(date): FAILED - Restarting application..." > $STATUS_FILE
    systemctl restart saas-app.service
    exit 1
fi
EOF

chmod +x /opt/saas-app/health-check.sh

# Add to crontab for deploy user
echo "*/5 * * * * /opt/saas-app/health-check.sh $DOMAIN >> /opt/saas-app/logs/health.log 2>&1" | crontab -u deploy -

# Set proper permissions
chown -R deploy:deploy $APP_DIR

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
echo -e "${YELLOW}📋 NEXT STEPS:${NC}"
echo "   1. 🌐 Point your domain DNS A record to: $(curl -s ifconfig.me)"
echo "   2. ⏳ Wait 2-5 minutes for SSL certificate generation"
echo "   3. 🔧 Edit configuration: /opt/saas-app/.env"
echo "   4. 🔄 Restart after config changes: sudo systemctl restart saas-app"
echo ""
echo -e "${BLUE}📊 MANAGEMENT COMMANDS:${NC}"
echo "   Status:    sudo systemctl status saas-app"
echo "   Restart:   sudo systemctl restart saas-app"
echo "   Logs:      sudo journalctl -fu saas-app"
echo "   App logs:  docker logs saas-app"
echo ""
echo -e "${BLUE}🌐 Your application will be available at:${NC}"
echo "   https://$DOMAIN"
echo ""

# Show final status
sleep 5
systemctl status saas-app.service --no-pager