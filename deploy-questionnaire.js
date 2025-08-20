#!/usr/bin/env node

const readline = require('readline');
const fs = require('fs').promises;
const path = require('path');

class DeploymentQuestionnaire {
    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        this.config = {};
    }

    async question(query) {
        return new Promise(resolve => {
            this.rl.question(query, resolve);
        });
    }

    async validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    async validateDomain(domain) {
        const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
        return domainRegex.test(domain);
    }

    async promptWithValidation(query, validator, errorMsg) {
        let input;
        do {
            input = await this.question(query);
            if (!validator(input)) {
                console.log(`❌ ${errorMsg}`);
            }
        } while (!validator(input));
        return input;
    }

    async collectBasicInfo() {
        console.log('\n🚀 Welcome to the Automated Deployment Setup!');
        console.log('This script will deploy your Next.js CMS to DigitalOcean with full infrastructure automation.\n');

        // Project name
        this.config.projectName = await this.question('📝 Enter your project name (used for naming resources): ');
        if (!this.config.projectName) {
            this.config.projectName = 'nextjs-cms';
        }

        // Domain configuration
        console.log('\n🌐 Domain Configuration:');
        const hasDomain = await this.question('Do you have a domain to use? (y/n): ');
        
        if (hasDomain.toLowerCase() === 'y') {
            this.config.domain = await this.promptWithValidation(
                'Enter your domain (e.g., example.com): ',
                this.validateDomain.bind(this),
                'Please enter a valid domain name'
            );
            
            const domainProvider = await this.question('Where is your domain registered? (cloudflare/godaddy/namecheap/digitalocean/other): ');
            this.config.domainProvider = domainProvider || 'other';
        } else {
            console.log('📝 Note: You can add a domain later. The app will be accessible via IP address initially.');
            this.config.domain = null;
        }
    }

    async collectDigitalOceanInfo() {
        console.log('\n☁️  DigitalOcean Configuration:');
        
        // API Token
        console.log('You need a DigitalOcean API token. Get one at: https://cloud.digitalocean.com/account/api/tokens');
        this.config.doToken = await this.question('Enter your DigitalOcean API token: ');

        // Droplet size
        console.log('\n💻 Choose your server size:');
        console.log('1. Basic ($6/month) - 1GB RAM, 1 CPU, 25GB SSD - Good for small projects');
        console.log('2. Professional ($12/month) - 2GB RAM, 1 CPU, 50GB SSD - Recommended');
        console.log('3. Business ($24/month) - 4GB RAM, 2 CPUs, 80GB SSD - High traffic');
        console.log('4. Custom - Specify your own configuration');
        
        const sizeChoice = await this.question('Select option (1-4): ');
        
        const sizes = {
            '1': 's-1vcpu-1gb',
            '2': 's-1vcpu-2gb', 
            '3': 's-2vcpu-4gb'
        };

        if (sizes[sizeChoice]) {
            this.config.dropletSize = sizes[sizeChoice];
        } else {
            this.config.dropletSize = await this.question('Enter custom droplet size (e.g., s-1vcpu-1gb): ');
        }

        // Region
        console.log('\n🌍 Choose your server region:');
        console.log('1. New York (nyc1) - Good for US East Coast');
        console.log('2. San Francisco (sfo3) - Good for US West Coast');
        console.log('3. London (lon1) - Good for Europe');
        console.log('4. Frankfurt (fra1) - Good for Europe');
        console.log('5. Singapore (sgp1) - Good for Asia');
        console.log('6. Custom region');

        const regionChoice = await this.question('Select region (1-6): ');
        const regions = {
            '1': 'nyc1',
            '2': 'sfo3',
            '3': 'lon1', 
            '4': 'fra1',
            '5': 'sgp1'
        };

        if (regions[regionChoice]) {
            this.config.region = regions[regionChoice];
        } else {
            this.config.region = await this.question('Enter custom region code: ');
        }

        // SSH Key
        const hasSSHKey = await this.question('\n🔑 Do you want to add your SSH key for server access? (y/n): ');
        if (hasSSHKey.toLowerCase() === 'y') {
            this.config.sshKeyPath = await this.question('Enter path to your SSH public key (e.g., ~/.ssh/id_rsa.pub): ');
        }
    }

    async collectDatabaseInfo() {
        console.log('\n🗄️  Database Configuration:');
        
        const dbChoice = await this.question('Choose database option:\n1. DigitalOcean Managed Database (recommended)\n2. Database on main droplet\nSelect (1-2): ');
        
        if (dbChoice === '1') {
            this.config.databaseType = 'managed';
            console.log('📝 Note: Managed database starts at $15/month but provides better performance and automatic backups.');
        } else {
            this.config.databaseType = 'local';
            console.log('📝 Note: Database will be installed on the main droplet (included in droplet cost).');
        }

        // Database credentials
        this.config.dbName = await this.question('Database name (default: cms_production): ') || 'cms_production';
        this.config.dbUser = await this.question('Database username (default: cms_user): ') || 'cms_user';
        this.config.dbPassword = await this.question('Database password (auto-generated if empty): ') || this.generatePassword();
    }

    async collectApplicationInfo() {
        console.log('\n⚙️  Application Configuration:');

        // Environment
        this.config.nodeEnv = 'production';

        // Admin credentials
        console.log('\n👤 Admin Account Setup:');
        this.config.adminEmail = await this.promptWithValidation(
            'Admin email: ',
            this.validateEmail.bind(this),
            'Please enter a valid email address'
        );
        this.config.adminPassword = await this.question('Admin password (auto-generated if empty): ') || this.generatePassword();

        // JWT Secrets
        this.config.jwtSecret = this.generateSecret();
        this.config.jwtRefreshSecret = this.generateSecret();
        this.config.sessionSecret = this.generateSecret();

        // Email configuration (optional)
        const setupEmail = await this.question('\n📧 Setup email sending? (y/n): ');
        if (setupEmail.toLowerCase() === 'y') {
            this.config.smtpHost = await this.question('SMTP Host (e.g., smtp.gmail.com): ');
            this.config.smtpPort = await this.question('SMTP Port (default: 587): ') || '587';
            this.config.smtpUser = await this.question('SMTP Username: ');
            this.config.smtpPassword = await this.question('SMTP Password: ');
            this.config.smtpFrom = await this.question(`SMTP From Address (default: ${this.config.adminEmail}): `) || this.config.adminEmail;
        }

        // Lemon Squeezy (optional)
        const setupPayments = await this.question('\n💳 Setup Lemon Squeezy payments? (y/n): ');
        if (setupPayments.toLowerCase() === 'y') {
            this.config.lemonSqueezyApiKey = await this.question('Lemon Squeezy API Key: ');
            this.config.lemonSqueezyStoreId = await this.question('Lemon Squeezy Store ID: ');
            this.config.lemonSqueezyWebhookSecret = await this.question('Lemon Squeezy Webhook Secret: ');
        }
    }

    async collectDeploymentOptions() {
        console.log('\n🚀 Deployment Options:');

        // SSL
        const enableSSL = await this.question('Enable SSL certificate (Let\'s Encrypt)? (y/n): ');
        this.config.enableSSL = enableSSL.toLowerCase() === 'y';

        // Monitoring
        const enableMonitoring = await this.question('Setup basic monitoring (recommended)? (y/n): ');
        this.config.enableMonitoring = enableMonitoring.toLowerCase() === 'y';

        // Backups
        const enableBackups = await this.question('Enable automatic backups? (y/n): ');
        this.config.enableBackups = enableBackups.toLowerCase() === 'y';

        // Firewall
        this.config.enableFirewall = true; // Always enable for security
    }

    generatePassword() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < 16; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    }

    generateSecret() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let secret = '';
        for (let i = 0; i < 64; i++) {
            secret += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return secret;
    }

    async showSummary() {
        console.log('\n📋 Deployment Summary:');
        console.log('═'.repeat(50));
        console.log(`🏷️  Project Name: ${this.config.projectName}`);
        console.log(`🌐 Domain: ${this.config.domain || 'None (will use IP address)'}`);
        console.log(`☁️  Droplet Size: ${this.config.dropletSize}`);
        console.log(`🌍 Region: ${this.config.region}`);
        console.log(`🗄️  Database: ${this.config.databaseType === 'managed' ? 'DigitalOcean Managed' : 'Local on droplet'}`);
        console.log(`🔒 SSL: ${this.config.enableSSL ? 'Enabled' : 'Disabled'}`);
        console.log(`📊 Monitoring: ${this.config.enableMonitoring ? 'Enabled' : 'Disabled'}`);
        console.log(`💾 Backups: ${this.config.enableBackups ? 'Enabled' : 'Disabled'}`);
        console.log('═'.repeat(50));

        // Cost estimation
        let monthlyCost = 0;
        const dropletCosts = {
            's-1vcpu-1gb': 6,
            's-1vcpu-2gb': 12,
            's-2vcpu-4gb': 24
        };
        monthlyCost += dropletCosts[this.config.dropletSize] || 12;
        
        if (this.config.databaseType === 'managed') {
            monthlyCost += 15;
        }

        console.log(`💰 Estimated monthly cost: $${monthlyCost}/month`);
        console.log('═'.repeat(50));
    }

    async saveConfig() {
        const configPath = path.join(process.cwd(), 'deployment-config.json');
        await fs.writeFile(configPath, JSON.stringify(this.config, null, 2));
        console.log(`\n✅ Configuration saved to: ${configPath}`);
        return configPath;
    }

    async run() {
        try {
            await this.collectBasicInfo();
            await this.collectDigitalOceanInfo();
            await this.collectDatabaseInfo();
            await this.collectApplicationInfo();
            await this.collectDeploymentOptions();
            await this.showSummary();

            const confirm = await this.question('\n🚀 Ready to deploy? (y/n): ');
            if (confirm.toLowerCase() === 'y') {
                const configPath = await this.saveConfig();
                console.log('\n🎉 Configuration complete!');
                console.log('Next steps:');
                console.log('1. Run: node deploy.js');
                console.log('2. Wait for deployment to complete (5-10 minutes)');
                console.log('3. Access your site at the provided URL');
                return configPath;
            } else {
                console.log('\n❌ Deployment cancelled.');
                return null;
            }
        } catch (error) {
            console.error('\n❌ Error during configuration:', error.message);
            return null;
        } finally {
            this.rl.close();
        }
    }
}

// Run if called directly
if (require.main === module) {
    const questionnaire = new DeploymentQuestionnaire();
    questionnaire.run().then(configPath => {
        if (configPath) {
            console.log(`\n📄 Configuration saved to: ${configPath}`);
            process.exit(0);
        } else {
            process.exit(1);
        }
    });
}

module.exports = DeploymentQuestionnaire;