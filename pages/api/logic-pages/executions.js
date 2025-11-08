import sqlite3 from 'sqlite3';
import path from 'path';

const db = new sqlite3.Database(path.join(process.cwd(), 'database.db'));

export default async function handler(req, res) {
  console.log('📊 Logic Page Executions API called:', req.method);

  if (req.method === 'GET') {
    return handleGetExecutions(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

// GET /api/logic-pages/executions - List all executions with filtering
function handleGetExecutions(req, res) {
  const { logic_page_id, status, limit = '50', offset = '0', start_date, end_date } = req.query;

  let query = `
    SELECT
      lpe.*,
      lp.title as logic_page_title,
      lp.slug as logic_page_slug
    FROM logic_page_executions lpe
    LEFT JOIN logic_pages lp ON lpe.logic_page_id = lp.id
    WHERE 1=1
  `;
  const params = [];

  // Filter by logic page
  if (logic_page_id) {
    query += ' AND lpe.logic_page_id = ?';
    params.push(logic_page_id);
  }

  // Filter by status (success/error)
  if (status) {
    query += ' AND lpe.status = ?';
    params.push(status);
  }

  // Filter by date range
  if (start_date) {
    query += ' AND lpe.executed_at >= ?';
    params.push(start_date);
  }

  if (end_date) {
    query += ' AND lpe.executed_at <= ?';
    params.push(end_date);
  }

  query += ' ORDER BY lpe.executed_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  // Get total count for pagination
  let countQuery = `
    SELECT COUNT(*) as total
    FROM logic_page_executions lpe
    WHERE 1=1
  `;
  const countParams = [];

  if (logic_page_id) {
    countQuery += ' AND lpe.logic_page_id = ?';
    countParams.push(logic_page_id);
  }

  if (status) {
    countQuery += ' AND lpe.status = ?';
    countParams.push(status);
  }

  if (start_date) {
    countQuery += ' AND lpe.executed_at >= ?';
    countParams.push(start_date);
  }

  if (end_date) {
    countQuery += ' AND lpe.executed_at <= ?';
    countParams.push(end_date);
  }

  // Execute count query
  db.get(countQuery, countParams, (err, countResult) => {
    if (err) {
      console.error('❌ Error counting executions:', err);
      return res.status(500).json({ error: 'Failed to count executions', details: err.message });
    }

    const total = countResult.total || 0;

    // Execute main query
    db.all(query, params, (err, executions) => {
      if (err) {
        console.error('❌ Error fetching executions:', err);
        return res.status(500).json({ error: 'Failed to fetch executions', details: err.message });
      }

      // Parse JSON fields
      const parsedExecutions = executions.map(exec => {
        let inputs_data = null;
        let output_data = null;

        try {
          inputs_data = exec.inputs_data ? JSON.parse(exec.inputs_data) : null;
        } catch (e) {
          console.error('Failed to parse inputs_data:', e);
        }

        try {
          output_data = exec.output_data ? JSON.parse(exec.output_data) : null;
        } catch (e) {
          console.error('Failed to parse output_data:', e);
        }

        return {
          ...exec,
          inputs_data,
          output_data
        };
      });

      res.status(200).json({
        success: true,
        executions: parsedExecutions,
        total: total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        has_more: total > parseInt(offset) + parsedExecutions.length
      });
    });
  });
}
