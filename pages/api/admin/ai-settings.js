import fs from 'fs';
import path from 'path';

const SETTINGS_FILE = path.join(process.cwd(), 'data', 'ai-settings.json');

// Ensure data directory exists
const dataDir = path.dirname(SETTINGS_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const defaultSettings = {
  claude_api_key: '',
  claude_model: 'claude-3-5-sonnet-20241022',
  max_tokens: 4000,
  temperature: 0.1,
  daytona_enabled: false,
  daytona_workspace_url: '',
  auto_preview: true,
  cost_limit_monthly: 100,
  current_month_usage: 0,
  last_reset_date: new Date().toISOString()
};

function getSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
      return { ...defaultSettings, ...JSON.parse(data) };
    }
    return defaultSettings;
  } catch (error) {
    console.error('Error reading AI settings:', error);
    return defaultSettings;
  }
}

function saveSettings(settings) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving AI settings:', error);
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const settings = getSettings();
      // Don't return the full API key for security
      const safeSettings = {
        ...settings,
        claude_api_key: settings.claude_api_key ? '••••••••••••••••' + settings.claude_api_key.slice(-4) : ''
      };
      res.status(200).json(safeSettings);
    } catch (error) {
      console.error('Failed to get AI settings:', error);
      res.status(500).json({ error: 'Failed to retrieve AI settings' });
    }
  } else if (req.method === 'POST') {
    try {
      const newSettings = { ...getSettings(), ...req.body };
      
      // Reset monthly usage if it's a new month
      const currentDate = new Date();
      const lastReset = new Date(newSettings.last_reset_date);
      if (currentDate.getMonth() !== lastReset.getMonth() || 
          currentDate.getFullYear() !== lastReset.getFullYear()) {
        newSettings.current_month_usage = 0;
        newSettings.last_reset_date = currentDate.toISOString();
      }

      if (saveSettings(newSettings)) {
        res.status(200).json({ success: true, message: 'AI settings saved successfully' });
      } else {
        res.status(500).json({ error: 'Failed to save AI settings' });
      }
    } catch (error) {
      console.error('Failed to save AI settings:', error);
      res.status(500).json({ error: 'Failed to save AI settings' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).json({ error: 'Method not allowed' });
  }
}