const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database connection
const dbPath = path.join(process.cwd(), 'site_builder.db');

function getDb() {
  return new sqlite3.Database(dbPath);
}

// Get all logic pages with stats
async function getAllLogicPages() {
  const db = getDb();
  
  return new Promise((resolve, reject) => {
    // Get pages with execution counts
    const query = `
      SELECT 
        lp.*,
        COUNT(lpe.id) as execution_count
      FROM logic_pages lp
      LEFT JOIN logic_page_executions lpe ON lp.id = lpe.logic_page_id
      GROUP BY lp.id
      ORDER BY lp.updated_at DESC
    `;
    
    db.all(query, [], (err, pages) => {
      if (err) {
        db.close();
        reject(err);
        return;
      }
      
      // Get overall stats
      const statsQuery = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN is_active = 1 THEN 1 END) as active,
          COUNT(CASE WHEN access_level = 'public' THEN 1 END) as public,
          COUNT(CASE WHEN access_level = 'subscriber' THEN 1 END) as subscriber,
          (SELECT COUNT(*) FROM logic_page_executions) as totalExecutions
        FROM logic_pages
      `;
      
      db.get(statsQuery, [], (err, stats) => {
        db.close();
        if (err) {
          reject(err);
          return;
        }
        
        resolve({ pages, stats });
      });
    });
  });
}

// Get single logic page by ID
function getLogicPageById(pageId) {
  try {
    const query = `
      SELECT lp.*, 
        COUNT(lpe.id) as execution_count,
        GROUP_CONCAT(lpf.field_name) as field_names
      FROM logic_pages lp
      LEFT JOIN logic_page_executions lpe ON lp.id = lpe.logic_page_id
      LEFT JOIN logic_page_fields lpf ON lp.id = lpf.logic_page_id
      WHERE lp.id = ?
      GROUP BY lp.id
    `;
    
    return db.prepare(query).get(pageId);
  } catch (error) {
    throw error;
  }
}

// Create new logic page
async function createLogicPage(pageData, userId) {
  const db = getDb();
  
  return new Promise((resolve, reject) => {
    const {
      name, slug, description, access_level,
      frontend_config, backend_config, result_config,
      store_results, store_analytics, max_executions_per_user
    } = pageData;
    
    const query = `
      INSERT INTO logic_pages (
        name, slug, description, access_level,
        frontend_config, backend_config, result_config,
        store_results, store_analytics, max_executions_per_user,
        created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      name, slug, description, access_level,
      JSON.stringify(frontend_config),
      JSON.stringify(backend_config),
      JSON.stringify(result_config),
      store_results ? 1 : 0,
      store_analytics ? 1 : 0,
      max_executions_per_user,
      userId || 1
    ];
    
    db.run(query, params, function(err) {
      if (err) {
        db.close();
        reject(err);
        return;
      }
      
      const pageId = this.lastID;
      
      // Create initial version
      const versionQuery = `
        INSERT INTO logic_page_versions (
          logic_page_id, version_number, name,
          frontend_config, backend_config, result_config,
          change_summary, created_by
        ) VALUES (?, 1, ?, ?, ?, ?, 'Initial version', ?)
      `;
      
      db.run(versionQuery, [
        pageId, name,
        JSON.stringify(frontend_config),
        JSON.stringify(backend_config),
        JSON.stringify(result_config),
        userId || 1
      ], (err) => {
        if (err) {
          db.close();
          reject(err);
          return;
        }
        
        // Save fields to logic_page_fields table if they exist
        if (frontend_config && frontend_config.fields && frontend_config.fields.length > 0) {
          const fieldInsertQuery = `
            INSERT INTO logic_page_fields
            (logic_page_id, name, label, type, options,
             required, placeholder, description, order_index)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;

          let fieldsProcessed = 0;
          let hasFieldError = false;

          frontend_config.fields.forEach((field, index) => {
            if (hasFieldError) return;

            db.run(fieldInsertQuery, [
              pageId,
              field.field_name,
              field.field_label,
              field.field_type,
              field.field_options ? JSON.stringify(field.field_options) : null,
              field.is_required ? 1 : 0,
              field.placeholder || null,
              field.help_text || null,
              field.order_index || index
            ], (fieldErr) => {
              if (fieldErr && !hasFieldError) {
                hasFieldError = true;
                db.close();
                reject(fieldErr);
                return;
              }

              fieldsProcessed++;
              if (fieldsProcessed === frontend_config.fields.length) {
                db.close();
                resolve(pageId);
              }
            });
          });
        } else {
          db.close();
          resolve(pageId);
        }
      });
    });
  });
}

// Update logic page
function updateLogicPage(pageId, pageData, userId) {
  try {
    const {
      name, description, access_level,
      frontend_config, backend_config, result_config,
      store_results, store_analytics, max_executions_per_user,
      is_active
    } = pageData;
    
    // First get current version number
    const versionResult = db.prepare('SELECT MAX(version_number) as max_version FROM logic_page_versions WHERE logic_page_id = ?').get(pageId);
    const newVersion = (versionResult?.max_version || 0) + 1;
    
    // Update main record
    const updateQuery = `
      UPDATE logic_pages SET
        name = ?, description = ?, access_level = ?,
        frontend_config = ?, backend_config = ?, result_config = ?,
        store_results = ?, store_analytics = ?, max_executions_per_user = ?,
        is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    const updateParams = [
      name, description, access_level,
      JSON.stringify(frontend_config),
      JSON.stringify(backend_config),
      JSON.stringify(result_config),
      store_results ? 1 : 0,
      store_analytics ? 1 : 0,
      max_executions_per_user,
      is_active !== undefined ? (is_active ? 1 : 0) : 1,
      pageId
    ];
    
    db.prepare(updateQuery).run(updateParams);
    
    // Create new version if significant changes were made
    if (frontend_config || backend_config || result_config) {
      const versionQuery = `
        INSERT INTO logic_page_versions (
          logic_page_id, version_number, name,
          frontend_config, backend_config, result_config,
          change_summary, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, 'Updated via admin', ?)
      `;
      
      db.prepare(versionQuery).run([
        pageId, newVersion, name,
        JSON.stringify(frontend_config),
        JSON.stringify(backend_config),
        JSON.stringify(result_config),
        userId
      ]);
    }
    
    return true;
  } catch (error) {
    throw error;
  }
}

// Delete logic page
function deleteLogicPage(pageId) {
  try {
    const result = db.prepare('DELETE FROM logic_pages WHERE id = ?').run(pageId);
    return result.changes > 0;
  } catch (error) {
    throw error;
  }
}

export default async function handler(req, res) {
  try {
    // Skip auth check for now - we'll implement it properly later
    // if (!req.user || req.user.role !== 'admin') {
    //   return res.status(401).json({ success: false, error: 'Unauthorized' });
    // }

    const { method } = req;
    
    switch (method) {
      case 'GET':
        const data = await getAllLogicPages();
        return res.status(200).json({ 
          success: true, 
          pages: data.pages || [], 
          stats: data.stats || {} 
        });
        
      case 'POST':
        const pageData = req.body;
        if (!pageData) {
          return res.status(400).json({ success: false, error: 'Page data is required' });
        }

        // Validate required fields
        if (!pageData.name || !pageData.description || !pageData.slug) {
          return res.status(400).json({
            success: false,
            error: 'Name, description, and slug are required'
          });
        }

        // Convert inputs array to frontend_config.fields format
        const frontendConfig = pageData.frontend_config || {};
        if (pageData.inputs && Array.isArray(pageData.inputs)) {
          frontendConfig.fields = pageData.inputs.map((input, index) => ({
            field_name: input.name,
            field_label: input.label || input.name,
            field_type: input.type || 'text',
            field_options: input.options ? { choices: input.options } : null,
            is_required: input.required || false,
            placeholder: input.placeholder || '',
            help_text: input.description || '',
            order_index: index
          }));
        }

        // Format the data for the existing database structure
        const formattedPageData = {
          name: pageData.name,
          slug: pageData.slug,
          description: pageData.description,
          access_level: pageData.access_level || pageData.accessLevel || 'public',
          frontend_config: frontendConfig,
          backend_config: pageData.backend_config || {},
          result_config: pageData.result_config || {},
          store_results: true,
          store_analytics: true,
          max_executions_per_user: pageData.maxExecutions || 0
        };

        const newPageId = await createLogicPage(formattedPageData, req.user?.id || 1);
        return res.status(201).json({
          success: true,
          message: 'Logic page created successfully',
          pageId: newPageId
        });
        
      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Logic Pages API error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    });
  }
}