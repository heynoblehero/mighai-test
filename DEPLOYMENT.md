# 🚀 Portable DigitalOcean Deployment

Automated infrastructure deployment for your Next.js CMS on DigitalOcean with full automation for domain setup, SSL certificates, database, and monitoring.

## ✨ Features

- **🏗️ Complete Infrastructure Automation**: Droplet, database, firewall, domain, SSL
- **🔧 Interactive Setup**: Guided questionnaire for configuration
- **🌐 Domain & SSL**: Automatic DNS and Let's Encrypt certificate setup
- **🗄️ Database Options**: Managed PostgreSQL or local database
- **📊 Monitoring**: Optional server monitoring and alerts
- **🛡️ Security**: Firewall, fail2ban, and security best practices
- **🧹 Easy Cleanup**: One-command resource removal
- **💰 Cost Optimization**: Choose your server size and features

## 📋 Prerequisites

- **DigitalOcean Account**: With API token ([Get one here](https://cloud.digitalocean.com/account/api/tokens))
- **Node.js 16+**: For running the deployment scripts
- **System Tools**: SSH, rsync, curl (usually pre-installed)
- **Domain Name**: Optional but recommended for SSL
- **SSH Key**: Optional but recommended for server access

## 🚀 Quick Start

### Option 1: One-Command Deployment (Recommended)

```bash
node portable-deploy.js
```

This single command will:
1. ✅ Check prerequisites and install dependencies
2. ✅ Run interactive questionnaire
3. ✅ Deploy complete infrastructure
4. ✅ Configure your application
5. ✅ Provide access URLs and credentials

### Option 2: Step-by-Step Deployment

```bash
# 1. Run questionnaire to generate configuration
node deploy-questionnaire.js

# 2. Deploy infrastructure and application
node deploy.js

# 3. Clean up resources (when needed)
node cleanup.js
```

## 📝 Configuration Options

The questionnaire will ask about:

### Basic Information
- **Project Name**: Used for naming resources
- **Domain**: Your custom domain (optional)
- **DigitalOcean API Token**: For infrastructure management

### Infrastructure
- **Server Size**: 
  - Basic ($6/month): 1GB RAM, 1 CPU - Good for small projects
  - Professional ($12/month): 2GB RAM, 1 CPU - Recommended
  - Business ($24/month): 4GB RAM, 2 CPUs - High traffic
- **Region**: Choose closest to your users
- **Database**: Managed ($15/month) or local (included)

### Security & Features
- **SSH Key**: For secure server access
- **SSL Certificate**: Automatic Let's Encrypt setup
- **Monitoring**: Server health monitoring
- **Backups**: Automatic backup configuration

### Application Setup
- **Admin Credentials**: Email and password for admin access
- **Email Configuration**: SMTP settings for notifications
- **Payment Integration**: Lemon Squeezy configuration

## 🏗️ Infrastructure Created

Your deployment creates:

### Core Infrastructure
```
🖥️ Droplet (Ubuntu 22.04)
   ├── Node.js 18 & Next.js application
   ├── Nginx reverse proxy
   ├── PostgreSQL database (if local)
   ├── SSL certificate (Let's Encrypt)
   └── Security (UFW firewall, fail2ban)

🗄️ Database (Optional Managed)
   ├── PostgreSQL 15
   ├── 1GB+ RAM
   ├── Automated backups
   └── SSL connections

🛡️ Firewall Rules
   ├── SSH (port 22)
   ├── HTTP (port 80)
   ├── HTTPS (port 443)
   └── Outbound connections

🌐 Domain & DNS (If configured)
   ├── A record pointing to droplet
   ├── WWW subdomain
   └── SSL certificate
```

### Security Features
- **Firewall**: UFW with minimal required ports
- **Fail2ban**: Automatic IP blocking for failed logins
- **SSL**: Let's Encrypt certificate with auto-renewal
- **Updates**: Automatic security updates
- **User Access**: Dedicated deploy user with sudo access

## 💰 Cost Breakdown

| Component | Basic | Professional | Business |
|-----------|-------|--------------|----------|
| Droplet | $6/month | $12/month | $24/month |
| Managed DB | - | $15/month | $15/month |
| Backups | - | $0.60/month | $1.20/month |
| **Total** | **$6/month** | **$27.60/month** | **$40.20/month** |

*Local database option reduces costs but managed DB provides better performance and automatic backups.*

## 🎯 Access Your Deployment

After successful deployment, you'll receive:

```
🎉 Deployment completed successfully!
═══════════════════════════════════════════════════════════

🚀 Server IP: 142.93.XXX.XXX
🌐 Website: https://yourdomain.com
🌐 Website (www): https://www.yourdomain.com
👤 Admin Panel: https://yourdomain.com/admin
📧 Admin Email: admin@yourdomain.com
🔑 Admin Password: [generated-password]
🗄️ Database: DigitalOcean Managed PostgreSQL

═══════════════════════════════════════════════════════════
📋 Next Steps:
1. Visit your website and verify it's working
2. Log into the admin panel and customize your content
3. Configure your domain's nameservers if using external DNS
4. Set up regular backups for your data
5. Monitor your server resources and scale as needed

🎯 Your CMS is now live and ready to use!
```

## 🔧 Command Line Options

```bash
# Full deployment with interactive setup
node portable-deploy.js

# Deploy with existing configuration
node portable-deploy.js --config deployment-config.json

# Clean up all resources
node portable-deploy.js --cleanup

# Show help
node portable-deploy.js --help

# Show version
node portable-deploy.js --version
```

## 🛠️ Advanced Usage

### Using Existing Configuration

If you have a saved configuration file:

```bash
node deploy.js deployment-config.json
```

### Manual Resource Management

Clean up specific resources:

```bash
node cleanup.js
```

### SSH Access to Server

If you configured an SSH key:

```bash
ssh deploy@YOUR_DROPLET_IP
```

### Database Access

For managed database:
```bash
# Connection details are in deployment-state.json
psql "YOUR_DATABASE_CONNECTION_STRING"
```

For local database:
```bash
ssh deploy@YOUR_DROPLET_IP
sudo -u postgres psql YOUR_DATABASE_NAME
```

## 📊 Monitoring & Maintenance

### Health Checks

Your deployment includes:
- **Application Health**: `/health` endpoint
- **Database Health**: Connection monitoring
- **SSL Monitoring**: Certificate expiration tracking
- **Server Resources**: CPU, memory, disk usage

### Backups

**Managed Database**: Automatic daily backups with 7-day retention

**Local Database**: Manual backup script created at `/var/www/your-project/backup.sh`

### SSL Certificate Renewal

Let's Encrypt certificates auto-renew via cron job:
```bash
0 12 * * * /usr/bin/certbot renew --quiet
```

### Log Files

Important logs on your server:
```bash
/var/log/nextjs-app.out.log    # Application stdout
/var/log/nextjs-app.err.log    # Application errors
/var/log/nginx/access.log      # Web server access
/var/log/nginx/error.log       # Web server errors
```

## 🧹 Cleanup & Removal

### Complete Cleanup

Remove all created resources:

```bash
node cleanup.js
```

This will ask for confirmation and delete:
- ✅ Droplet and all data
- ✅ Managed database (if created)
- ✅ Firewall rules
- ✅ SSL certificates
- ✅ Load balancer (if created)
- ⚠️ Domain (optional - you choose)
- ⚠️ SSH key (optional - you choose)

### Partial Cleanup

You can choose to keep certain resources like domains and SSH keys for future use.

## 🔍 Troubleshooting

### Common Issues

**API Token Errors**
```
❌ Error: Invalid DigitalOcean API token
```
- Verify token is correct and has required permissions
- Check token isn't expired
- Ensure account has sufficient credit

**SSH Connection Issues**
```
❌ Error: Droplet failed to become ready
```
- Check your SSH key is valid
- Verify droplet region is available
- Wait longer for cloud-init to complete

**Domain/DNS Issues**
```
❌ Error: Domain setup failed
```
- Verify domain ownership
- Check if domain is already managed by DigitalOcean
- Ensure nameservers point to DigitalOcean

**Resource Quota Issues**
```
❌ Error: Quota exceeded
```
- Check DigitalOcean account limits
- Verify billing information
- Contact DigitalOcean support for limit increases

### Debug Information

Check these files for debugging:
- `deployment-config.json`: Your configuration
- `deployment-state.json`: Current deployment state
- `deploy-package/`: Local application package

### Recovery Options

**Partial Deployment Failure**
```bash
# Clean up and retry
node cleanup.js
node portable-deploy.js --config deployment-config.json
```

**Application Issues**
```bash
# Redeploy application only
ssh deploy@YOUR_DROPLET_IP
cd /var/www/your-project
git pull  # if using git
npm install
sudo supervisorctl restart nextjs-app
```

## 📞 Support & Contributing

### Getting Help

1. **Check Logs**: Review deployment logs in `deployment-state.json`
2. **Common Issues**: See troubleshooting section above
3. **DigitalOcean Docs**: [Official documentation](https://docs.digitalocean.com/)
4. **Community Support**: Create an issue in the repository

### Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### License

This project is licensed under the ISC License - see the LICENSE file for details.

## 📚 Additional Resources

- [DigitalOcean API Documentation](https://docs.digitalocean.com/reference/api/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Nginx Configuration Guide](https://nginx.org/en/docs/)

---

**🎉 Happy Deploying! Your Next.js CMS will be live in minutes, not hours.**