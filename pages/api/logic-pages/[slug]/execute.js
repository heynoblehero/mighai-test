const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const util = require('util');
const querystring = require('querystring');
const url = require('url');

const dbPath = path.join(process.cwd(), 'site_builder.db');
const db = new sqlite3.Database(dbPath);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { slug } = req.query;
    const submittedData = req.body;

    // Get the logic page and its configuration
    db.get(
      `SELECT * FROM logic_pages WHERE slug = ? AND is_active = 1`,
      [slug],
      async (err, pageData) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        if (!pageData) {
          return res.status(404).json({ error: 'Logic page not found' });
        }

        try {
          // Parse configurations
          const backendConfig = JSON.parse(pageData.backend_config || '{}');
          const resultConfig = JSON.parse(pageData.result_config || '{}');

          // Get all fields for this logic page
          db.all(
            'SELECT * FROM logic_page_fields WHERE logic_page_id = ? ORDER BY order_index',
            [pageData.id],
            async (fieldsErr, fields) => {
              if (fieldsErr) {
                console.error('Fields error:', fieldsErr);
                return res.status(500).json({ error: 'Failed to load fields' });
              }

              try {
                // Validate required fields
                for (const field of fields) {
                  if (field.required && !submittedData[field.name]) {
                    return res.status(400).json({
                      error: `Required field '${field.name}' is missing`
                    });
                  }
                }

                // Execute the backend function
                const startTime = Date.now();
                let executionResult;

                if (backendConfig.code) {
                  // Execute the user's custom function
                  executionResult = await executeBackendFunction(
                    backendConfig.code,
                    submittedData,
                    fields
                  );
                } else {
                  // Fallback to simple echo
                  executionResult = {
                    success: true,
                    data: submittedData,
                    message: 'Data processed successfully'
                  };
                }

                const processingTime = Date.now() - startTime;

                // Store execution record
                db.run(
                  `INSERT INTO logic_page_executions (
                    logic_page_id, input_data, output_data,
                    success, execution_time_ms, error_message
                  ) VALUES (?, ?, ?, ?, ?, ?)`,
                  [
                    pageData.id,
                    JSON.stringify(submittedData),
                    JSON.stringify(executionResult),
                    executionResult.success ? 1 : 0,
                    processingTime,
                    executionResult.success ? null : (executionResult.error || 'Unknown error')
                  ],
                  (logErr) => {
                    if (logErr) {
                      console.error('Error logging execution:', logErr);
                    }
                  }
                );

                // Return result based on configuration
                const response = {
                  success: executionResult.success,
                  data: executionResult.data,
                  message: executionResult.message || 'Processing completed',
                  processingTime
                };

                if (resultConfig.showMetadata) {
                  response.metadata = {
                    pageId: pageData.id,
                    pageName: pageData.name,
                    executedAt: new Date().toISOString(),
                    inputFields: fields.map(f => f.name)
                  };
                }

                if (!executionResult.success) {
                  response.error = executionResult.error;
                }

                res.json(response);

              } catch (executionError) {
                console.error('Execution error:', executionError);

                // Log error execution
                db.run(
                  `INSERT INTO logic_page_executions (
                    logic_page_id, input_data, output_data,
                    success, execution_time_ms, error_message
                  ) VALUES (?, ?, ?, ?, ?, ?)`,
                  [
                    pageData.id,
                    JSON.stringify(submittedData),
                    JSON.stringify({ error: executionError.message }),
                    0,
                    0,
                    executionError.message
                  ]
                );

                res.status(500).json({
                  success: false,
                  error: 'Execution failed',
                  message: executionError.message
                });
              }
            }
          );

        } catch (configError) {
          console.error('Configuration error:', configError);
          res.status(500).json({ error: 'Invalid page configuration' });
        }
      }
    );

  } catch (error) {
    console.error('Error in logic page execution:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function executeBackendFunction(code, inputData, fields) {
  return new Promise(async (resolve, reject) => {
    try {
      // Create a safe execution environment with just the user's code
      const functionCode = `
        // User's function code
        ${code}
      `;

      // Create module.exports object
      const moduleExports = {};

      // Create a limited context
      const context = {
        console: {
          log: (...args) => console.log('[LogicPage]', ...args),
          error: (...args) => console.error('[LogicPage]', ...args)
        },
        module: { exports: moduleExports },
        exports: moduleExports,
        require: (moduleName) => {
          // Built-in Node.js modules that are safe to use
          const allowedModules = {
            'crypto': crypto,
            'util': util,
            'querystring': querystring,
            'url': url,
            'path': path,
            'buffer': Buffer
          };

          if (allowedModules[moduleName]) {
            return allowedModules[moduleName];
          }

          throw new Error(`Module '${moduleName}' is not allowed`);
        },
        setTimeout,
        clearTimeout,
        JSON,
        Math,
        Date,
        Buffer,
        crypto,
        process: {
          env: {} // Empty env for security
        }
      };

      // Execute with timeout
      const timeoutId = setTimeout(() => {
        reject(new Error('Function execution timeout'));
      }, 30000); // 30 second timeout

      try {
        // First, execute the code to set up module.exports
        const script = new vm.Script(functionCode);
        script.runInNewContext(context, { timeout: 10000 });

        // Get the exported function
        const exportedFunction = context.module.exports;

        if (typeof exportedFunction !== 'function') {
          clearTimeout(timeoutId);
          return reject(new Error('Backend code must export a function using module.exports'));
        }

        // Now call the exported function with input data
        const result = await exportedFunction(inputData);

        clearTimeout(timeoutId);
        resolve(result);

      } catch (vmError) {
        clearTimeout(timeoutId);
        reject(vmError);
      }

    } catch (error) {
      reject(error);
    }
  });
}