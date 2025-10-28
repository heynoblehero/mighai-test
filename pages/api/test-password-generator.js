// Test endpoint that demonstrates correct field mapping for logic pages
// This shows exactly how to write backend code that works with the logic page system

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { testCode, inputs } = req.body;

  if (testCode) {
    // Test the provided code
    return testProvidedCode(req, res, testCode, inputs);
  }

  // Otherwise run our example
  return runPasswordGeneratorExample(req, res, inputs);
}

function runPasswordGeneratorExample(req, res, inputs) {
  // This is exactly how your generated backend code should look
  function processUserInput(inputs) {
    try {
      // Debug: Log received inputs (ALWAYS include this)
      console.log('Received inputs:', inputs);

      // Use exact field names (snake_case) - NOT labels
      const passwordLength = inputs.password_length;  // NOT inputs["Password Length"]
      const numPasswords = inputs.num_passwords;      // NOT inputs["Number of Passwords"]
      const includeSymbols = inputs.include_symbols;  // NOT inputs["Include Symbols"]
      const includeNumbers = inputs.include_numbers;  // NOT inputs["Include Numbers"]

      // Validate required fields
      if (!passwordLength) {
        throw new Error('Password length is required');
      }
      if (!numPasswords) {
        throw new Error('Number of passwords is required');
      }

      // Generate passwords
      const passwords = [];
      for (let i = 0; i < parseInt(numPasswords); i++) {
        passwords.push(generatePassword(parseInt(passwordLength), includeSymbols, includeNumbers));
      }

      return {
        success: true,
        data: {
          passwords: passwords,
          count: passwords.length,
          length: passwordLength,
          includeSymbols: includeSymbols,
          includeNumbers: includeNumbers
        },
        metadata: {
          timestamp: new Date().toISOString(),
          generatedCount: passwords.length
        }
      };

    } catch (error) {
      console.error('Processing error:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  function generatePassword(length, includeSymbols, includeNumbers) {
    let charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (includeNumbers) charset += '0123456789';
    if (includeSymbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';

    let password = '';

    // Use crypto.randomBytes for better randomness (browser-compatible)
    try {
      const randomBytes = crypto.randomBytes(length);
      for (let i = 0; i < length; i++) {
        password += charset.charAt(randomBytes[i] % charset.length);
      }
    } catch (e) {
      // Fallback to Math.random if crypto not available
      for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
      }
    }

    return password;
  }

  // Execute the function
  const result = processUserInput(inputs || {
    password_length: 12,
    num_passwords: 3,
    include_symbols: true,
    include_numbers: true
  });

  return res.status(200).json({
    success: true,
    result,
    exampleCode: processUserInput.toString(),
    fieldMappingExamples: {
      correct: {
        'password_length': 'inputs.password_length',
        'num_passwords': 'inputs.num_passwords',
        'include_symbols': 'inputs.include_symbols'
      },
      incorrect: {
        'Password Length': 'inputs["Password Length"] ❌',
        'Number of Passwords': 'inputs["Number of Passwords"] ❌',
        'passwordLength': 'inputs.passwordLength ❌'
      }
    }
  });
}

function testProvidedCode(req, res, code, inputs) {
  const vm = require('vm');

  try {
    const logs = [];
    const context = {
      inputs: inputs || {},
      console: {
        log: (...args) => {
          logs.push(args.join(' '));
          console.log(...args);
        },
        error: (...args) => {
          logs.push('ERROR: ' + args.join(' '));
          console.error(...args);
        }
      },
      Date: Date,
      JSON: JSON,
      Math: Math
    };

    // Execute the code
    vm.runInContext(code, vm.createContext(context), {
      timeout: 5000,
      displayErrors: true
    });

    // Try to execute processUserInput
    const result = vm.runInContext('processUserInput(inputs)', context, {
      timeout: 5000,
      displayErrors: true
    });

    return res.status(200).json({
      success: true,
      result,
      logs,
      inputs_received: inputs
    });

  } catch (error) {
    return res.status(200).json({
      success: false,
      error: error.message,
      logs: [],
      inputs_received: inputs
    });
  }
}