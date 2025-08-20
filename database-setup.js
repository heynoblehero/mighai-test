const { Client } = require('pg');
const fs = require('fs').promises;
const path = require('path');

class DatabaseSetup {
    constructor(config, doAPI = null) {
        this.config = config;
        this.doAPI = doAPI;
        this.dbConnection = null;
    }

    async setupDatabase() {
        if (this.config.databaseType === 'managed') {
            return await this.setupManagedDatabase();
        } else {
            return await this.setupLocalDatabase();
        }
    }

    async setupManagedDatabase() {
        console.log('🗄️ Setting up DigitalOcean Managed Database...');
        
        if (!this.doAPI) {
            throw new Error('DigitalOcean API client required for managed database');
        }

        // Create managed database cluster
        const dbConfig = {
            name: `${this.config.projectName}-db`,
            engine: 'pg',
            version: '15',
            size: 'db-s-1vcpu-1gb',
            region: this.config.region,
            num_nodes: 1,
            tags: [this.config.projectName, 'postgresql', 'auto-deployed']
        };

        const database = await this.doAPI.createDatabase(dbConfig);
        
        // Create database and user
        await this.doAPI.createDatabaseDB(database.id, this.config.dbName);
        await this.doAPI.createDatabaseUser(database.id, this.config.dbUser);

        // Get connection details
        const dbDetails = await this.doAPI.getDatabase(database.id);
        
        const connectionString = `postgresql://${this.config.dbUser}:${dbDetails.users[0].password}@${dbDetails.connection.host}:${dbDetails.connection.port}/${this.config.dbName}?sslmode=require`;
        
        // Wait for database to be fully ready
        await this.waitForDatabaseConnection(connectionString);
        
        // Run database migrations
        await this.runMigrations(connectionString);
        
        console.log('✅ Managed database setup completed');
        
        return {
            type: 'managed',
            id: database.id,
            connectionString,
            host: dbDetails.connection.host,
            port: dbDetails.connection.port,
            database: this.config.dbName,
            username: this.config.dbUser,
            password: dbDetails.users[0].password
        };
    }

    async setupLocalDatabase() {
        console.log('🗄️ Setting up local PostgreSQL database...');
        
        // Database is setup via cloud-init script on the droplet
        // This method handles the application-level setup
        
        const connectionString = `postgresql://${this.config.dbUser}:${this.config.dbPassword}@localhost:5432/${this.config.dbName}`;
        
        console.log('✅ Local database setup completed');
        
        return {
            type: 'local',
            connectionString,
            host: 'localhost',
            port: 5432,
            database: this.config.dbName,
            username: this.config.dbUser,
            password: this.config.dbPassword
        };
    }

    async waitForDatabaseConnection(connectionString, maxRetries = 30) {
        console.log('⏳ Waiting for database to be ready...');
        
        for (let i = 0; i < maxRetries; i++) {
            try {
                const client = new Client(connectionString);
                await client.connect();
                await client.query('SELECT 1');
                await client.end();
                console.log('✅ Database connection established');
                return true;
            } catch (error) {
                console.log(`🔄 Attempt ${i + 1}/${maxRetries} - Database not ready yet, retrying...`);
                await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
            }
        }
        
        throw new Error('Database failed to become ready within expected time');
    }

    async runMigrations(connectionString) {
        console.log('🔄 Running database migrations...');
        
        const client = new Client(connectionString);
        
        try {
            await client.connect();
            
            // Create tables for the CMS
            await this.createUserTable(client);
            await this.createPageTable(client);
            await this.createPlanTable(client);
            await this.createSubscriptionTable(client);
            await this.createBlogPostTable(client);
            await this.createAnalyticsTable(client);
            await this.createSessionTable(client);
            
            // Insert default data
            await this.insertDefaultData(client);
            
            console.log('✅ Database migrations completed');
            
        } catch (error) {
            console.error('❌ Migration error:', error);
            throw error;
        } finally {
            await client.end();
        }
    }

    async createUserTable(client) {
        const query = `
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                name VARCHAR(255),
                role VARCHAR(50) DEFAULT 'USER',
                is_active BOOLEAN DEFAULT true,
                email_verified BOOLEAN DEFAULT false,
                last_login TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
            CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
        `;
        await client.query(query);
    }

    async createPageTable(client) {
        const query = `
            CREATE TABLE IF NOT EXISTS pages (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                slug VARCHAR(255) UNIQUE NOT NULL,
                content TEXT,
                meta_description TEXT,
                page_type VARCHAR(50) DEFAULT 'PUBLIC',
                is_published BOOLEAN DEFAULT false,
                author_id INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug);
            CREATE INDEX IF NOT EXISTS idx_pages_type ON pages(page_type);
            CREATE INDEX IF NOT EXISTS idx_pages_published ON pages(is_published);
        `;
        await client.query(query);
    }

    async createPlanTable(client) {
        const query = `
            CREATE TABLE IF NOT EXISTS plans (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                price DECIMAL(10,2) NOT NULL,
                billing_cycle VARCHAR(50) DEFAULT 'monthly',
                features JSONB,
                is_active BOOLEAN DEFAULT true,
                lemon_squeezy_variant_id VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;
        await client.query(query);
    }

    async createSubscriptionTable(client) {
        const query = `
            CREATE TABLE IF NOT EXISTS subscriptions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                plan_id INTEGER REFERENCES plans(id),
                status VARCHAR(50) DEFAULT 'active',
                lemon_squeezy_subscription_id VARCHAR(255),
                current_period_start TIMESTAMP,
                current_period_end TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
            CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
        `;
        await client.query(query);
    }

    async createBlogPostTable(client) {
        const query = `
            CREATE TABLE IF NOT EXISTS blog_posts (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                slug VARCHAR(255) UNIQUE NOT NULL,
                content TEXT,
                excerpt TEXT,
                featured_image VARCHAR(500),
                meta_description TEXT,
                tags JSONB,
                category VARCHAR(100),
                is_published BOOLEAN DEFAULT false,
                published_at TIMESTAMP,
                author_id INTEGER REFERENCES users(id),
                view_count INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
            CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(is_published);
            CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category);
        `;
        await client.query(query);
    }

    async createAnalyticsTable(client) {
        const query = `
            CREATE TABLE IF NOT EXISTS analytics (
                id SERIAL PRIMARY KEY,
                page_slug VARCHAR(255),
                user_id INTEGER REFERENCES users(id),
                ip_address INET,
                user_agent TEXT,
                referrer TEXT,
                event_type VARCHAR(100) DEFAULT 'page_view',
                event_data JSONB,
                session_id VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE INDEX IF NOT EXISTS idx_analytics_page ON analytics(page_slug);
            CREATE INDEX IF NOT EXISTS idx_analytics_date ON analytics(created_at);
            CREATE INDEX IF NOT EXISTS idx_analytics_event ON analytics(event_type);
        `;
        await client.query(query);
    }

    async createSessionTable(client) {
        const query = `
            CREATE TABLE IF NOT EXISTS sessions (
                session_id VARCHAR(255) PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                data JSONB,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
            CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
        `;
        await client.query(query);
    }

    async insertDefaultData(client) {
        console.log('📝 Inserting default data...');
        
        // Insert admin user
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(this.config.adminPassword, 10);
        
        await client.query(`
            INSERT INTO users (email, password, name, role, is_active, email_verified)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (email) DO NOTHING
        `, [
            this.config.adminEmail,
            hashedPassword,
            'Administrator',
            'ADMIN',
            true,
            true
        ]);

        // Insert default pages
        await client.query(`
            INSERT INTO pages (title, slug, content, page_type, is_published, author_id)
            VALUES 
                ($1, $2, $3, $4, $5, 1),
                ($6, $7, $8, $9, $10, 1),
                ($11, $12, $13, $14, $15, 1)
            ON CONFLICT (slug) DO NOTHING
        `, [
            'Welcome to Your CMS',
            'home',
            '<h1>Welcome to your new CMS!</h1><p>Your site is now live and ready for customization.</p>',
            'PUBLIC',
            true,
            'About Us',
            'about',
            '<h1>About Us</h1><p>Learn more about our company and mission.</p>',
            'PUBLIC',
            true,
            'Dashboard',
            'customer-dashboard',
            '<h1>Customer Dashboard</h1><p>Welcome to your exclusive customer area.</p>',
            'CUSTOMER',
            true
        ]);

        // Insert default pricing plan
        await client.query(`
            INSERT INTO plans (name, description, price, billing_cycle, features, is_active)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT DO NOTHING
        `, [
            'Basic Plan',
            'Access to all customer features',
            9.99,
            'monthly',
            JSON.stringify(['Access to customer portal', 'Premium content', 'Email support']),
            true
        ]);

        console.log('✅ Default data inserted');
    }

    // Health check method
    async checkDatabaseHealth(connectionString) {
        try {
            const client = new Client(connectionString);
            await client.connect();
            
            const result = await client.query('SELECT COUNT(*) as user_count FROM users');
            const userCount = result.rows[0].user_count;
            
            await client.end();
            
            return {
                status: 'healthy',
                userCount: parseInt(userCount),
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    // Backup method
    async createBackup(connectionString, backupPath) {
        console.log('💾 Creating database backup...');
        
        const backupFile = path.join(backupPath, `backup-${Date.now()}.sql`);
        
        // This would typically use pg_dump
        // For now, we'll create a simple backup script
        const backupScript = `#!/bin/bash
# Database backup script
export PGPASSWORD="${this.config.dbPassword}"
pg_dump -h ${this.config.databaseType === 'local' ? 'localhost' : 'managed_host'} \\
        -U ${this.config.dbUser} \\
        -d ${this.config.dbName} \\
        -f ${backupFile}
        
echo "Backup completed: ${backupFile}"
`;

        await fs.writeFile(path.join(backupPath, 'backup.sh'), backupScript, { mode: 0o755 });
        
        console.log(`✅ Backup script created at: ${backupPath}/backup.sh`);
        return backupFile;
    }
}

module.exports = DatabaseSetup;