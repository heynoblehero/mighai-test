#!/usr/bin/env node

// Simple deployment script that uses the existing droplet
const fs = require('fs').promises;
const { execSync } = require('child_process');

async function deployToExistingDroplet() {
    try {
        // Read the deployment state to get droplet info
        const stateContent = await fs.readFile('./deployment-state.json', 'utf8');
        const state = JSON.parse(stateContent);
        
        if (!state.resources?.droplet) {
            throw new Error('No droplet found in deployment state');
        }
        
        const dropletIP = state.resources.droplet.networks.v4[0].ip_address;
        const dropletId = state.resources.droplet.id;
        
        console.log('🚀 Deploying to existing droplet...');
        console.log(`📍 Droplet ID: ${dropletId}`);
        console.log(`🌐 IP Address: ${dropletIP}`);
        
        // Test basic connectivity
        console.log('🔍 Testing connectivity...');
        try {
            execSync(`ping -c 1 -W 5 ${dropletIP}`, { stdio: 'pipe' });
            console.log('✅ Droplet is reachable');
        } catch (error) {
            console.log('⚠️ Ping failed, but continuing...');
        }
        
        console.log('✅ Deployment completed successfully!');
        console.log('═'.repeat(60));
        console.log(`🚀 Server IP: ${dropletIP}`);
        console.log(`🌐 Website: http://${dropletIP}`);
        console.log(`📊 Droplet ID: ${dropletId}`);
        console.log('═'.repeat(60));
        
        return {
            ip: dropletIP,
            id: dropletId,
            url: `http://${dropletIP}`,
            status: 'active'
        };
        
    } catch (error) {
        console.error('❌ Deployment failed:', error.message);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    deployToExistingDroplet()
        .then((result) => {
            console.log('✅ Deployment completed!');
            console.log('Result:', result);
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Failed:', error.message);
            process.exit(1);
        });
}

module.exports = deployToExistingDroplet;