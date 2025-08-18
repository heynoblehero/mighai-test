import fs from 'fs';
import path from 'path';

const RESERVED_PAGES_DIR = path.join(process.cwd(), 'data', 'reserved-pages');

function getReservedPage(pageType) {
  try {
    const filePath = path.join(RESERVED_PAGES_DIR, `${pageType}.json`);
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error(`Error reading reserved page ${pageType}:`, error);
    return null;
  }
}

function getOriginalPagePath(pageType) {
  const pageMapping = {
    'customer-login': '/pages/subscribe/login.js',
    'customer-signup': '/pages/subscribe/signup.js',
    'customer-dashboard': '/pages/dashboard/index.js',
    'customer-profile': '/pages/dashboard/profile.js',
    'customer-billing': '/pages/dashboard/upgrade.js',
    'password-reset': null // This doesn't exist yet
  };
  
  return pageMapping[pageType];
}

function generateMockData(pageType) {
  const mockData = {
    'customer-login': {
      user: null,
      redirectUrl: '/dashboard',
      messages: {
        welcome: 'Welcome back to your account',
        error: 'Invalid email or password'
      }
    },
    'customer-signup': {
      step: 'signup',
      user: null,
      messages: {
        welcome: 'Create your account to get started',
        otp_sent: 'Verification code sent to your email'
      }
    },
    'customer-dashboard': {
      user: {
        username: 'john_doe',
        email: 'john@example.com',
        role: 'subscriber',
        plan_name: 'Pro',
        price: 29,
        api_calls_used: 150,
        api_limit: 1000,
        page_views_used: 2500,
        page_view_limit: 10000
      },
      serviceConfig: {
        available: true,
        input_fields: [
          { name: 'query', type: 'text', label: 'Your Query', required: true },
          { name: 'format', type: 'select', label: 'Output Format', options: ['JSON', 'CSV', 'XML'] }
        ]
      },
      tasks: [
        {
          id: 1,
          task_id: 'task_abc123',
          status: 'completed',
          created_at: new Date().toISOString()
        },
        {
          id: 2,
          task_id: 'task_def456', 
          status: 'failed',
          error_message: 'Invalid input format',
          created_at: new Date().toISOString()
        }
      ]
    },
    'customer-profile': {
      user: {
        username: 'john_doe',
        email: 'john@example.com',
        role: 'subscriber'
      }
    },
    'customer-billing': {
      currentUser: {
        username: 'john_doe',
        plan_name: 'Starter',
        api_calls_used: 150,
        api_limit: 500,
        page_views_used: 1200,
        page_view_limit: 5000
      },
      plans: [
        {
          id: 1,
          name: 'pro',
          price: 29,
          api_limit: 1000,
          page_view_limit: 10000,
          is_active: true
        },
        {
          id: 2,
          name: 'enterprise',
          price: 99,
          api_limit: 5000,
          page_view_limit: 50000,
          is_active: true
        }
      ]
    },
    'password-reset': {
      step: 'email',
      messages: {
        instruction: 'Enter your email address and we\'ll send you a reset link'
      }
    }
  };

  return mockData[pageType] || {};
}

function injectMockData(htmlCode, mockData) {
  // This function would inject mock data into the HTML for realistic previewing
  // For now, we'll just return the HTML as-is since the preview iframe handles this
  
  // In a more advanced implementation, you could:
  // 1. Parse the HTML to find data-binding points
  // 2. Replace placeholder values with mock data
  // 3. Simulate API responses by replacing fetch calls
  
  return htmlCode;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { pageType, mode = 'custom' } = req.query;

  if (!pageType) {
    return res.status(400).json({ error: 'pageType is required' });
  }

  try {
    let htmlContent = '';
    let mockData = generateMockData(pageType);

    if (mode === 'custom') {
      // Get customized version if it exists
      const reservedPage = getReservedPage(pageType);
      if (reservedPage && reservedPage.html_code) {
        htmlContent = reservedPage.html_code;
      } else {
        return res.status(404).json({ error: 'No custom version found for this page type' });
      }
    } else if (mode === 'original') {
      // Get original version (this would require reading the original React components)
      // For now, return a placeholder
      htmlContent = `
        <html>
          <head>
            <title>Original ${pageType} Page</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
              .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
              .notice { background: #e3f2fd; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="notice">
                <strong>Original Version Preview</strong><br>
                This shows how the original ${pageType} page appears to users.
              </div>
              <p>The original page is implemented as a React component and cannot be directly previewed in this format.</p>
              <p>To see the original implementation, check the file: ${getOriginalPagePath(pageType)}</p>
            </div>
          </body>
        </html>
      `;
    }

    // Inject mock data for realistic preview
    const finalHtml = injectMockData(htmlContent, mockData);

    // Return HTML for iframe display
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(finalHtml);

  } catch (error) {
    console.error('Preview generation failed:', error);
    res.status(500).json({ error: 'Failed to generate preview: ' + error.message });
  }
}