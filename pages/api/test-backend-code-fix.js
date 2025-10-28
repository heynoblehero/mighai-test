// Test endpoint to verify backend code generation fixes

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { testType } = req.body;

  try {
    switch (testType) {
      case 'browser-compatible':
        return testBrowserCompatibleCode(req, res);

      case 'field-mapping':
        return testFieldMapping(req, res);

      case 'full-integration':
        return testFullIntegration(req, res);

      default:
        return runAllTests(req, res);
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

async function testBrowserCompatibleCode(req, res) {
  // Test code that should work without require()
  const testCode = `
    function processUserInput(inputs) {
      try {
        console.log('Received inputs:', inputs);

        // Use browser-compatible APIs only
        const text = inputs.text || 'Hello World';
        const processed = text.toUpperCase();
        const wordCount = text.split(/\\s+/).length;
        const uniqueId = crypto.randomUUID();

        return {
          success: true,
          data: {
            original: text,
            processed: processed,
            word_count: wordCount,
            unique_id: uniqueId,
            timestamp: new Date().toISOString()
          }
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    }
  `;

  // Test the code using our test API
  const testResult = await fetch(`${req.headers.host}/api/ai-builder/test-generated-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: testCode,
      testInputs: { text: 'This is a test message' }
    })
  });

  const result = await testResult.json();

  return res.status(200).json({
    test: 'browser-compatible',
    passed: result.success,
    result: result
  });
}

async function testFieldMapping(req, res) {
  // Test correct field name usage
  const testCode = `
    function processUserInput(inputs) {
      try {
        console.log('Received inputs:', inputs);

        // Use exact field names (snake_case)
        const passwordLength = inputs.password_length; // NOT inputs["Password Length"]
        const includeSymbols = inputs.include_symbols;   // NOT inputs["Include Symbols"]

        if (!passwordLength) {
          throw new Error('Password length is required');
        }

        let charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        if (includeSymbols) charset += '!@#$%^&*';

        let password = '';
        for (let i = 0; i < passwordLength; i++) {
          password += charset.charAt(Math.floor(Math.random() * charset.length));
        }

        return {
          success: true,
          data: {
            password: password,
            length: passwordLength,
            includes_symbols: includeSymbols
          }
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    }
  `;

  const testResult = await fetch(`${req.headers.host}/api/ai-builder/test-generated-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: testCode,
      testInputs: {
        password_length: 12,  // Using field_name, not field_label
        include_symbols: true
      }
    })
  });

  const result = await testResult.json();

  return res.status(200).json({
    test: 'field-mapping',
    passed: result.success,
    result: result
  });
}

async function testFullIntegration(req, res) {
  // Test the debug API
  const debugResult = await fetch(`${req.headers.host}/api/debug-logic-page`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'analyze-field-mapping',
      fields: [
        { field_name: 'password_length', field_label: 'Password Length', field_type: 'number', is_required: true },
        { field_name: 'include_symbols', field_label: 'Include Symbols', field_type: 'checkbox', is_required: false }
      ],
      testInputs: {
        password_length: 12,
        include_symbols: true
      }
    })
  });

  const debugData = await debugResult.json();

  return res.status(200).json({
    test: 'full-integration',
    passed: debugData.success,
    debug_analysis: debugData.analysis,
    recommendations: debugData.analysis?.suggestions || []
  });
}

async function runAllTests(req, res) {
  const tests = [];

  // Run browser compatibility test
  try {
    const compatTest = await testBrowserCompatibleCode(req, res);
    tests.push({ name: 'Browser Compatibility', ...compatTest });
  } catch (error) {
    tests.push({ name: 'Browser Compatibility', passed: false, error: error.message });
  }

  // Run field mapping test
  try {
    const fieldTest = await testFieldMapping(req, res);
    tests.push({ name: 'Field Mapping', ...fieldTest });
  } catch (error) {
    tests.push({ name: 'Field Mapping', passed: false, error: error.message });
  }

  const allPassed = tests.every(test => test.passed);

  return res.status(200).json({
    success: allPassed,
    message: allPassed ? '✅ All tests passed!' : '❌ Some tests failed',
    tests: tests,
    summary: {
      total: tests.length,
      passed: tests.filter(t => t.passed).length,
      failed: tests.filter(t => !t.passed).length
    }
  });
}