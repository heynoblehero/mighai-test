#!/bin/bash

# Automated Docker Deployment Script for Digital Ocean
# Usage: ./deploy-docker.sh [droplet-ip]

set -e

DROPLET_IP=${1:-"134.209.71.132"}
SSH_KEY="~/.ssh/mighai_deploy"
DEPLOY_USER="deploy"

echo "🚀 Starting Docker deployment to $DROPLET_IP..."

# Function to run commands on remote server
run_remote() {
    ssh -i $SSH_KEY -o StrictHostKeyChecking=no $DEPLOY_USER@$DROPLET_IP "$1"
}

# Function to copy files to remote server
copy_to_remote() {
    scp -i $SSH_KEY -o StrictHostKeyChecking=no "$1" $DEPLOY_USER@$DROPLET_IP:"$2"
}

echo "📦 Installing Docker and Docker Compose on server..."
run_remote "
    # Update system
    sudo apt-get update
    
    # Install Docker
    sudo apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo \"deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \$(lsb_release -cs) stable\" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io
    
    # Install Docker Compose
    sudo curl -L \"https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-\$(uname -s)-\$(uname -m)\" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    
    # Add user to docker group
    sudo usermod -aG docker $DEPLOY_USER
    
    # Start Docker service
    sudo systemctl start docker
    sudo systemctl enable docker
    
    echo '✅ Docker installation completed'
"

echo "📁 Creating deployment directory..."
run_remote "mkdir -p /home/$DEPLOY_USER/mighai-app"

echo "📤 Uploading application files..."
rsync -avz -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
    --exclude 'node_modules' \
    --exclude '.next' \
    --exclude 'deploy-package' \
    --exclude '.git' \
    ./ $DEPLOY_USER@$DROPLET_IP:/home/$DEPLOY_USER/mighai-app/

echo "🐳 Building and starting Docker containers..."
run_remote "
    cd /home/$DEPLOY_USER/mighai-app
    
    # Stop existing containers
    docker-compose down || true
    
    # Build and start containers
    docker-compose up -d --build
    
    echo '⏳ Waiting for containers to start...'
    sleep 30
    
    # Check container status
    docker-compose ps
    
    echo '✅ Docker deployment completed!'
"

echo "🧪 Testing deployment..."
sleep 10

if curl -f http://$DROPLET_IP >/dev/null 2>&1; then
    echo "✅ Deployment successful! Application is accessible at http://$DROPLET_IP"
else
    echo "❌ Deployment may have issues. Checking logs..."
    run_remote "cd /home/$DEPLOY_USER/mighai-app && docker-compose logs --tail=20"
fi

echo "🎉 Deployment process completed!"
echo "📋 Access your application:"
echo "   🌐 Website: http://$DROPLET_IP"
echo "   🔧 Admin: http://$DROPLET_IP/admin"
echo "   👤 Login: admin@example.com / admin123"