import { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';

export default function TelegramSettings() {
  const [settings, setSettings] = useState({
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
  });
  
  const [testMessage, setTestMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/telegram-settings');
      const data = await response.json();
      if (data.success && data.settings) {
        setSettings(prev => ({
          ...prev,
          ...data.settings
        }));
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setMessage('');
    setError('');
    
    try {
      const response = await fetch('/api/admin/telegram-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });
      
      const data = await response.json();
      if (data.success) {
        setMessage('Settings saved successfully!');
      } else {
        setError(data.error || 'Failed to save settings');
      }
    } catch (err) {
      setError('Failed to save settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const testTelegramBot = async () => {
    setLoading(true);
    setMessage('');
    setError('');
    
    try {
      const response = await fetch('/api/admin/telegram-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          botToken: settings.botToken,
          chatId: settings.chatId,
          message: testMessage || 'Test message from your SaaS platform! 🚀'
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        setMessage('Test message sent successfully! ✅');
      } else {
        setError(data.error || 'Failed to send test message');
      }
    } catch (err) {
      setError('Failed to send test message: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateEventSetting = (eventKey, field, value) => {
    setSettings(prev => ({
      ...prev,
      enabledEvents: {
        ...prev.enabledEvents,
        [eventKey]: {
          ...prev.enabledEvents[eventKey],
          [field]: value
        }
      }
    }));
  };

  const eventCategories = [
    {
      name: 'Support Events',
      description: 'Get notified about support requests and replies',
      events: {
        supportRequest: 'New Support Request',
        supportReply: 'Support Message Reply'
      }
    },
    {
      name: 'User Events', 
      description: 'Track user signups and subscription changes',
      events: {
        newSignup: 'New User Signup',
        newSubscription: 'New Subscription',
        subscriptionCancelled: 'Subscription Cancelled'
      }
    },
    {
      name: 'System Events',
      description: 'Monitor system health and updates',
      events: {
        systemError: 'System Error',
        deploymentComplete: 'Deployment Complete',
        platformUpdate: 'Platform Update'
      }
    },
    {
      name: 'Analytics Reports',
      description: 'Scheduled reports with key metrics',
      events: {
        dailyReport: 'Daily Analytics Report',
        weeklyReport: 'Weekly Analytics Report',
        monthlyReport: 'Monthly Analytics Report'
      }
    },
    {
      name: 'Performance Alerts',
      description: 'Get alerted about performance issues',
      events: {
        highCpuUsage: 'High CPU Usage',
        highMemoryUsage: 'High Memory Usage',
        apiRateLimit: 'API Rate Limit Hit'
      }
    }
  ];

  return (
    <AdminLayout title="Telegram Settings">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Telegram Notifications</h1>
          <p className="text-slate-400 mt-1">
            Configure Telegram bot notifications for events, support, and analytics
          </p>
        </div>

        {/* Bot Configuration */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-slate-200 mb-4">Bot Configuration</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Bot Token
              </label>
              <input
                type="password"
                value={settings.botToken}
                onChange={(e) => setSettings(prev => ({ ...prev, botToken: e.target.value }))}
                placeholder="Enter your Telegram bot token..."
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <p className="text-xs text-slate-400 mt-1">
                Get a bot token from @BotFather on Telegram
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Chat ID (Your User ID)
              </label>
              <input
                type="text"
                value={settings.chatId}
                onChange={(e) => setSettings(prev => ({ ...prev, chatId: e.target.value }))}
                placeholder="Enter your Telegram user ID..."
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <p className="text-xs text-slate-400 mt-1">
                Get your user ID from @userinfobot on Telegram
              </p>
            </div>
          </div>
        </div>

        {/* Test Bot */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-slate-200 mb-4">Test Bot Connection</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Test Message
              </label>
              <textarea
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder="Test message from your SaaS platform! 🚀"
                rows={3}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            
            <button
              onClick={testTelegramBot}
              disabled={loading || !settings.botToken || !settings.chatId}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              {loading ? 'Sending...' : 'Send Test Message'}
            </button>
          </div>
        </div>

        {/* Event Configuration */}
        <div className="space-y-6">
          {eventCategories.map((category, categoryIndex) => (
            <div key={categoryIndex} className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-slate-200 mb-2">{category.name}</h2>
              <p className="text-slate-400 text-sm mb-4">{category.description}</p>
              
              <div className="space-y-4">
                {Object.entries(category.events).map(([eventKey, eventName]) => {
                  const eventConfig = settings.enabledEvents[eventKey];
                  const isReport = eventKey.includes('Report');
                  
                  return (
                    <div key={eventKey} className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={eventConfig?.enabled || false}
                            onChange={(e) => updateEventSetting(eventKey, 'enabled', e.target.checked)}
                            className="w-4 h-4 text-emerald-600 bg-slate-600 border-slate-500 rounded focus:ring-emerald-500"
                          />
                          <span className="text-slate-200 font-medium">{eventName}</span>
                        </label>
                      </div>
                      
                      {eventConfig?.enabled && (
                        <div className="flex items-center space-x-3">
                          {isReport ? (
                            <select
                              value={eventConfig.timing}
                              onChange={(e) => updateEventSetting(eventKey, 'timing', e.target.value)}
                              className="px-3 py-1 bg-slate-600 border border-slate-500 rounded text-slate-200 text-sm"
                            >
                              {eventKey === 'dailyReport' && (
                                <>
                                  <option value="09:00">09:00 Daily</option>
                                  <option value="12:00">12:00 Daily</option>
                                  <option value="18:00">18:00 Daily</option>
                                  <option value="21:00">21:00 Daily</option>
                                </>
                              )}
                              {eventKey === 'weeklyReport' && (
                                <>
                                  <option value="monday-09:00">Monday 09:00</option>
                                  <option value="sunday-18:00">Sunday 18:00</option>
                                  <option value="friday-17:00">Friday 17:00</option>
                                </>
                              )}
                              {eventKey === 'monthlyReport' && (
                                <>
                                  <option value="1st-09:00">1st of month 09:00</option>
                                  <option value="last-18:00">Last day 18:00</option>
                                </>
                              )}
                            </select>
                          ) : (
                            <select
                              value={eventConfig.timing}
                              onChange={(e) => updateEventSetting(eventKey, 'timing', e.target.value)}
                              className="px-3 py-1 bg-slate-600 border border-slate-500 rounded text-slate-200 text-sm"
                            >
                              <option value="immediate">Immediate</option>
                              <option value="batch-hourly">Batch Hourly</option>
                              <option value="batch-daily">Batch Daily</option>
                            </select>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Save Button */}
        <div className="flex justify-between items-center">
          <div>
            {message && (
              <div className="text-green-400 text-sm">{message}</div>
            )}
            {error && (
              <div className="text-red-400 text-sm">{error}</div>
            )}
          </div>
          
          <button
            onClick={saveSettings}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-8 py-3 rounded-lg font-medium transition-colors"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

        {/* Setup Instructions */}
        <div className="bg-blue-900/20 border border-blue-600/30 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-300 mb-4">Setup Instructions</h3>
          <div className="text-blue-200/80 space-y-3 text-sm">
            <div className="flex items-start space-x-3">
              <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5">1</span>
              <div>
                <strong>Create a Bot:</strong> Message @BotFather on Telegram, send /newbot, choose a name and username for your bot
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5">2</span>
              <div>
                <strong>Get Bot Token:</strong> Copy the bot token from @BotFather and paste it above
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5">3</span>
              <div>
                <strong>Get Your User ID:</strong> Message @userinfobot on Telegram to get your user ID
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5">4</span>
              <div>
                <strong>Start Your Bot:</strong> Search for your bot on Telegram and send /start to activate it
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5">5</span>
              <div>
                <strong>Test Connection:</strong> Use the test message feature above to verify everything works
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}