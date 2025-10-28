// Debug API for Logic Page Frontend-Backend Mismatch Issues

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, pageSlug, generatedCode, testInputs, fields } = req.body;

  try {
    switch (action) {
      case 'analyze-field-mapping':
        // Analyze field mapping issues
        return analyzeFieldMapping(res, fields, testInputs);

      case 'test-generated-code':
        // Test generated code with proper debugging
        return testGeneratedCodeWithDebugging(res, generatedCode, testInputs, fields);

      case 'fix-field-names':
        // Auto-fix field name mismatches in code
        return fixFieldNamesInCode(res, generatedCode, fields);

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
}

function analyzeFieldMapping(res, fields, testInputs) {
  const analysis = {
    fields_analysis: {},
    input_analysis: {},
    mismatches: [],
    suggestions: []
  };

  // Analyze defined fields
  if (fields && Array.isArray(fields)) {
    fields.forEach(field => {
      analysis.fields_analysis[field.field_name] = {
        label: field.field_label,
        type: field.field_type,
        required: field.is_required,
        exists_in_inputs: testInputs && testInputs.hasOwnProperty(field.field_name)
      };

      // Check for mismatches
      if (testInputs) {
        const labelExists = testInputs.hasOwnProperty(field.field_label);
        const nameExists = testInputs.hasOwnProperty(field.field_name);

        if (labelExists && !nameExists) {
          analysis.mismatches.push({
            type: 'label_used_instead_of_name',
            field_name: field.field_name,
            field_label: field.field_label,
            issue: `Input uses label "${field.field_label}" instead of field name "${field.field_name}"`
          });
        }
      }
    });
  }

  // Analyze input data
  if (testInputs) {
    Object.keys(testInputs).forEach(key => {
      analysis.input_analysis[key] = {
        value: testInputs[key],
        is_field_name: fields ? fields.some(f => f.field_name === key) : false,
        is_field_label: fields ? fields.some(f => f.field_label === key) : false
      };
    });
  }

  // Generate suggestions
  if (analysis.mismatches.length > 0) {
    analysis.suggestions.push('Update your backend code to use field_name instead of field_label');
    analysis.suggestions.push('Example: Use inputs.password_length instead of inputs["Password Length"]');
  }

  analysis.suggestions.push('Always log inputs at the start: console.log("Received inputs:", inputs)');
  analysis.suggestions.push('Use snake_case field names (password_length, not passwordLength)');

  return res.status(200).json({
    success: true,
    analysis
  });
}

function testGeneratedCodeWithDebugging(res, generatedCode, testInputs, fields) {
  const vm = require('vm');

  try {
    // Create execution context
    const logs = [];
    const context = {
      inputs: testInputs || {},
      console: {
        log: (...args) => logs.push(args.map(arg =>
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ')),
        error: (...args) => logs.push('ERROR: ' + args.map(arg =>
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' '))
      },
      Date: Date,
      JSON: JSON,
      Math: Math
    };

    // Execute the code
    vm.runInContext(generatedCode, vm.createContext(context), {
      timeout: 5000,
      displayErrors: true
    });

    // Try to find and execute the main function
    const executeCode = `
      let mainFunction = null;
      const functionNames = ['processUserInput', 'processInput', 'handleInput', 'main'];

      for (const name of functionNames) {
        try {
          if (typeof eval(name) === 'function') {
            mainFunction = eval(name);
            break;
          }
        } catch (e) {
          console.log('Function not found:', name);
        }
      }

      if (!mainFunction) {
        throw new Error('No main function found. Available functions: ' +
          Object.getOwnPropertyNames(this).filter(name => {
            try { return typeof eval(name) === 'function'; } catch(e) { return false; }
          }).join(', '));
      }

      const result = mainFunction(inputs);
      result;
    `;

    const result = vm.runInContext(executeCode, context, {
      timeout: 5000,
      displayErrors: true
    });

    return res.status(200).json({
      success: true,
      result,
      logs,
      debug_info: {
        inputs_received: testInputs,
        fields_expected: fields ? fields.map(f => ({ name: f.field_name, label: f.field_label })) : [],
        execution_successful: true
      }
    });

  } catch (error) {
    return res.status(200).json({
      success: false,
      error: error.message,
      logs,
      debug_info: {
        inputs_received: testInputs,
        fields_expected: fields ? fields.map(f => ({ name: f.field_name, label: f.field_label })) : [],
        execution_successful: false,
        error_type: error.name
      }
    });
  }
}

function fixFieldNamesInCode(res, generatedCode, fields) {
  if (!generatedCode || !fields) {
    return res.status(400).json({ error: 'Missing code or fields' });
  }

  let fixedCode = generatedCode;
  const fixes = [];

  // Fix common field name issues
  fields.forEach(field => {
    const { field_name, field_label } = field;

    // Replace field labels with field names
    const labelPattern = new RegExp(`inputs\\["${field_label}"\\]`, 'g');
    const labelPattern2 = new RegExp(`inputs\\['${field_label}'\\]`, 'g');
    const labelPattern3 = new RegExp(`inputs\\.${field_label.replace(/\s+/g, '')}`, 'g');

    if (labelPattern.test(fixedCode)) {
      fixedCode = fixedCode.replace(labelPattern, `inputs.${field_name}`);
      fixes.push(`Replaced inputs["${field_label}"] with inputs.${field_name}`);
    }

    if (labelPattern2.test(fixedCode)) {
      fixedCode = fixedCode.replace(labelPattern2, `inputs.${field_name}`);
      fixes.push(`Replaced inputs['${field_label}'] with inputs.${field_name}`);
    }

    // Fix camelCase to snake_case
    const camelCase = field_label.replace(/\s+/g, '').toLowerCase();
    const camelPattern = new RegExp(`inputs\\.${camelCase}`, 'g');
    if (camelPattern.test(fixedCode)) {
      fixedCode = fixedCode.replace(camelPattern, `inputs.${field_name}`);
      fixes.push(`Replaced inputs.${camelCase} with inputs.${field_name}`);
    }
  });

  // Ensure function name is correct
  if (!fixedCode.includes('function processUserInput')) {
    // Try to find other function names and replace them
    const functionPatterns = [
      /function\s+(\w+)\s*\(\s*inputs?\s*\)/g,
      /const\s+(\w+)\s*=\s*\(\s*inputs?\s*\)\s*=>/g,
      /(\w+)\s*=\s*function\s*\(\s*inputs?\s*\)/g
    ];

    functionPatterns.forEach(pattern => {
      const matches = [...fixedCode.matchAll(pattern)];
      matches.forEach(match => {
        if (match[1] !== 'processUserInput') {
          fixedCode = fixedCode.replace(match[0], match[0].replace(match[1], 'processUserInput'));
          fixes.push(`Renamed function ${match[1]} to processUserInput`);
        }
      });
    });
  }

  // Add debug logging if not present
  if (!fixedCode.includes('console.log') && !fixedCode.includes('console.error')) {
    fixedCode = fixedCode.replace(
      /(function processUserInput\(inputs\)\s*\{)/,
      '$1\n  console.log("Received inputs:", inputs);'
    );
    fixes.push('Added debug logging for inputs');
  }

  return res.status(200).json({
    success: true,
    originalCode: generatedCode,
    fixedCode,
    fixes,
    changesMade: fixes.length > 0
  });
}