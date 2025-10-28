const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database connection
const dbPath = process.env.NODE_ENV === 'production' 
  ? '/tmp/site_builder.db' 
  : path.join(process.cwd(), 'site_builder.db');

function getDb() {
  return new sqlite3.Database(dbPath);
}

// Get user execution count for a logic page
async function getUserExecutionCount(slug, userId, sessionId) {
  const db = getDb();
  
  return new Promise((resolve, reject) => {
    // First get the page ID
    const pageQuery = 'SELECT id FROM logic_pages WHERE slug = ? AND is_active = 1';
    
    db.get(pageQuery, [slug], (err, page) => {
      if (err) {
        db.close();
        reject(err);
        return;
      }
      
      if (!page) {
        db.close();
        resolve(0); // Page not found, return 0 executions
        return;
      }
      
      // Get execution count
      let countQuery, params;
      
      if (userId) {
        countQuery = 'SELECT COUNT(*) as count FROM logic_page_executions WHERE logic_page_id = ? AND user_id = ?';
        params = [page.id, userId];
      } else if (sessionId) {
        countQuery = 'SELECT COUNT(*) as count FROM logic_page_executions WHERE logic_page_id = ? AND session_id = ?';
        params = [page.id, sessionId];
      } else {
        db.close();
        resolve(0);
        return;
      }
      
      db.get(countQuery, params, (err, result) => {
        db.close();
        if (err) {
          reject(err);
          return;
        }
        resolve(result.count || 0);
      });
    });
  });
}

// Get execution history for a user
async function getUserExecutions(slug, userId, sessionId, limit = 10) {
  const db = getDb();
  
  return new Promise((resolve, reject) => {
    // First get the page ID
    const pageQuery = 'SELECT id FROM logic_pages WHERE slug = ? AND is_active = 1';
    
    db.get(pageQuery, [slug], (err, page) => {
      if (err) {
        db.close();
        reject(err);
        return;
      }
      
      if (!page) {
        db.close();
        resolve([]);
        return;
      }
      
      // Get executions
      let executionsQuery, params;
      
      if (userId) {
        executionsQuery = `
          SELECT input_data, output_data, processing_time, tokens_used, 
                 cost_estimate, status, created_at
          FROM logic_page_executions 
          WHERE logic_page_id = ? AND user_id = ? 
          ORDER BY created_at DESC 
          LIMIT ?
        `;
        params = [page.id, userId, limit];
      } else if (sessionId) {
        executionsQuery = `
          SELECT input_data, output_data, processing_time, tokens_used, 
                 cost_estimate, status, created_at
          FROM logic_page_executions 
          WHERE logic_page_id = ? AND session_id = ? 
          ORDER BY created_at DESC 
          LIMIT ?
        `;
        params = [page.id, sessionId, limit];
      } else {
        db.close();
        resolve([]);
        return;
      }
      
      db.all(executionsQuery, params, (err, executions) => {
        db.close();
        if (err) {
          reject(err);
          return;
        }
        
        // Parse JSON data
        const parsedExecutions = executions.map(exec => {
          try {
            return {
              ...exec,
              input_data: JSON.parse(exec.input_data || '{}'),
              output_data: JSON.parse(exec.output_data || '{}')
            };
          } catch (e) {
            console.error('Error parsing execution data:', e);
            return exec;
          }
        });
        
        resolve(parsedExecutions);
      });
    });
  });
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { slug } = req.query;
  const { history = 'false', limit = 10 } = req.query;

  if (!slug) {
    return res.status(400).json({ success: false, error: 'Slug is required' });
  }

  try {
    const userId = req.user?.id;
    const sessionId = req.sessionID;
    
    if (history === 'true') {
      // Return execution history
      const executions = await getUserExecutions(slug, userId, sessionId, parseInt(limit));
      return res.status(200).json({ 
        success: true, 
        executions,
        count: executions.length 
      });
    } else {
      // Return just the count
      const count = await getUserExecutionCount(slug, userId, sessionId);
      return res.status(200).json({ 
        success: true, 
        count 
      });
    }

  } catch (error) {
    console.error('Error fetching executions:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    });
  }
}