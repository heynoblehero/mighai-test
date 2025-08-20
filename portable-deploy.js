#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

// Import our modules
const DeploymentQuestionnaire = require('./deploy-questionnaire');
const Deployer = require('./deploy');

class PortableDeployment {
    constructor() {
        this.configPath = null;
    }

    async checkPrerequisites() {
        console.log('🔍 Checking prerequisites...');

        // Check Node.js version
        const nodeVersion = process.version;
        const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
        
        if (majorVersion < 16) {
            throw new Error(`Node.js 16+ required. Current version: ${nodeVersion}`);
        }

        // Check for required system tools
        const requiredTools = ['ssh', 'rsync', 'curl'];
        
        for (const tool of requiredTools) {
            try {
                execSync(`which ${tool}`, { stdio: 'pipe' });
                console.log(`✅ ${tool} found`);
            } catch (error) {
                throw new Error(`Required tool missing: ${tool}. Please install it and try again.`);
            }
        }

        // Check if we're in a valid project directory
        try {
            await fs.access('package.json');
            console.log('✅ package.json found');
        } catch (error) {
            throw new Error('package.json not found. Please run this script from your Next.js project root.');
        }

        console.log('✅ All prerequisites met');
    }

    async installDependencies() {
        console.log('📦 Installing deployment dependencies...');

        const deploymentDeps = [
            'axios',
            'pg',
            'bcryptjs'
        ];

        // Check if dependencies are already installed
        const packageJsonPath = path.join(process.cwd(), 'package.json');
        const packageContent = await fs.readFile(packageJsonPath, 'utf8');
        const packageJson = JSON.parse(packageContent);
        
        const missingDeps = deploymentDeps.filter(dep => 
            !packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep]
        );

        if (missingDeps.length > 0) {
            console.log(`Installing missing dependencies: ${missingDeps.join(', ')}`);
            try {
                execSync(`npm install ${missingDeps.join(' ')}`, { stdio: 'inherit' });
                console.log('✅ Dependencies installed');
            } catch (error) {
                throw new Error(`Failed to install dependencies: ${error.message}`);
            }
        } else {
            console.log('✅ All required dependencies already installed');
        }
    }

    async runQuestionnaire() {
        console.log('📝 Starting deployment questionnaire...');
        
        const questionnaire = new DeploymentQuestionnaire();
        this.configPath = await questionnaire.run();
        
        if (!this.configPath) {
            throw new Error('Configuration cancelled or failed');
        }

        return this.configPath;
    }

    async runDeployment() {
        console.log('🚀 Starting deployment process...');
        
        const deployer = new Deployer(this.configPath);
        const deploymentResult = await deployer.deploy();
        
        return deploymentResult;
    }

    async showWelcomeMessage() {
        console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║             🚀 Portable DigitalOcean Deployment              ║
║                                                               ║
║    Automated infrastructure deployment for your Next.js CMS  ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

This tool will:
  ✅ Create DigitalOcean infrastructure (droplet, database, firewall)
  ✅ Configure domain and SSL certificates  
  ✅ Deploy your Next.js CMS application
  ✅ Set up monitoring and backups
  ✅ Provide you with a live, production-ready website

Requirements:
  • DigitalOcean account with API token
  • Node.js 16+ 
  • SSH, rsync, curl installed
  • Domain name (optional)

Estimated time: 5-10 minutes
Estimated cost: $6-30/month depending on configuration

Let's get started! 🎉
`);

        const proceed = await this.question('Ready to begin? (y/n): ');
        if (proceed.toLowerCase() !== 'y') {
            console.log('❌ Deployment cancelled');
            process.exit(0);
        }
    }

    async question(query) {
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise(resolve => {
            rl.question(query, (answer) => {
                rl.close();
                resolve(answer);
            });
        });
    }

    async handleError(error) {
        console.error('\n❌ Deployment failed:', error.message);
        console.log('\n🔧 Troubleshooting tips:');
        
        if (error.message.includes('API token')) {
            console.log('  • Verify your DigitalOcean API token is correct');
            console.log('  • Check token permissions in DigitalOcean control panel');
        }
        
        if (error.message.includes('SSH')) {
            console.log('  • Ensure SSH is installed and configured');
            console.log('  • Check your SSH key permissions');
        }
        
        if (error.message.includes('domain')) {
            console.log('  • Verify domain ownership and DNS configuration');
            console.log('  • Check if domain is already in use');
        }
        
        if (error.message.includes('quota') || error.message.includes('limit')) {
            console.log('  • Check your DigitalOcean account limits');
            console.log('  • Verify billing information is up to date');
        }

        console.log('\n📞 Support:');
        console.log('  • Check deployment logs in deployment-state.json');
        console.log('  • Run "node cleanup.js" to clean up partial deployments');
        console.log('  • Retry deployment with "node deploy.js"');
        
        throw error;
    }

    async run() {
        try {
            await this.showWelcomeMessage();
            await this.checkPrerequisites();
            await this.installDependencies();
            await this.runQuestionnaire();
            await this.runDeployment();
            
            console.log('\n🎉 Portable deployment completed successfully!');
            console.log('Your Next.js CMS is now live and ready to use!');
            
        } catch (error) {
            await this.handleError(error);
        }
    }
}

// Add command line options
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Portable DigitalOcean Deployment Tool

Usage: node portable-deploy.js [options]

Options:
  --help, -h          Show this help message
  --version, -v       Show version information
  --config FILE       Use existing configuration file
  --cleanup           Clean up resources from previous deployment
  --dry-run           Run questionnaire without deploying

Examples:
  node portable-deploy.js                    # Full interactive deployment
  node portable-deploy.js --config my.json  # Deploy with existing config
  node portable-deploy.js --cleanup          # Clean up resources
  
For more information, visit: https://github.com/your-repo/portable-deploy
`);
    process.exit(0);
}

if (args.includes('--version') || args.includes('-v')) {
    console.log('Portable DigitalOcean Deployment v1.0.0');
    process.exit(0);
}

if (args.includes('--cleanup')) {
    const ResourceCleanup = require('./cleanup');
    const cleanup = new ResourceCleanup();
    cleanup.run()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
    return;
}

// Check for existing config
const configIndex = args.indexOf('--config');
if (configIndex !== -1 && args[configIndex + 1]) {
    const configFile = args[configIndex + 1];
    const Deployer = require('./deploy');
    const deployer = new Deployer(configFile);
    deployer.deploy()
        .then(() => {
            console.log('✅ Deployment completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Deployment failed:', error.message);
            process.exit(1);
        });
    return;
}

// Run main deployment process
if (require.main === module) {
    const deployment = new PortableDeployment();
    deployment.run()
        .then(() => {
            process.exit(0);
        })
        .catch(() => {
            process.exit(1);
        });
}

module.exports = PortableDeployment;