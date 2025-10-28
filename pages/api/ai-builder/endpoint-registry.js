const sqlite3 = require('sqlite3').verbose();
const fs = require('fs').promises;

// Database connection
const dbPath = process.env.NODE_ENV === 'production'
  ? '/tmp/site_builder.db'
  : '/home/ishaan/Projects/mighai (copy)/site_builder.db';

function getDb() {
  return new sqlite3.Database(dbPath);
}

// Initialize endpoint registry tables
async function initializeTables() {
  const db = getDb();

  return new Promise((resolve, reject) => {
    // Create main endpoints table
    const createEndpointsTable = `
      CREATE TABLE IF NOT EXISTS ai_endpoints (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        path TEXT NOT NULL UNIQUE,
        file_path TEXT NOT NULL,
        methods TEXT NOT NULL, -- JSON array of supported methods
        code TEXT NOT NULL,
        status TEXT DEFAULT 'active', -- active, inactive, error
        version INTEGER DEFAULT 1,
        created_by INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_tested_at DATETIME,
        test_status TEXT, -- success, failed, pending
        usage_count INTEGER DEFAULT 0,
        error_count INTEGER DEFAULT 0,
        tags TEXT, -- JSON array of tags
        category TEXT DEFAULT 'general'
      )
    `;

    // Create endpoint execution logs table
    const createLogsTable = `
      CREATE TABLE IF NOT EXISTS ai_endpoint_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        endpoint_id INTEGER NOT NULL,
        method TEXT NOT NULL,
        status_code INTEGER,
        response_time INTEGER, -- in milliseconds
        error_message TEXT,
        request_data TEXT, -- JSON
        response_data TEXT, -- JSON
        user_agent TEXT,
        ip_address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (endpoint_id) REFERENCES ai_endpoints (id) ON DELETE CASCADE
      )
    `;

    // Create endpoint versions table for history
    const createVersionsTable = `
      CREATE TABLE IF NOT EXISTS ai_endpoint_versions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        endpoint_id INTEGER NOT NULL,
        version_number INTEGER NOT NULL,
        code TEXT NOT NULL,
        change_description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (endpoint_id) REFERENCES ai_endpoints (id) ON DELETE CASCADE
      )
    `;

    db.run(createEndpointsTable, (err) => {
      if (err) {
        db.close();
        reject(err);
        return;
      }

      db.run(createLogsTable, (err) => {
        if (err) {
          db.close();
          reject(err);
          return;
        }

        db.run(createVersionsTable, (err) => {
          db.close();
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    });
  });
}

// Get all endpoints with stats
async function getAllEndpoints(filters = {}) {
  const db = getDb();

  return new Promise((resolve, reject) => {
    let query = `
      SELECT
        e.*,
        COUNT(l.id) as total_calls,
        AVG(l.response_time) as avg_response_time,
        MAX(l.created_at) as last_call_at
      FROM ai_endpoints e
      LEFT JOIN ai_endpoint_logs l ON e.id = l.endpoint_id
    `;

    const conditions = [];
    const params = [];

    // Apply filters
    if (filters.status) {
      conditions.push('e.status = ?');
      params.push(filters.status);
    }

    if (filters.category) {
      conditions.push('e.category = ?');
      params.push(filters.category);
    }

    if (filters.search) {
      conditions.push('(e.name LIKE ? OR e.description LIKE ? OR e.path LIKE ?)');
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' GROUP BY e.id ORDER BY e.updated_at DESC';

    if (filters.limit) {
      query += ` LIMIT ${parseInt(filters.limit)}`;
    }

    db.all(query, params, (err, rows) => {
      if (err) {
        db.close();
        reject(err);
        return;
      }

      // Parse JSON fields and format data
      const endpoints = rows.map(row => ({
        ...row,
        methods: JSON.parse(row.methods || '[]'),
        tags: JSON.parse(row.tags || '[]'),
        total_calls: row.total_calls || 0,
        avg_response_time: Math.round(row.avg_response_time || 0)
      }));

      // Get overall stats
      const statsQuery = `
        SELECT
          COUNT(*) as total_endpoints,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_endpoints,
          COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_endpoints,
          COUNT(CASE WHEN status = 'error' THEN 1 END) as error_endpoints,
          SUM(usage_count) as total_usage,
          (SELECT COUNT(*) FROM ai_endpoint_logs) as total_calls
        FROM ai_endpoints
      `;

      db.get(statsQuery, [], (err, stats) => {
        db.close();
        if (err) {
          reject(err);
        } else {
          resolve({
            endpoints,
            stats: stats || {}
          });
        }
      });
    });
  });
}

// Get single endpoint by ID
async function getEndpointById(endpointId) {
  const db = getDb();

  return new Promise((resolve, reject) => {
    const query = `
      SELECT e.*,
        COUNT(l.id) as total_calls,
        AVG(l.response_time) as avg_response_time,
        MAX(l.created_at) as last_call_at
      FROM ai_endpoints e
      LEFT JOIN ai_endpoint_logs l ON e.id = l.endpoint_id
      WHERE e.id = ?
      GROUP BY e.id
    `;

    db.get(query, [endpointId], (err, row) => {
      if (err) {
        db.close();
        reject(err);
        return;
      }

      if (!row) {
        db.close();
        resolve(null);
        return;
      }

      const endpoint = {
        ...row,
        methods: JSON.parse(row.methods || '[]'),
        tags: JSON.parse(row.tags || '[]'),
        total_calls: row.total_calls || 0,
        avg_response_time: Math.round(row.avg_response_time || 0)
      };

      // Get recent logs
      const logsQuery = `
        SELECT * FROM ai_endpoint_logs
        WHERE endpoint_id = ?
        ORDER BY created_at DESC
        LIMIT 10
      `;

      db.all(logsQuery, [endpointId], (err, logs) => {
        if (err) {
          db.close();
          reject(err);
          return;
        }

        // Get version history
        const versionsQuery = `
          SELECT * FROM ai_endpoint_versions
          WHERE endpoint_id = ?
          ORDER BY version_number DESC
        `;

        db.all(versionsQuery, [endpointId], (err, versions) => {
          db.close();
          if (err) {
            reject(err);
          } else {
            endpoint.recent_logs = logs || [];
            endpoint.versions = versions || [];
            resolve(endpoint);
          }
        });
      });
    });
  });
}

// Update endpoint
async function updateEndpoint(endpointId, updates) {
  const db = getDb();

  return new Promise((resolve, reject) => {
    const allowedFields = [
      'name', 'description', 'status', 'tags', 'category', 'methods', 'code'
    ];

    const updateFields = [];
    const params = [];

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = ?`);
        if (key === 'methods' || key === 'tags') {
          params.push(JSON.stringify(updates[key]));
        } else {
          params.push(updates[key]);
        }
      }
    });

    if (updateFields.length === 0) {
      db.close();
      resolve(false);
      return;
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');

    // If code is being updated, increment version and create version history
    if (updates.code) {
      updateFields.push('version = version + 1');
    }

    params.push(endpointId);

    const query = `UPDATE ai_endpoints SET ${updateFields.join(', ')} WHERE id = ?`;

    db.run(query, params, function(err) {
      if (err) {
        db.close();
        reject(err);
        return;
      }

      const wasUpdated = this.changes > 0;

      // Create version history if code was updated
      if (updates.code && wasUpdated) {
        const versionQuery = `
          INSERT INTO ai_endpoint_versions (endpoint_id, version_number, code, change_description)
          SELECT id, version, ?, ?
          FROM ai_endpoints WHERE id = ?
        `;

        db.run(versionQuery, [
          updates.code,
          updates.changeDescription || 'Code updated',
          endpointId
        ], (err) => {
          db.close();
          if (err) {
            reject(err);
          } else {
            resolve(wasUpdated);
          }
        });
      } else {
        db.close();
        resolve(wasUpdated);
      }
    });
  });
}

// Delete endpoint
async function deleteEndpoint(endpointId) {
  const db = getDb();

  return new Promise(async (resolve, reject) => {
    // First get the endpoint to delete its file
    const getQuery = 'SELECT file_path FROM ai_endpoints WHERE id = ?';

    db.get(getQuery, [endpointId], async (err, row) => {
      if (err) {
        db.close();
        reject(err);
        return;
      }

      // Delete the file if it exists
      if (row && row.file_path) {
        try {
          await fs.unlink(row.file_path);
        } catch (fileErr) {
          console.warn('Could not delete file:', fileErr.message);
        }
      }

      // Delete from database (cascades to logs and versions)
      const deleteQuery = 'DELETE FROM ai_endpoints WHERE id = ?';

      db.run(deleteQuery, [endpointId], function(err) {
        db.close();
        if (err) {
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
      });
    });
  });
}

// Log endpoint usage
async function logEndpointUsage(endpointId, logData) {
  const db = getDb();

  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO ai_endpoint_logs (
        endpoint_id, method, status_code, response_time, error_message,
        request_data, response_data, user_agent, ip_address
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      endpointId,
      logData.method,
      logData.statusCode,
      logData.responseTime,
      logData.errorMessage,
      JSON.stringify(logData.requestData || {}),
      JSON.stringify(logData.responseData || {}),
      logData.userAgent,
      logData.ipAddress
    ];

    db.run(query, params, function(err) {
      if (err) {
        db.close();
        reject(err);
        return;
      }

      // Update usage count
      const updateQuery = 'UPDATE ai_endpoints SET usage_count = usage_count + 1 WHERE id = ?';

      db.run(updateQuery, [endpointId], (err) => {
        db.close();
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  });
}

export default async function handler(req, res) {
  try {
    // Initialize tables on first request
    await initializeTables();

    const { method } = req;

    switch (method) {
      case 'GET':
        const { id, ...filters } = req.query;

        if (id) {
          // Get single endpoint
          const endpoint = await getEndpointById(parseInt(id));
          if (!endpoint) {
            return res.status(404).json({ success: false, error: 'Endpoint not found' });
          }
          return res.status(200).json({ success: true, endpoint });
        } else {
          // Get all endpoints with filters
          const data = await getAllEndpoints(filters);
          return res.status(200).json({ success: true, ...data });
        }

      case 'PUT':
        const { id: updateId } = req.query;
        const updates = req.body;

        if (!updateId) {
          return res.status(400).json({ success: false, error: 'Endpoint ID required' });
        }

        const updated = await updateEndpoint(parseInt(updateId), updates);
        if (!updated) {
          return res.status(404).json({ success: false, error: 'Endpoint not found or no changes made' });
        }

        return res.status(200).json({ success: true, message: 'Endpoint updated successfully' });

      case 'DELETE':
        const { id: deleteId } = req.query;

        if (!deleteId) {
          return res.status(400).json({ success: false, error: 'Endpoint ID required' });
        }

        const deleted = await deleteEndpoint(parseInt(deleteId));
        if (!deleted) {
          return res.status(404).json({ success: false, error: 'Endpoint not found' });
        }

        return res.status(200).json({ success: true, message: 'Endpoint deleted successfully' });

      case 'POST':
        const { action, endpointId, ...logData } = req.body;

        if (action === 'log') {
          if (!endpointId) {
            return res.status(400).json({ success: false, error: 'Endpoint ID required for logging' });
          }

          const logId = await logEndpointUsage(endpointId, logData);
          return res.status(200).json({ success: true, logId });
        }

        return res.status(400).json({ success: false, error: 'Invalid action' });

      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Endpoint registry error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}