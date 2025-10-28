const fs = require('fs').promises;
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Database connection
const dbPath = process.env.NODE_ENV === 'production'
  ? '/tmp/site_builder.db'
  : '/home/ishaan/Projects/mighai (copy)/site_builder.db';

function getDb() {
  return new sqlite3.Database(dbPath);
}

// Initialize endpoint registry database
async function initializeEndpointRegistry() {
  const db = getDb();

  return new Promise((resolve, reject) => {
    const createTableQuery = `
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
        error_count INTEGER DEFAULT 0
      )
    `;

    db.run(createTableQuery, (err) => {
      db.close();
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

// Register endpoint in database
async function registerEndpoint(endpointData) {
  const db = getDb();

  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO ai_endpoints (
        name, description, path, file_path, methods, code, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      endpointData.name,
      endpointData.description,
      endpointData.path,
      endpointData.filePath,
      JSON.stringify(endpointData.methods),
      endpointData.code,
      endpointData.createdBy || 1
    ];

    db.run(query, params, function(err) {
      db.close();
      if (err) {
        reject(err);
      } else {
        resolve(this.lastID);
      }
    });
  });
}

// Update endpoint in database
async function updateEndpoint(endpointId, updateData) {
  const db = getDb();

  return new Promise((resolve, reject) => {
    const query = `
      UPDATE ai_endpoints
      SET name = ?, description = ?, methods = ?, code = ?,
          version = version + 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    const params = [
      updateData.name,
      updateData.description,
      JSON.stringify(updateData.methods),
      updateData.code,
      endpointId
    ];

    db.run(query, params, function(err) {
      db.close();
      if (err) {
        reject(err);
      } else {
        resolve(this.changes > 0);
      }
    });
  });
}

// Get endpoint by path
async function getEndpointByPath(apiPath) {
  const db = getDb();

  return new Promise((resolve, reject) => {
    const query = 'SELECT * FROM ai_endpoints WHERE path = ?';

    db.get(query, [apiPath], (err, row) => {
      db.close();
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

// Generate safe file path from API path
function generateFilePath(apiPath) {
  // Remove /api prefix and clean the path
  let cleanPath = apiPath.replace(/^\/api\//, '');

  // Replace invalid characters and ensure it's a valid filename
  cleanPath = cleanPath
    .replace(/[^a-zA-Z0-9\-_\/]/g, '-')
    .replace(/\-+/g, '-')
    .replace(/^-|-$/g, '');

  // Ensure we have a valid filename
  if (!cleanPath || cleanPath === '') {
    cleanPath = 'generated-endpoint';
  }

  // Add .js extension
  return `${cleanPath}.js`;
}

// Create directory structure if needed
async function ensureDirectoryExists(filePath) {
  const directory = path.dirname(filePath);

  try {
    await fs.access(directory);
  } catch (error) {
    // Directory doesn't exist, create it
    await fs.mkdir(directory, { recursive: true });
  }
}

// Deploy endpoint to filesystem
async function deployEndpoint(endpointData) {
  const { name, description, path: apiPath, code, methods } = endpointData;

  if (!apiPath || !code) {
    throw new Error('API path and code are required');
  }

  // Generate file path
  const fileName = generateFilePath(apiPath);
  const fullFilePath = path.join(process.cwd(), 'pages', 'api', fileName);

  try {
    // Initialize database if needed
    await initializeEndpointRegistry();

    // Check if endpoint already exists
    const existingEndpoint = await getEndpointByPath(apiPath);

    // Ensure directory structure exists
    await ensureDirectoryExists(fullFilePath);

    // Add deployment metadata to code
    const deploymentHeader = `// AI-Generated Endpoint: ${name}
// Description: ${description || 'No description provided'}
// Path: ${apiPath}
// Methods: ${methods.join(', ')}
// Generated: ${new Date().toISOString()}
// Auto-deployed by AI Builder

`;

    const finalCode = deploymentHeader + code;

    // Write the file
    await fs.writeFile(fullFilePath, finalCode, 'utf8');

    // Register or update in database
    const endpointDbData = {
      name,
      description,
      path: apiPath,
      filePath: fullFilePath,
      methods,
      code: finalCode
    };

    let endpointId;
    if (existingEndpoint) {
      await updateEndpoint(existingEndpoint.id, endpointDbData);
      endpointId = existingEndpoint.id;
    } else {
      endpointId = await registerEndpoint(endpointDbData);
    }

    return {
      success: true,
      endpointId,
      filePath: fullFilePath,
      apiPath,
      message: existingEndpoint
        ? `Endpoint updated successfully at ${apiPath}`
        : `Endpoint deployed successfully at ${apiPath}`,
      isUpdate: !!existingEndpoint
    };

  } catch (error) {
    console.error('Deployment error:', error);
    throw new Error(`Failed to deploy endpoint: ${error.message}`);
  }
}

// Test deployed endpoint
async function testEndpoint(apiPath, testData = {}) {
  try {
    const baseUrl = process.env.NODE_ENV === 'production'
      ? process.env.NEXT_PUBLIC_BASE_URL || 'https://your-domain.com'
      : 'http://localhost:3000';

    const fullUrl = `${baseUrl}${apiPath}`;

    // Test GET request
    const getResponse = await fetch(fullUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    const getResult = {
      method: 'GET',
      status: getResponse.status,
      statusText: getResponse.statusText,
      success: getResponse.ok
    };

    try {
      getResult.data = await getResponse.json();
    } catch (e) {
      getResult.data = await getResponse.text();
    }

    const testResults = { GET: getResult };

    // Test POST request if test data provided
    if (Object.keys(testData).length > 0) {
      try {
        const postResponse = await fetch(fullUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testData)
        });

        const postResult = {
          method: 'POST',
          status: postResponse.status,
          statusText: postResponse.statusText,
          success: postResponse.ok
        };

        try {
          postResult.data = await postResponse.json();
        } catch (e) {
          postResult.data = await postResponse.text();
        }

        testResults.POST = postResult;
      } catch (error) {
        testResults.POST = {
          method: 'POST',
          success: false,
          error: error.message
        };
      }
    }

    return {
      success: true,
      url: fullUrl,
      results: testResults,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Remove deployed endpoint
async function removeEndpoint(apiPath) {
  try {
    const endpoint = await getEndpointByPath(apiPath);

    if (!endpoint) {
      throw new Error('Endpoint not found');
    }

    // Remove file
    try {
      await fs.unlink(endpoint.file_path);
    } catch (error) {
      console.warn('File not found, continuing with database cleanup');
    }

    // Remove from database
    const db = getDb();

    return new Promise((resolve, reject) => {
      db.run('DELETE FROM ai_endpoints WHERE path = ?', [apiPath], function(err) {
        db.close();
        if (err) {
          reject(err);
        } else {
          resolve({
            success: true,
            message: 'Endpoint removed successfully',
            removed: this.changes > 0
          });
        }
      });
    });

  } catch (error) {
    throw new Error(`Failed to remove endpoint: ${error.message}`);
  }
}

// List all deployed endpoints
async function listEndpoints() {
  const db = getDb();

  return new Promise((resolve, reject) => {
    const query = `
      SELECT id, name, description, path, methods, status, version,
             created_at, updated_at, usage_count, error_count
      FROM ai_endpoints
      ORDER BY updated_at DESC
    `;

    db.all(query, [], (err, rows) => {
      db.close();
      if (err) {
        reject(err);
      } else {
        // Parse methods JSON
        const endpoints = rows.map(row => ({
          ...row,
          methods: JSON.parse(row.methods || '[]')
        }));
        resolve(endpoints);
      }
    });
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, ...actionData } = req.body;

  try {
    switch (action) {
      case 'deploy':
        const {
          name,
          description,
          path: apiPath,
          code,
          methods = ['GET', 'POST']
        } = actionData;

        if (!name || !apiPath || !code) {
          return res.status(400).json({
            success: false,
            error: 'Name, API path, and code are required'
          });
        }

        const deployResult = await deployEndpoint({
          name,
          description,
          path: apiPath,
          code,
          methods
        });

        return res.status(200).json(deployResult);

      case 'test':
        const { path: testPath, testData } = actionData;

        if (!testPath) {
          return res.status(400).json({
            success: false,
            error: 'API path is required for testing'
          });
        }

        const testResult = await testEndpoint(testPath, testData);
        return res.status(200).json(testResult);

      case 'remove':
        const { path: removePath } = actionData;

        if (!removePath) {
          return res.status(400).json({
            success: false,
            error: 'API path is required for removal'
          });
        }

        const removeResult = await removeEndpoint(removePath);
        return res.status(200).json(removeResult);

      case 'list':
        const endpoints = await listEndpoints();
        return res.status(200).json({
          success: true,
          endpoints
        });

      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid action. Supported actions: deploy, test, remove, list'
        });
    }

  } catch (error) {
    console.error('Deploy endpoint error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process request',
      details: error.message
    });
  }
}