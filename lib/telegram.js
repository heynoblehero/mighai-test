import db from './database.js';

class TelegramNotifier {
  constructor() {
    this.settings = null;
    this.loadSettings();
  }

  loadSettings() {
    try {
      const settings = db.prepare('SELECT * FROM telegram_settings WHERE id = 1').get();
      if (settings && settings.bot_token && settings.chat_id) {
        this.settings = {
          botToken: settings.bot_token,
          chatId: settings.chat_id,
          enabledEvents: settings.enabled_events ? JSON.parse(settings.enabled_events) : {}
        };
      }
    } catch (error) {
      console.error('Error loading Telegram settings:', error);
      this.settings = null;
    }
  }

  async sendMessage(text, parseMode = 'Markdown') {
    if (!this.settings || !this.settings.botToken || !this.settings.chatId) {
      console.log('Telegram notification skipped - not configured');
      return { success: false, error: 'Not configured' };
    }

    try {
      const response = await fetch(`https://api.telegram.org/bot${this.settings.botToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: this.settings.chatId,
          text: text,
          parse_mode: parseMode
        })
      });

      const result = await response.json();

      if (result.ok) {
        return { success: true, result };
      } else {
        console.error('Telegram API error:', result);
        return { success: false, error: result.description };
      }
    } catch (error) {
      console.error('Error sending Telegram message:', error);
      return { success: false, error: error.message };
    }
  }

  isEventEnabled(eventType) {
    if (!this.settings || !this.settings.enabledEvents) return false;
    return this.settings.enabledEvents[eventType]?.enabled === true;
  }

  getEventTiming(eventType) {
    if (!this.settings || !this.settings.enabledEvents) return 'immediate';
    return this.settings.enabledEvents[eventType]?.timing || 'immediate';
  }

  async sendNotification(eventType, data) {
    // Refresh settings in case they were updated
    this.loadSettings();

    if (!this.isEventEnabled(eventType)) {
      return { success: false, error: 'Event not enabled' };
    }

    const timing = this.getEventTiming(eventType);

    // For immediate notifications, send now
    if (timing === 'immediate') {
      const message = this.formatMessage(eventType, data);
      return await this.sendMessage(message);
    } else {
      // For batch/scheduled notifications, store in queue
      return await this.queueNotification(eventType, data, timing);
    }
  }

  async queueNotification(eventType, data, timing) {
    try {
      // Create notifications queue table if it doesn't exist
      db.prepare(`
        CREATE TABLE IF NOT EXISTS notification_queue (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          event_type TEXT NOT NULL,
          data TEXT NOT NULL,
          timing TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          processed BOOLEAN DEFAULT FALSE
        )
      `).run();

      // Insert notification into queue
      db.prepare(`
        INSERT INTO notification_queue (event_type, data, timing)
        VALUES (?, ?, ?)
      `).run(eventType, JSON.stringify(data), timing);

      return { success: true, queued: true };
    } catch (error) {
      console.error('Error queueing notification:', error);
      return { success: false, error: error.message };
    }
  }

  formatMessage(eventType, data) {
    const formatters = {
      supportRequest: (data) => `🆘 **New Support Request**\n\n` +
        `**From:** ${data.email}\n` +
        `**Subject:** ${data.subject}\n` +
        `**Message:** ${data.message.substring(0, 200)}${data.message.length > 200 ? '...' : ''}\n\n` +
        `View in admin panel to respond.`,

      supportReply: (data) => `💬 **Support Reply Sent**\n\n` +
        `**To:** ${data.email}\n` +
        `**Subject:** ${data.subject}\n\n` +
        `Response has been sent successfully.`,

      newSignup: (data) => `👥 **New User Signup**\n\n` +
        `**User:** ${data.username}\n` +
        `**Email:** ${data.email}\n` +
        `**Plan:** ${data.plan || 'Free'}\n\n` +
        `Welcome to the platform! 🎉`,

      newSubscription: (data) => `💳 **New Subscription**\n\n` +
        `**User:** ${data.username}\n` +
        `**Plan:** ${data.plan}\n` +
        `**Amount:** $${data.amount}\n\n` +
        `Ka-ching! 💰`,

      subscriptionCancelled: (data) => `❌ **Subscription Cancelled**\n\n` +
        `**User:** ${data.username}\n` +
        `**Plan:** ${data.plan}\n` +
        `**Reason:** ${data.reason || 'Not specified'}\n\n` +
        `Consider reaching out to understand why.`,

      systemError: (data) => `🚨 **System Error Detected**\n\n` +
        `**Error:** ${data.error}\n` +
        `**Path:** ${data.path || 'Unknown'}\n` +
        `**Time:** ${new Date(data.timestamp).toLocaleString()}\n\n` +
        `Please investigate immediately!`,

      deploymentComplete: (data) => `🚀 **Deployment Complete**\n\n` +
        `**Version:** ${data.version || 'Latest'}\n` +
        `**Status:** ${data.status}\n` +
        `**Duration:** ${data.duration || 'Unknown'}\n\n` +
        `Platform is now updated and running! ✅`,

      platformUpdate: (data) => `🔄 **Platform Update**\n\n` +
        `**From:** ${data.fromVersion}\n` +
        `**To:** ${data.toVersion}\n` +
        `**Status:** ${data.status}\n\n` +
        `Update completed successfully! 🎯`,

      highCpuUsage: (data) => `⚡ **High CPU Usage Alert**\n\n` +
        `**Current Usage:** ${data.usage}%\n` +
        `**Threshold:** ${data.threshold}%\n` +
        `**Duration:** ${data.duration}\n\n` +
        `Server performance may be affected.`,

      highMemoryUsage: (data) => `🧠 **High Memory Usage Alert**\n\n` +
        `**Current Usage:** ${data.usage}%\n` +
        `**Threshold:** ${data.threshold}%\n` +
        `**Available:** ${data.available}\n\n` +
        `Consider scaling or optimization.`,

      apiRateLimit: (data) => `🚦 **API Rate Limit Hit**\n\n` +
        `**Endpoint:** ${data.endpoint}\n` +
        `**Client:** ${data.client}\n` +
        `**Limit:** ${data.limit} req/min\n\n` +
        `Traffic is being throttled.`,

      // Analytics reports will be formatted separately
      dailyReport: (data) => this.formatAnalyticsReport('Daily', data),
      weeklyReport: (data) => this.formatAnalyticsReport('Weekly', data),
      monthlyReport: (data) => this.formatAnalyticsReport('Monthly', data)
    };

    const formatter = formatters[eventType];
    if (formatter) {
      return formatter(data);
    } else {
      return `📢 **${eventType}**\n\n${JSON.stringify(data, null, 2)}`;
    }
  }

  formatAnalyticsReport(period, data) {
    return `📊 **${period} Analytics Report**\n\n` +
      `**Period:** ${data.startDate} - ${data.endDate}\n\n` +
      `**👥 Users:**\n` +
      `• New Signups: ${data.newSignups || 0}\n` +
      `• Total Active: ${data.activeUsers || 0}\n` +
      `• Free Users: ${data.freeUsers || 0}\n` +
      `• Paid Users: ${data.paidUsers || 0}\n\n` +
      `**💰 Revenue:**\n` +
      `• New Subscriptions: ${data.newSubscriptions || 0}\n` +
      `• Total Revenue: $${data.totalRevenue || 0}\n` +
      `• MRR: $${data.mrr || 0}\n\n` +
      `**📈 Growth:**\n` +
      `• User Growth: ${data.userGrowth > 0 ? '+' : ''}${data.userGrowth || 0}%\n` +
      `• Revenue Growth: ${data.revenueGrowth > 0 ? '+' : ''}${data.revenueGrowth || 0}%\n\n` +
      `Keep up the great work! 🎯`;
  }

  // Method to process queued notifications (to be called by cron job)
  async processQueue() {
    this.loadSettings();

    if (!this.settings) {
      console.log('Telegram not configured, skipping queue processing');
      return;
    }

    try {
      const queuedNotifications = db.prepare(`
        SELECT * FROM notification_queue 
        WHERE processed = FALSE
        ORDER BY created_at ASC
      `).all();

      for (const notification of queuedNotifications) {
        const data = JSON.parse(notification.data);
        const message = this.formatMessage(notification.event_type, data);
        
        const result = await this.sendMessage(message);
        
        if (result.success) {
          // Mark as processed
          db.prepare('UPDATE notification_queue SET processed = TRUE WHERE id = ?').run(notification.id);
          console.log(`Processed notification ${notification.id} (${notification.event_type})`);
        } else {
          console.error(`Failed to process notification ${notification.id}:`, result.error);
        }

        // Add delay between messages to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error('Error processing notification queue:', error);
    }
  }
}

// Create singleton instance
const telegramNotifier = new TelegramNotifier();

// Export both the class and instance
export { TelegramNotifier };
export default telegramNotifier;