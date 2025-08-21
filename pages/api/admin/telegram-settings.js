import db from '../../../lib/database.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      // Get Telegram settings from database
      const settings = db.prepare('SELECT * FROM telegram_settings WHERE id = 1').get();
      
      if (!settings) {
        // Return default settings if none exist
        return res.status(200).json({
          success: true,
          settings: {
            botToken: '',
            chatId: '',
            enabledEvents: {
              // Support Events
              supportRequest: { enabled: false, timing: 'immediate' },
              supportReply: { enabled: false, timing: 'immediate' },
              
              // User Events
              newSignup: { enabled: false, timing: 'immediate' },
              newSubscription: { enabled: false, timing: 'immediate' },
              subscriptionCancelled: { enabled: false, timing: 'immediate' },
              
              // System Events
              systemError: { enabled: false, timing: 'immediate' },
              deploymentComplete: { enabled: false, timing: 'immediate' },
              platformUpdate: { enabled: false, timing: 'immediate' },
              
              // Analytics Reports
              dailyReport: { enabled: false, timing: '09:00' },
              weeklyReport: { enabled: false, timing: 'monday-09:00' },
              monthlyReport: { enabled: false, timing: '1st-09:00' },
              
              // Performance Alerts
              highCpuUsage: { enabled: false, timing: 'immediate' },
              highMemoryUsage: { enabled: false, timing: 'immediate' },
              apiRateLimit: { enabled: false, timing: 'immediate' }
            }
          }
        });
      }

      // Parse the JSON settings from database
      const parsedSettings = {
        botToken: settings.bot_token || '',
        chatId: settings.chat_id || '',
        enabledEvents: settings.enabled_events ? JSON.parse(settings.enabled_events) : {}
      };

      res.status(200).json({
        success: true,
        settings: parsedSettings
      });

    } catch (error) {
      console.error('Error fetching Telegram settings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch settings'
      });
    }
  } 
  else if (req.method === 'POST') {
    try {
      const { botToken, chatId, enabledEvents } = req.body;

      // Validate required fields
      if (!botToken || !chatId) {
        return res.status(400).json({
          success: false,
          error: 'Bot token and chat ID are required'
        });
      }

      // Create table if it doesn't exist
      db.prepare(`
        CREATE TABLE IF NOT EXISTS telegram_settings (
          id INTEGER PRIMARY KEY DEFAULT 1,
          bot_token TEXT NOT NULL,
          chat_id TEXT NOT NULL,
          enabled_events TEXT DEFAULT '{}',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();

      // Insert or update settings
      const upsertQuery = db.prepare(`
        INSERT INTO telegram_settings (id, bot_token, chat_id, enabled_events, updated_at)
        VALUES (1, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
          bot_token = excluded.bot_token,
          chat_id = excluded.chat_id,
          enabled_events = excluded.enabled_events,
          updated_at = excluded.updated_at
      `);

      upsertQuery.run(botToken, chatId, JSON.stringify(enabledEvents));

      res.status(200).json({
        success: true,
        message: 'Settings saved successfully'
      });

    } catch (error) {
      console.error('Error saving Telegram settings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to save settings'
      });
    }
  } 
  else {
    res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }
}