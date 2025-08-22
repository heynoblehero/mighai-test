#!/bin/bash

# Docker Update Monitor Script
# This script monitors for update signals and handles container restarts
# Usage: ./docker-update-monitor.sh

set -e

# Configuration
APP_DIR="/opt/saas-app"
SIGNAL_FILE="$APP_DIR/data/restart-required"
LOG_FILE="$APP_DIR/logs/update-monitor.log"
CHECK_INTERVAL=10  # seconds

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S'): $1" | tee -a "$LOG_FILE"
}

# Function to restart Docker containers
restart_containers() {
    local reason="$1"
    log "🔄 Restarting containers due to: $reason"
    
    cd "$APP_DIR" || {
        log "❌ Failed to change to app directory: $APP_DIR"
        return 1
    }
    
    # Try different compose files
    if [ -f "docker-compose.prod.yml" ]; then
        log "📦 Using docker-compose.prod.yml"
        docker-compose -f docker-compose.prod.yml down --remove-orphans
        docker-compose -f docker-compose.prod.yml up -d --build
        log "✅ Containers restarted via docker-compose.prod.yml"
    elif [ -f "docker-compose.yml" ]; then
        log "📦 Using docker-compose.yml"
        docker-compose down --remove-orphans
        docker-compose up -d --build
        log "✅ Containers restarted via docker-compose.yml"
    else
        log "❌ No docker-compose file found"
        return 1
    fi
    
    # Wait for services to be ready
    log "⏳ Waiting for services to start..."
    sleep 30
    
    # Health check
    if curl -f -s --max-time 10 "http://localhost/health" > /dev/null 2>&1; then
        log "✅ Health check passed"
        return 0
    else
        log "⚠️  Health check failed, but containers are running"
        return 0
    fi
}

# Function to process restart signal
process_restart_signal() {
    if [ ! -f "$SIGNAL_FILE" ]; then
        return 0
    fi
    
    log "🔔 Restart signal detected"
    
    # Read signal file
    local signal_data=$(cat "$SIGNAL_FILE" 2>/dev/null || echo '{}')
    local reason=$(echo "$signal_data" | jq -r '.reason // "unknown"' 2>/dev/null || echo "unknown")
    local timestamp=$(echo "$signal_data" | jq -r '.timestamp // "unknown"' 2>/dev/null || echo "unknown")
    
    log "📋 Signal details: reason=$reason, timestamp=$timestamp"
    
    # Remove signal file first to prevent loops
    rm -f "$SIGNAL_FILE"
    
    # Perform restart
    if restart_containers "$reason"; then
        log "🎉 Restart completed successfully"
        
        # Log restart to app data
        echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\",\"reason\":\"$reason\",\"status\":\"success\"}" >> "$APP_DIR/data/restart-log.json"
    else
        log "❌ Restart failed"
        
        # Log failure
        echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\",\"reason\":\"$reason\",\"status\":\"failed\"}" >> "$APP_DIR/data/restart-log.json"
    fi
}

# Main monitoring loop
main() {
    log "🚀 Docker Update Monitor started"
    log "📂 Monitoring directory: $APP_DIR"
    log "📄 Signal file: $SIGNAL_FILE"
    log "⏰ Check interval: ${CHECK_INTERVAL}s"
    
    # Ensure directories exist
    mkdir -p "$APP_DIR/data" "$APP_DIR/logs"
    
    # Main loop
    while true; do
        process_restart_signal
        sleep "$CHECK_INTERVAL"
    done
}

# Handle script termination
cleanup() {
    log "🛑 Update monitor stopping..."
    exit 0
}

# Set up signal handlers
trap cleanup SIGTERM SIGINT

# Check dependencies
if ! command -v docker-compose &> /dev/null; then
    log "❌ docker-compose not found"
    exit 1
fi

if ! command -v curl &> /dev/null; then
    log "❌ curl not found"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    log "⚠️  jq not found, signal parsing will be limited"
fi

# Start monitoring
main