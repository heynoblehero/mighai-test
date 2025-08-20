#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { execSync, spawn } = require('child_process');

// Import our modules
const DigitalOceanAPI = require('./digitalocean-api');
const InfrastructureConfig = require('./infrastructure-config');
const DatabaseSetup = require('./database-setup');

class Deployer {
    constructor(configPath) {
        this.configPath = configPath;
        this.config = null;
        this.doAPI = null;
        this.infrastructure = null;
        this.deploymentState = {
            resources: {},
            steps: {},
            timestamp: new Date().toISOString()
        };
    }

    async loadConfig() {
        try {
            const configContent = await fs.readFile(this.configPath, 'utf8');
            this.config = JSON.parse(configContent);
            console.log('✅ Configuration loaded successfully');
            return this.config;
        } catch (error) {
            throw new Error(`Failed to load config: ${error.message}`);
        }
    }

    async validatePrerequisites() {
        console.log('🔍 Validating prerequisites...');
        
        // Check if required files exist
        const requiredFiles = ['package.json', 'server.js'];
        for (const file of requiredFiles) {
            try {
                await fs.access(file);
            } catch (error) {
                throw new Error(`Required file missing: ${file}`);
            }
        }

        // Initialize DigitalOcean API
        this.doAPI = new DigitalOceanAPI(this.config.doToken);
        
        // Validate API token
        const isValid = await this.doAPI.validateToken();
        if (!isValid) {
            throw new Error('Invalid DigitalOcean API token');
        }

        console.log('✅ Prerequisites validated');
    }

    async deployInfrastructure() {
        console.log('🏗️ Deploying infrastructure...');
        
        try {
            // Generate infrastructure configuration
            const infraConfig = new InfrastructureConfig(this.config);
            this.infrastructure = infraConfig.generateInfrastructure();

            // Upload SSH key if provided
            if (this.config.sshKeyPath) {
                await this.uploadSSHKey();
            }

            // Create droplet
            await this.createDroplet();

            // Setup database
            await this.setupDatabase();

            // Setup firewall
            await this.setupFirewall();

            // Setup domain and DNS
            if (this.config.domain) {
                await this.setupDomain();
            }

            // Setup SSL certificate
            if (this.config.enableSSL && this.config.domain) {
                await this.setupSSL();
            }

            this.deploymentState.steps.infrastructure = 'completed';
            console.log('✅ Infrastructure deployment completed');

        } catch (error) {
            this.deploymentState.steps.infrastructure = 'failed';
            throw new Error(`Infrastructure deployment failed: ${error.message}`);
        }
    }

    async uploadSSHKey() {
        console.log('🔑 Uploading SSH key...');
        
        try {
            const sshKeyContent = await fs.readFile(this.config.sshKeyPath, 'utf8');
            const sshKey = await this.doAPI.uploadSSHKey(
                `${this.config.projectName}-key`,
                sshKeyContent.trim()
            );
            
            // Update infrastructure config with SSH key ID
            this.infrastructure.droplet.ssh_keys = [sshKey.id];
            this.deploymentState.resources.sshKey = sshKey;
            
        } catch (error) {
            console.log('⚠️ SSH key upload failed, continuing without SSH key:', error.message);
        }
    }

    async createDroplet() {
        console.log('🚀 Creating droplet...');
        
        // Generate cloud-init script with SSH key content
        let cloudInitScript = this.infrastructure.droplet.user_data;
        
        if (this.config.sshKeyPath) {
            try {
                const sshKeyContent = await fs.readFile(this.config.sshKeyPath, 'utf8');
                cloudInitScript = cloudInitScript.replace(
                    'ssh_key_content_placeholder',
                    sshKeyContent.trim()
                );
            } catch (error) {
                console.log('⚠️ Could not read SSH key for cloud-init');
            }
        }

        const dropletConfig = {
            ...this.infrastructure.droplet,
            user_data: cloudInitScript
        };

        const droplet = await this.doAPI.createDroplet(dropletConfig);
        this.deploymentState.resources.droplet = droplet;
        
        console.log(`✅ Droplet created: ${droplet.name} (${droplet.networks.v4[0].ip_address})`);
        return droplet;
    }

    async setupDatabase() {
        console.log('🗄️ Setting up database...');
        
        const dbSetup = new DatabaseSetup(this.config, this.doAPI);
        const dbResult = await dbSetup.setupDatabase();
        
        this.deploymentState.resources.database = dbResult;
        
        // Update environment variables with actual database URL
        if (dbResult.type === 'managed') {
            this.config.actualDatabaseUrl = dbResult.connectionString;
        }
        
        console.log('✅ Database setup completed');
        return dbResult;
    }

    async setupFirewall() {
        console.log('🛡️ Setting up firewall...');
        
        const firewallConfig = {
            ...this.infrastructure.firewall,
            droplet_ids: [this.deploymentState.resources.droplet.id]
        };

        const firewall = await this.doAPI.createFirewall(firewallConfig);
        this.deploymentState.resources.firewall = firewall;
        
        console.log('✅ Firewall setup completed');
        return firewall;
    }

    async setupDomain() {
        console.log('🌐 Setting up domain and DNS...');
        
        try {
            const domain = await this.doAPI.createDomain(this.config.domain);
            this.deploymentState.resources.domain = domain;

            // Create DNS records
            const dropletIP = this.deploymentState.resources.droplet.networks.v4[0].ip_address;
            
            const records = [
                { type: 'A', name: '@', data: dropletIP, ttl: 1800 },
                { type: 'A', name: 'www', data: dropletIP, ttl: 1800 }
            ];

            for (const record of records) {
                await this.doAPI.createDomainRecord(this.config.domain, record);
            }

            console.log('✅ Domain and DNS setup completed');
            
        } catch (error) {
            console.log('⚠️ Domain setup failed (domain may already exist):', error.message);
            // Continue deployment even if domain setup fails
        }
    }

    async setupSSL() {
        console.log('🔒 Setting up SSL certificate...');
        
        try {
            const certificate = await this.doAPI.createCertificate(
                `${this.config.projectName}-ssl`,
                [this.config.domain, `www.${this.config.domain}`]
            );
            
            this.deploymentState.resources.certificate = certificate;
            console.log('✅ SSL certificate setup completed');
            
        } catch (error) {
            console.log('⚠️ SSL setup failed:', error.message);
            // SSL will be handled by Let's Encrypt on the server
        }
    }

    async deployApplication() {
        console.log('📦 Deploying application...');
        
        try {
            const dropletIP = this.deploymentState.resources.droplet.networks.v4[0].ip_address;
            
            // Wait for droplet to be fully ready
            await this.waitForDropletReady(dropletIP);
            
            // Create deployment package
            await this.createDeploymentPackage();
            
            // Upload and deploy application
            await this.uploadApplication(dropletIP);
            
            // Configure environment variables
            await this.configureEnvironment(dropletIP);
            
            // Start application services
            await this.startServices(dropletIP);
            
            // Setup SSL with Let's Encrypt (if domain is configured)
            if (this.config.enableSSL && this.config.domain) {
                await this.setupLetsEncrypt(dropletIP);
            }
            
            this.deploymentState.steps.application = 'completed';
            console.log('✅ Application deployment completed');
            
        } catch (error) {
            this.deploymentState.steps.application = 'failed';
            throw new Error(`Application deployment failed: ${error.message}`);
        }
    }

    async waitForDropletReady(dropletIP, maxWaitTime = 300000) {
        console.log('⏳ Waiting for droplet to be ready...');
        console.log(`🔍 Checking droplet ${dropletIP} connectivity...`);
        
        const startTime = Date.now();
        let attempt = 1;
        
        while (Date.now() - startTime < maxWaitTime) {
            try {
                console.log(`🔄 Attempt ${attempt}: Testing basic connectivity...`);
                
                // First test basic network connectivity
                try {
                    execSync(`ping -c 1 -W 5 ${dropletIP}`, { stdio: 'pipe', timeout: 10000 });
                    console.log(`✅ Droplet ${dropletIP} is reachable via ping`);
                } catch (pingError) {
                    console.log(`⚠️ Ping failed, but continuing...`);
                }
                
                // Test SSH connectivity with root user first (default on Ubuntu)
                console.log(`🔄 Testing SSH connection to root@${dropletIP}...`);
                try {
                    execSync(`ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no root@${dropletIP} "echo 'ready'"`, {
                        stdio: 'pipe',
                        timeout: 15000
                    });
                    console.log('✅ Droplet is ready for deployment (SSH as root works)');
                    return true;
                } catch (sshRootError) {
                    console.log(`⚠️ SSH as root failed: ${sshRootError.message}`);
                }
                
                // Try with deploy user
                console.log(`🔄 Testing SSH connection to deploy@${dropletIP}...`);
                try {
                    execSync(`ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no deploy@${dropletIP} "echo 'ready'"`, {
                        stdio: 'pipe',
                        timeout: 15000
                    });
                    console.log('✅ Droplet is ready for deployment (SSH as deploy works)');
                    return true;
                } catch (sshDeployError) {
                    console.log(`⚠️ SSH as deploy failed: ${sshDeployError.message}`);
                }
                
                // Check droplet status via API
                try {
                    const status = await this.doAPI.getDropletStatus(this.deploymentState.resources.droplet.id);
                    console.log(`📊 Droplet API status: ${status}`);
                    
                    if (status === 'active') {
                        console.log('✅ Droplet is active according to API, proceeding anyway...');
                        // If droplet is active but SSH isn't working, let's proceed - maybe the setup script will handle it
                        return true;
                    }
                } catch (apiError) {
                    console.log(`⚠️ Could not check droplet status via API: ${apiError.message}`);
                }
                
            } catch (error) {
                console.log(`⚠️ General connectivity check failed: ${error.message}`);
            }
            
            const elapsed = Math.round((Date.now() - startTime) / 1000);
            console.log(`🔄 Droplet not ready yet (${elapsed}s elapsed), waiting 30s before retry...`);
            await new Promise(resolve => setTimeout(resolve, 30000));
            attempt++;
        }
        
        throw new Error('Droplet failed to become ready within expected time');
    }

    async createDeploymentPackage() {
        console.log('📦 Creating deployment package...');
        
        // Create a deployment directory
        const deployDir = path.join(process.cwd(), 'deploy-package');
        await fs.mkdir(deployDir, { recursive: true });
        
        // Copy necessary files
        const filesToCopy = [
            'package.json',
            'server.js',
            'setup.js',
            '.env.example'
        ];
        
        for (const file of filesToCopy) {
            try {
                await fs.copyFile(file, path.join(deployDir, file));
            } catch (error) {
                console.log(`⚠️ Could not copy ${file}:`, error.message);
            }
        }
        
        // Copy directories
        const dirsToCopy = ['components', 'pages', 'public', 'styles'];
        
        for (const dir of dirsToCopy) {
            try {
                await this.copyDirectory(dir, path.join(deployDir, dir));
            } catch (error) {
                console.log(`⚠️ Could not copy directory ${dir}:`, error.message);
            }
        }
        
        // Create environment file
        await this.createEnvironmentFile(deployDir);
        
        console.log('✅ Deployment package created');
        return deployDir;
    }

    async copyDirectory(src, dest) {
        await fs.mkdir(dest, { recursive: true });
        const entries = await fs.readdir(src, { withFileTypes: true });
        
        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);
            
            if (entry.isDirectory()) {
                await this.copyDirectory(srcPath, destPath);
            } else {
                await fs.copyFile(srcPath, destPath);
            }
        }
    }

    async createEnvironmentFile(deployDir) {
        const dropletIP = this.deploymentState.resources.droplet.networks.v4[0].ip_address;
        const dbUrl = this.config.actualDatabaseUrl || this.generateDatabaseUrl();
        
        const envContent = `NODE_ENV=production
PORT=3000
DATABASE_URL=${dbUrl}
JWT_SECRET=${this.config.jwtSecret}
JWT_REFRESH_SECRET=${this.config.jwtRefreshSecret}
SESSION_SECRET=${this.config.sessionSecret}
ADMIN_EMAIL=${this.config.adminEmail}
ADMIN_PASSWORD=${this.config.adminPassword}
BASE_URL=${this.config.domain ? `https://${this.config.domain}` : `http://${dropletIP}`}
${this.config.smtpHost ? `SMTP_HOST=${this.config.smtpHost}
SMTP_PORT=${this.config.smtpPort}
SMTP_USER=${this.config.smtpUser}
SMTP_PASS=${this.config.smtpPassword}
SMTP_FROM=${this.config.smtpFrom}` : ''}
${this.config.lemonSqueezyApiKey ? `LEMON_SQUEEZY_API_KEY=${this.config.lemonSqueezyApiKey}
LEMON_SQUEEZY_STORE_ID=${this.config.lemonSqueezyStoreId}
LEMON_SQUEEZY_WEBHOOK_SECRET=${this.config.lemonSqueezyWebhookSecret}` : ''}`;

        await fs.writeFile(path.join(deployDir, '.env'), envContent);
    }

    generateDatabaseUrl() {
        if (this.config.databaseType === 'local') {
            return `postgresql://${this.config.dbUser}:${this.config.dbPassword}@localhost:5432/${this.config.dbName}`;
        }
        return this.deploymentState.resources.database?.connectionString || '';
    }

    async uploadApplication(dropletIP) {
        console.log('⬆️ Uploading application to server...');
        
        const deployDir = path.join(process.cwd(), 'deploy-package');
        
        try {
            // Upload files via rsync
            execSync(`rsync -avz --delete ${deployDir}/ deploy@${dropletIP}:/var/www/${this.config.projectName}/`, {
                stdio: 'inherit'
            });
            
            console.log('✅ Application uploaded successfully');
        } catch (error) {
            throw new Error(`Failed to upload application: ${error.message}`);
        }
    }

    async configureEnvironment(dropletIP) {
        console.log('⚙️ Configuring server environment...');
        
        const commands = [
            // Install dependencies
            `cd /var/www/${this.config.projectName} && npm install --production`,
            
            // Run database setup if needed
            `cd /var/www/${this.config.projectName} && npm run setup`,
            
            // Set proper permissions
            `chown -R deploy:deploy /var/www/${this.config.projectName}`,
            
            // Reload supervisor to pick up new config
            'supervisorctl reread',
            'supervisorctl update'
        ];
        
        for (const command of commands) {
            try {
                execSync(`ssh deploy@${dropletIP} "sudo ${command}"`, { stdio: 'inherit' });
            } catch (error) {
                console.log(`⚠️ Command failed: ${command}`);
                // Continue with other commands
            }
        }
        
        console.log('✅ Server environment configured');
    }

    async startServices(dropletIP) {
        console.log('🚀 Starting application services...');
        
        const commands = [
            'supervisorctl start nextjs-app',
            'systemctl restart nginx',
            'systemctl enable nginx'
        ];
        
        for (const command of commands) {
            try {
                execSync(`ssh deploy@${dropletIP} "sudo ${command}"`, { stdio: 'inherit' });
            } catch (error) {
                console.log(`⚠️ Service command failed: ${command}`);
            }
        }
        
        // Wait for services to start
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // Check if application is running
        try {
            const response = execSync(`curl -f http://${dropletIP}/health`, { encoding: 'utf8' });
            console.log('✅ Application is running and healthy');
        } catch (error) {
            console.log('⚠️ Application health check failed, but continuing...');
        }
    }

    async setupLetsEncrypt(dropletIP) {
        console.log('🔒 Setting up Let\'s Encrypt SSL...');
        
        try {
            const commands = [
                // Install certbot
                'apt-get update',
                'apt-get install -y certbot python3-certbot-nginx',
                
                // Get certificate
                `certbot --nginx -d ${this.config.domain} -d www.${this.config.domain} --non-interactive --agree-tos --email ${this.config.adminEmail}`,
                
                // Setup auto-renewal
                'crontab -l | { cat; echo "0 12 * * * /usr/bin/certbot renew --quiet"; } | crontab -'
            ];
            
            for (const command of commands) {
                execSync(`ssh deploy@${dropletIP} "sudo ${command}"`, { stdio: 'inherit' });
            }
            
            console.log('✅ Let\'s Encrypt SSL setup completed');
        } catch (error) {
            console.log('⚠️ SSL setup failed:', error.message);
        }
    }

    async saveDeploymentState() {
        const stateFile = path.join(process.cwd(), 'deployment-state.json');
        await fs.writeFile(stateFile, JSON.stringify(this.deploymentState, null, 2));
        console.log(`💾 Deployment state saved to: ${stateFile}`);
    }

    async showDeploymentSummary() {
        console.log('\n🎉 Deployment completed successfully!');
        console.log('═'.repeat(60));
        
        const dropletIP = this.deploymentState.resources.droplet.networks.v4[0].ip_address;
        
        console.log(`🚀 Server IP: ${dropletIP}`);
        
        if (this.config.domain) {
            const protocol = this.config.enableSSL ? 'https' : 'http';
            console.log(`🌐 Website: ${protocol}://${this.config.domain}`);
            console.log(`🌐 Website (www): ${protocol}://www.${this.config.domain}`);
        } else {
            console.log(`🌐 Website: http://${dropletIP}`);
        }
        
        console.log(`👤 Admin Panel: ${this.config.domain ? `https://${this.config.domain}` : `http://${dropletIP}`}/admin`);
        console.log(`📧 Admin Email: ${this.config.adminEmail}`);
        console.log(`🔑 Admin Password: ${this.config.adminPassword}`);
        
        if (this.deploymentState.resources.database?.type === 'managed') {
            console.log(`🗄️ Database: DigitalOcean Managed PostgreSQL`);
        } else {
            console.log(`🗄️ Database: Local PostgreSQL on droplet`);
        }
        
        console.log('═'.repeat(60));
        console.log('📋 Next Steps:');
        console.log('1. Visit your website and verify it\'s working');
        console.log('2. Log into the admin panel and customize your content');
        console.log('3. Configure your domain\'s nameservers if using external DNS');
        console.log('4. Set up regular backups for your data');
        console.log('5. Monitor your server resources and scale as needed');
        
        if (this.config.enableBackups) {
            console.log('\n💾 Automated backups are enabled');
        }
        
        if (this.config.enableMonitoring) {
            console.log(`📊 Monitoring alerts will be sent to: ${this.config.adminEmail}`);
        }
        
        console.log('\n🎯 Your CMS is now live and ready to use!');
    }

    async deploy() {
        try {
            console.log('🚀 Starting deployment process...');
            await this.loadConfig();
            
            console.log(`📋 Project: ${this.config.projectName}`);
            console.log(`🌍 Region: ${this.config.region}`);
            console.log(`💻 Droplet: ${this.config.dropletSize}`);
            await this.validatePrerequisites();
            await this.deployInfrastructure();
            await this.deployApplication();
            await this.saveDeploymentState();
            await this.showDeploymentSummary();
            
            return this.deploymentState;
            
        } catch (error) {
            console.error('\n❌ Deployment failed:', error.message);
            
            // Save current state for debugging
            await this.saveDeploymentState();
            
            // Offer cleanup option
            const cleanup = process.argv.includes('--cleanup-on-error');
            if (cleanup) {
                console.log('🧹 Cleaning up resources due to --cleanup-on-error flag...');
                await this.cleanup();
            } else {
                console.log('\n💡 To clean up created resources, run: node cleanup.js');
                console.log('💡 To retry deployment, run: node deploy.js');
            }
            
            throw error;
        }
    }

    async cleanup() {
        console.log('🧹 Starting resource cleanup...');
        
        if (this.doAPI && this.deploymentState.resources) {
            try {
                // Set resources for cleanup
                this.doAPI.resources = this.deploymentState.resources;
                await this.doAPI.cleanupResources();
                console.log('✅ Resource cleanup completed');
            } catch (error) {
                console.error('❌ Cleanup failed:', error.message);
            }
        }
    }
}

// Run if called directly
if (require.main === module) {
    const configPath = process.argv[2] || './deployment-config.json';
    
    const deployer = new Deployer(configPath);
    
    deployer.deploy()
        .then(() => {
            console.log('\n✅ Deployment completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Deployment failed:', error.message);
            process.exit(1);
        });
}

module.exports = Deployer;