// Test Generated Backend Code
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, structuredCode, testInputs, selectedInputs } = req.body;

  // Support both raw code and structured code formats
  let codeToExecute = code;
  let functionName = 'processUserInput';

  if (structuredCode && structuredCode.code) {
    codeToExecute = structuredCode.code;
    functionName = structuredCode.functionName || 'processUserInput';
  }

  if (!codeToExecute) {
    return res.status(400).json({
      success: false,
      error: 'No code provided to test'
    });
  }

  try {
    // Create a safe execution environment
    const logs = [];
    const originalConsoleLog = console.log;

    // Capture console.log outputs
    console.log = (...args) => {
      logs.push(args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' '));
    };

    let result;
    let executionError = null;

    try {
      // Create a sandboxed execution context
      const vm = require('vm');

      // Prepare the execution context with necessary APIs
      const sandbox = {
        console: {
          log: console.log,
          error: console.error,
          warn: console.warn
        },
        fetch: global.fetch, // Allow HTTP requests
        setTimeout: setTimeout,
        clearTimeout: clearTimeout,
        Date: Date,
        JSON: JSON,
        Math: Math,
        String: String,
        Number: Number,
        Array: Array,
        Object: Object,
        RegExp: RegExp,
        parseInt: parseInt,
        parseFloat: parseFloat,
        isNaN: isNaN,
        isFinite: isFinite,
        encodeURIComponent: encodeURIComponent,
        decodeURIComponent: decodeURIComponent,
        Buffer: Buffer,
        process: {
          env: {} // Empty env for security
        },
        // Mock require function for common modules
        require: (moduleName) => {
          console.log(`Note: require('${moduleName}') is not supported in logic page testing environment`);
          throw new Error(`require('${moduleName}') is not supported in logic page backend testing. Use browser-compatible APIs only.`);
        },
        // Additional utility functions
        btoa: global.btoa || ((str) => Buffer.from(str).toString('base64')),
        atob: global.atob || ((str) => Buffer.from(str, 'base64').toString()),
        URL: URL,
        URLSearchParams: URLSearchParams
      };

      // Add crypto module (limited to safe functions)
      const crypto = require('crypto');
      sandbox.crypto = {
        randomUUID: crypto.randomUUID,
        createHash: crypto.createHash,
        randomBytes: (size) => crypto.randomBytes(size),
        // Add other safe crypto functions as needed
      };

      // Set a timeout for code execution (5 seconds)
      const executionTimeout = 5000;

      // Execute the user code first to define functions
      const setupCode = `${codeToExecute}`;

      // Create context and execute the setup code
      const context = vm.createContext({
        ...sandbox,
        inputs: testInputs || {}
      });

      // Run the user code to define functions
      vm.runInContext(setupCode, context, {
        timeout: executionTimeout,
        displayErrors: true
      });

      // Now try to find and execute the specific function
      const executeCode = `
        // Try to find the specified function or fall back to common names
        const functionNames = [
          '${functionName}',
          'processUserInput',
          'processInput',
          'handleInput',
          'main',
          'execute',
          'process'
        ];

        let mainFunction = null;

        // First try to find declared functions
        for (const name of functionNames) {
          try {
            if (typeof eval(name) === 'function') {
              mainFunction = eval(name);
              break;
            }
          } catch (e) {
            // Continue to next function name
          }
        }

        // If no function found, try to extract and eval function declarations from global context
        if (!mainFunction) {
          // Get all global variables and check for functions
          const globalVars = Object.getOwnPropertyNames(this).concat(Object.getOwnPropertyNames(global || {}));
          for (const varName of globalVars) {
            try {
              const value = eval(varName);
              if (typeof value === 'function') {
                // Check if it's one of our expected function names
                if (functionNames.includes(varName)) {
                  mainFunction = value;
                  break;
                }
              }
            } catch (e) {
              // Continue
            }
          }
        }

        // If still no function, try to find any function in the global scope
        if (!mainFunction) {
          const globalVars = Object.getOwnPropertyNames(this).concat(Object.getOwnPropertyNames(global || {}));
          for (const varName of globalVars) {
            try {
              const value = eval(varName);
              if (typeof value === 'function' && varName !== 'eval' && varName !== 'Function') {
                mainFunction = value;
                break;
              }
            } catch (e) {
              // Continue
            }
          }
        }

        if (!mainFunction) {
          throw new Error('No executable function found. Available functions: ' +
            Object.getOwnPropertyNames(this).filter(name => {
              try { return typeof eval(name) === 'function'; } catch(e) { return false; }
            }).join(', ') + '. Make sure your function is declared correctly.');
        }

        // Execute the function with test inputs and return the result
        const functionResult = mainFunction(inputs);
        functionResult; // Return the result
      `;

      // Execute the main function and capture result
      result = vm.runInContext(executeCode, context, {
        timeout: executionTimeout,
        displayErrors: true
      });

    } catch (error) {
      executionError = error.message;
      console.error('Code execution error:', error);
    } finally {
      // Restore original console.log
      console.log = originalConsoleLog;
    }

    if (executionError) {
      return res.status(200).json({
        success: false,
        error: executionError,
        logs: logs.join('\n')
      });
    }

    return res.status(200).json({
      success: true,
      result: result,
      logs: logs.join('\n'),
      executionTime: Date.now()
    });

  } catch (error) {
    console.error('Test execution error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to execute code test',
      details: error.message
    });
  }
}