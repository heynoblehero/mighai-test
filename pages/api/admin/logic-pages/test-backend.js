export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code, testData, inputs } = req.body;

    if (!code || !testData) {
      return res.status(400).json({ error: 'Code and testData are required' });
    }

    // Create a safe execution environment
    const testFunction = `
      // User's function code
      ${code}
    `;

    // Use VM module for safer execution (in a real production environment, consider using a more robust sandboxing solution)
    const vm = require('vm');
    const util = require('util');
    const crypto = require('crypto');
    const path = require('path');
    const querystring = require('querystring');
    const url = require('url');

    // Create a context with limited global access
    const moduleExports = {};
    const context = {
      console,
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

        // Try to load installed npm packages dynamically
        try {
          // Use dynamic require to load the module from node_modules
          const Module = require('module');
          const modulePath = require.resolve(moduleName, {
            paths: [process.cwd() + '/node_modules', ...require('module').globalPaths]
          });
          return require(modulePath);
        } catch (e) {
          throw new Error(`Module '${moduleName}' is not installed or not allowed. Please install it first. Error: ${e.message}`);
        }
      },
      fetch: async (url, options = {}) => {
        // Allow real fetch for testing (can be restricted later)
        const nodeFetch = require('node-fetch');
        return nodeFetch(url, options);
      },
      setTimeout,
      setInterval,
      clearTimeout,
      clearInterval,
      JSON,
      Math,
      Date,
      Buffer,
      crypto,
      process: {
        env: {} // Empty env for security
      }
    };

    try {
      // Set timeout for execution
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Execution timeout')), 10000); // 10 second timeout
      });

      const executionPromise = new Promise(async (resolve, reject) => {
        try {
          // First, execute the user's code to set up module.exports
          const script = new vm.Script(testFunction);
          script.runInNewContext(context, { timeout: 5000 });

          // Get the exported function
          const exportedFunction = context.module.exports;

          if (typeof exportedFunction !== 'function') {
            return reject(new Error('Code must export a function using module.exports'));
          }

          // Now call the exported function with testData
          const result = await exportedFunction(testData);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      const result = await Promise.race([executionPromise, timeoutPromise]);

      res.json({
        success: true,
        result,
        testData,
        inputs,
        message: 'Function executed successfully'
      });

    } catch (executionError) {
      console.error('Function execution error:', executionError);

      res.json({
        success: false,
        error: executionError.message,
        testData,
        inputs,
        message: 'Function execution failed'
      });
    }

  } catch (error) {
    console.error('Error in test-backend:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}