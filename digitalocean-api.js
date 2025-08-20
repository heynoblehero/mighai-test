const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class DigitalOceanAPI {
    constructor(token) {
        this.token = token;
        this.baseURL = 'https://api.digitalocean.com/v2';
        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        this.resources = {};
    }

    async makeRequest(method, endpoint, data = null) {
        try {
            const response = await this.client.request({
                method,
                url: endpoint,
                data
            });
            return response.data;
        } catch (error) {
            console.error(`API Error [${method} ${endpoint}]:`, error.response?.data || error.message);
            throw new Error(`DigitalOcean API Error: ${error.response?.data?.message || error.message}`);
        }
    }

    async waitForResource(resourceType, resourceId, targetStatus = 'active', maxWaitTime = 600000) {
        const startTime = Date.now();
        const pollInterval = 10000; // 10 seconds

        console.log(`⏳ Waiting for ${resourceType} ${resourceId} to reach status: ${targetStatus}`);

        while (Date.now() - startTime < maxWaitTime) {
            try {
                let resource;
                
                switch (resourceType) {
                    case 'droplet':
                        resource = await this.getDroplet(resourceId);
                        break;
                    case 'database':
                        resource = await this.getDatabase(resourceId);
                        break;
                    default:
                        throw new Error(`Unknown resource type: ${resourceType}`);
                }

                console.log(`📊 ${resourceType} status: ${resource.status}`);

                if (resource.status === targetStatus) {
                    console.log(`✅ ${resourceType} ${resourceId} is ready!`);
                    return resource;
                }

                if (resource.status === 'errored' || resource.status === 'failed') {
                    throw new Error(`${resourceType} ${resourceId} failed to deploy`);
                }

                await this.sleep(pollInterval);
            } catch (error) {
                console.error(`Error checking ${resourceType} status:`, error.message);
                await this.sleep(pollInterval);
            }
        }

        throw new Error(`Timeout waiting for ${resourceType} ${resourceId} to be ready`);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // SSH Key Management
    async uploadSSHKey(name, publicKeyContent) {
        console.log(`🔑 Uploading SSH key: ${name}`);
        const data = await this.makeRequest('POST', '/ssh_keys', {
            name,
            public_key: publicKeyContent
        });
        console.log(`✅ SSH key uploaded with ID: ${data.ssh_key.id}`);
        return data.ssh_key;
    }

    async getSSHKeys() {
        const data = await this.makeRequest('GET', '/ssh_keys');
        return data.ssh_keys;
    }

    // Droplet Management
    async createDroplet(config) {
        console.log(`🚀 Creating droplet: ${config.name}`);
        
        const dropletData = {
            name: config.name,
            region: config.region,
            size: config.size,
            image: config.image,
            ssh_keys: config.ssh_keys || [],
            backups: config.backups || false,
            ipv6: config.ipv6 || true,
            monitoring: config.monitoring || false,
            tags: config.tags || [],
            user_data: config.user_data || ''
        };

        const data = await this.makeRequest('POST', '/droplets', dropletData);
        const droplet = data.droplet;
        
        console.log(`✅ Droplet created with ID: ${droplet.id}`);
        this.resources.droplet = droplet;
        
        // Wait for droplet to be active
        const activeDroplet = await this.waitForResource('droplet', droplet.id);
        return activeDroplet;
    }

    async getDroplet(dropletId) {
        const data = await this.makeRequest('GET', `/droplets/${dropletId}`);
        return data.droplet;
    }

    async getDropletStatus(dropletId) {
        const droplet = await this.getDroplet(dropletId);
        return droplet.status;
    }

    async deleteDroplet(dropletId) {
        console.log(`🗑️ Deleting droplet: ${dropletId}`);
        await this.makeRequest('DELETE', `/droplets/${dropletId}`);
        console.log(`✅ Droplet ${dropletId} deleted`);
    }

    // Database Management
    async createDatabase(config) {
        console.log(`🗄️ Creating managed database: ${config.name}`);
        
        const dbData = {
            name: config.name,
            engine: config.engine,
            version: config.version,
            size: config.size,
            region: config.region,
            num_nodes: config.num_nodes,
            tags: config.tags || []
        };

        const data = await this.makeRequest('POST', '/databases', dbData);
        const database = data.database;
        
        console.log(`✅ Database created with ID: ${database.id}`);
        this.resources.database = database;
        
        // Wait for database to be online
        const onlineDatabase = await this.waitForResource('database', database.id, 'online');
        return onlineDatabase;
    }

    async getDatabase(databaseId) {
        const data = await this.makeRequest('GET', `/databases/${databaseId}`);
        return data.database;
    }

    async createDatabaseUser(databaseId, username) {
        console.log(`👤 Creating database user: ${username}`);
        const data = await this.makeRequest('POST', `/databases/${databaseId}/users`, {
            name: username
        });
        console.log(`✅ Database user created: ${username}`);
        return data.user;
    }

    async createDatabaseDB(databaseId, dbName) {
        console.log(`🗃️ Creating database: ${dbName}`);
        const data = await this.makeRequest('POST', `/databases/${databaseId}/dbs`, {
            name: dbName
        });
        console.log(`✅ Database created: ${dbName}`);
        return data.db;
    }

    async deleteDatabase(databaseId) {
        console.log(`🗑️ Deleting database: ${databaseId}`);
        await this.makeRequest('DELETE', `/databases/${databaseId}`);
        console.log(`✅ Database ${databaseId} deleted`);
    }

    // Firewall Management
    async createFirewall(config) {
        console.log(`🛡️ Creating firewall: ${config.name}`);
        
        const firewallData = {
            name: config.name,
            inbound_rules: config.inbound_rules,
            outbound_rules: config.outbound_rules,
            droplet_ids: config.droplet_ids || [],
            tags: config.tags || []
        };

        const data = await this.makeRequest('POST', '/firewalls', firewallData);
        const firewall = data.firewall;
        
        console.log(`✅ Firewall created with ID: ${firewall.id}`);
        this.resources.firewall = firewall;
        return firewall;
    }

    async addDropletToFirewall(firewallId, dropletId) {
        console.log(`🔗 Adding droplet ${dropletId} to firewall ${firewallId}`);
        await this.makeRequest('POST', `/firewalls/${firewallId}/droplets`, {
            droplet_ids: [dropletId]
        });
        console.log(`✅ Droplet added to firewall`);
    }

    async deleteFirewall(firewallId) {
        console.log(`🗑️ Deleting firewall: ${firewallId}`);
        await this.makeRequest('DELETE', `/firewalls/${firewallId}`);
        console.log(`✅ Firewall ${firewallId} deleted`);
    }

    // Domain Management
    async createDomain(domainName) {
        console.log(`🌐 Creating domain: ${domainName}`);
        const data = await this.makeRequest('POST', '/domains', {
            name: domainName
        });
        console.log(`✅ Domain created: ${domainName}`);
        this.resources.domain = data.domain;
        return data.domain;
    }

    async createDomainRecord(domainName, record) {
        console.log(`📝 Creating DNS record: ${record.type} ${record.name}`);
        const data = await this.makeRequest('POST', `/domains/${domainName}/records`, record);
        console.log(`✅ DNS record created`);
        return data.domain_record;
    }

    async deleteDomain(domainName) {
        console.log(`🗑️ Deleting domain: ${domainName}`);
        await this.makeRequest('DELETE', `/domains/${domainName}`);
        console.log(`✅ Domain ${domainName} deleted`);
    }

    // Certificate Management
    async createCertificate(name, dnsNames, type = 'lets_encrypt') {
        console.log(`🔒 Creating SSL certificate: ${name}`);
        const data = await this.makeRequest('POST', '/certificates', {
            name,
            dns_names: dnsNames,
            type
        });
        console.log(`✅ SSL certificate created with ID: ${data.certificate.id}`);
        this.resources.certificate = data.certificate;
        return data.certificate;
    }

    async getCertificate(certificateId) {
        const data = await this.makeRequest('GET', `/certificates/${certificateId}`);
        return data.certificate;
    }

    // Load Balancer Management
    async createLoadBalancer(config) {
        console.log(`⚖️ Creating load balancer: ${config.name}`);
        const data = await this.makeRequest('POST', '/load_balancers', config);
        console.log(`✅ Load balancer created with ID: ${data.load_balancer.id}`);
        this.resources.loadBalancer = data.load_balancer;
        return data.load_balancer;
    }

    // Monitoring and Alerts
    async createAlert(config) {
        console.log(`📊 Creating monitoring alert: ${config.description}`);
        const data = await this.makeRequest('POST', '/monitoring/alerts', config);
        console.log(`✅ Alert created with ID: ${data.alert.uuid}`);
        return data.alert;
    }

    // Project Management
    async createProject(name, description) {
        console.log(`📁 Creating project: ${name}`);
        const data = await this.makeRequest('POST', '/projects', {
            name,
            description,
            purpose: 'Web Application',
            environment: 'Production'
        });
        console.log(`✅ Project created with ID: ${data.project.id}`);
        this.resources.project = data.project;
        return data.project;
    }

    async assignResourcesToProject(projectId, resources) {
        console.log(`🔗 Assigning resources to project: ${projectId}`);
        await this.makeRequest('POST', `/projects/${projectId}/resources`, {
            resources: resources.map(r => ({ urn: r }))
        });
        console.log(`✅ Resources assigned to project`);
    }

    // Utility Methods
    async validateToken() {
        try {
            const data = await this.makeRequest('GET', '/account');
            console.log(`✅ API token valid for account: ${data.account.email}`);
            return true;
        } catch (error) {
            console.error(`❌ Invalid API token: ${error.message}`);
            return false;
        }
    }

    async getRegions() {
        const data = await this.makeRequest('GET', '/regions');
        return data.regions.filter(region => region.available);
    }

    async getSizes() {
        const data = await this.makeRequest('GET', '/sizes');
        return data.sizes.filter(size => size.available);
    }

    async getImages() {
        const data = await this.makeRequest('GET', '/images?type=distribution');
        return data.images;
    }

    // Resource cleanup
    async cleanupResources() {
        console.log('🧹 Starting resource cleanup...');
        
        const cleanup = [];
        
        if (this.resources.loadBalancer) {
            cleanup.push(this.deleteLoadBalancer(this.resources.loadBalancer.id));
        }
        
        if (this.resources.firewall) {
            cleanup.push(this.deleteFirewall(this.resources.firewall.id));
        }
        
        if (this.resources.droplet) {
            cleanup.push(this.deleteDroplet(this.resources.droplet.id));
        }
        
        if (this.resources.database) {
            cleanup.push(this.deleteDatabase(this.resources.database.id));
        }
        
        if (this.resources.domain) {
            cleanup.push(this.deleteDomain(this.resources.domain.name));
        }
        
        try {
            await Promise.all(cleanup);
            console.log('✅ All resources cleaned up successfully');
        } catch (error) {
            console.error('❌ Error during cleanup:', error.message);
            throw error;
        }
    }

    // Save deployment state
    async saveDeploymentState(filePath) {
        const state = {
            resources: this.resources,
            timestamp: new Date().toISOString()
        };
        await fs.writeFile(filePath, JSON.stringify(state, null, 2));
        console.log(`💾 Deployment state saved to: ${filePath}`);
    }

    // Load deployment state
    async loadDeploymentState(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            const state = JSON.parse(content);
            this.resources = state.resources;
            console.log(`📂 Deployment state loaded from: ${filePath}`);
            return state;
        } catch (error) {
            console.log(`⚠️ Could not load deployment state: ${error.message}`);
            return null;
        }
    }

    async deleteLoadBalancer(loadBalancerId) {
        console.log(`🗑️ Deleting load balancer: ${loadBalancerId}`);
        await this.makeRequest('DELETE', `/load_balancers/${loadBalancerId}`);
        console.log(`✅ Load balancer ${loadBalancerId} deleted`);
    }
}

module.exports = DigitalOceanAPI;