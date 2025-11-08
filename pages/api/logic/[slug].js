import sqlite3 from 'sqlite3';
import path from 'path';

const db = new sqlite3.Database(path.join(process.cwd(), 'database.db'));

export default async function handler(req, res) {
  const { slug } = req.query;
  console.log('⚡ Logic execution for slug:', slug);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const inputs = req.body;
  console.log('📥 Received inputs:', inputs);

  try {
    // Fetch logic page by slug
    db.get('SELECT * FROM logic_pages WHERE slug = ?', [slug], async (err, logicPage) => {
      if (err) {
        console.error('❌ Database error:', err);
        return res.status(500).json({ error: 'Database error', details: err.message });
      }

      if (!logicPage) {
        return res.status(404).json({ error: 'Logic page not found' });
      }

      if (!logicPage.backend_function) {
        return res.status(400).json({ error: 'Backend function not configured for this page' });
      }

      // Check if published or in testing
      if (logicPage.status !== 'published' && logicPage.status !== 'testing') {
        return res.status(403).json({ error: 'This logic page is not published yet' });
      }

      const startTime = Date.now();

      try {
        // Execute the function
        console.log('🔄 Executing backend function...');

        // Create a safe execution context
        const executeLogic = new Function('inputs', logicPage.backend_function + '\n return executeLogic(inputs);');

        // Execute the function
        const result = await executeLogic(inputs);
        const executionTime = Date.now() - startTime;

        console.log('✅ Execution successful:', executionTime, 'ms');

        // Log execution
        db.run(
          `INSERT INTO logic_page_executions (
            logic_page_id, inputs_data, output_data, execution_time_ms,
            status, ip_address, user_agent
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            logicPage.id,
            JSON.stringify(inputs),
            JSON.stringify(result),
            executionTime,
            'success',
            req.headers['x-forwarded-for'] || req.connection.remoteAddress,
            req.headers['user-agent']
          ],
          (err) => {
            if (err) console.error('Failed to log execution:', err);
          }
        );

        res.status(200).json({
          success: true,
          data: result.data || result,
          message: result.message || 'Execution completed successfully',
          execution_time: executionTime
        });

      } catch (executionError) {
        const executionTime = Date.now() - startTime;
        console.error('❌ Execution error:', executionError);

        // Log execution error
        db.run(
          `INSERT INTO logic_page_executions (
            logic_page_id, inputs_data, execution_time_ms, status,
            error_message, error_stack, ip_address, user_agent
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            logicPage.id,
            JSON.stringify(inputs),
            executionTime,
            'error',
            executionError.message,
            executionError.stack,
            req.headers['x-forwarded-for'] || req.connection.remoteAddress,
            req.headers['user-agent']
          ],
          (err) => {
            if (err) console.error('Failed to log error:', err);
          }
        );

        res.status(500).json({
          success: false,
          error: 'Execution failed',
          message: executionError.message,
          details: executionError.stack
        });
      }
    });
  } catch (error) {
    console.error('❌ Handler error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
