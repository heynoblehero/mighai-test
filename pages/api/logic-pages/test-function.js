export default async function handler(req, res) {
  console.log('🧪 Test Function API called');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { functionCode, testInputs } = req.body;

  if (!functionCode || !testInputs) {
    return res.status(400).json({ error: 'Function code and test inputs are required' });
  }

  const startTime = Date.now();

  try {
    console.log('🔄 Testing function with inputs:', testInputs);

    // Create a safe execution context
    const executeLogic = new Function('inputs', functionCode + '\n return executeLogic(inputs);');

    // Execute the function
    const result = await executeLogic(testInputs);
    const executionTime = Date.now() - startTime;

    console.log('✅ Test successful:', executionTime, 'ms');

    res.status(200).json({
      success: true,
      result: result,
      execution_time: executionTime,
      message: 'Function executed successfully'
    });

  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error('❌ Test failed:', error);

    res.status(400).json({
      success: false,
      error: error.message,
      stack: error.stack,
      execution_time: executionTime,
      message: 'Function execution failed'
    });
  }
}
