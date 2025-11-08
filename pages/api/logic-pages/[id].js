import sqlite3 from 'sqlite3';
import path from 'path';

const db = new sqlite3.Database(path.join(process.cwd(), 'database.db'));

export default async function handler(req, res) {
  const { id } = req.query;
  console.log('🔧 Logic Page API called:', req.method, 'ID:', id);

  if (req.method === 'GET') {
    // Get single logic page
    return handleGetLogicPage(req, res, id);
  } else if (req.method === 'PUT') {
    // Update logic page
    return handleUpdateLogicPage(req, res, id);
  } else if (req.method === 'DELETE') {
    // Delete logic page
    return handleDeleteLogicPage(req, res, id);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

// GET /api/logic-pages/[id] - Get single logic page with inputs
function handleGetLogicPage(req, res, id) {
  db.get('SELECT * FROM logic_pages WHERE id = ?', [id], (err, logicPage) => {
    if (err) {
      console.error('❌ Error fetching logic page:', err);
      return res.status(500).json({ error: 'Failed to fetch logic page', details: err.message });
    }

    if (!logicPage) {
      return res.status(404).json({ error: 'Logic page not found' });
    }

    // Fetch inputs for this page
    db.all(
      'SELECT * FROM logic_page_inputs WHERE logic_page_id = ? ORDER BY order_index ASC',
      [id],
      (err, inputs) => {
        if (err) {
          console.error('❌ Error fetching inputs:', err);
          return res.status(500).json({ error: 'Failed to fetch inputs', details: err.message });
        }

        // Parse JSON fields
        const parsedInputs = inputs.map(input => ({
          ...input,
          validation_rules: input.validation_rules ? JSON.parse(input.validation_rules) : null,
          options_json: input.options_json ? JSON.parse(input.options_json) : null
        }));

        res.status(200).json({
          success: true,
          logic_page: {
            ...logicPage,
            inputs_json: logicPage.inputs_json ? JSON.parse(logicPage.inputs_json) : [],
            result_page_config: logicPage.result_page_config ? JSON.parse(logicPage.result_page_config) : null
          },
          inputs: parsedInputs
        });
      }
    );
  });
}

// PUT /api/logic-pages/[id] - Update logic page
function handleUpdateLogicPage(req, res, id) {
  const {
    title,
    description,
    status,
    inputs_json,
    backend_function,
    frontend_html,
    frontend_css,
    frontend_js,
    result_page_html,
    result_page_css,
    result_page_js,
    backend_chat_history,
    frontend_chat_history,
    result_chat_history,
    ai_context
  } = req.body;

  console.log('✏️ Updating logic page:', id);

  // Build dynamic update query
  const updates = [];
  const params = [];

  if (title !== undefined) {
    updates.push('title = ?');
    params.push(title);
  }
  if (description !== undefined) {
    updates.push('description = ?');
    params.push(description);
  }
  if (status !== undefined) {
    updates.push('status = ?');
    params.push(status);
  }
  if (inputs_json !== undefined) {
    updates.push('inputs_json = ?');
    params.push(typeof inputs_json === 'string' ? inputs_json : JSON.stringify(inputs_json));
  }
  if (backend_function !== undefined) {
    updates.push('backend_function = ?');
    params.push(backend_function);
  }
  if (frontend_html !== undefined) {
    updates.push('frontend_html = ?');
    params.push(frontend_html);
  }
  if (frontend_css !== undefined) {
    updates.push('frontend_css = ?');
    params.push(frontend_css);
  }
  if (frontend_js !== undefined) {
    updates.push('frontend_js = ?');
    params.push(frontend_js);
  }
  if (result_page_html !== undefined) {
    updates.push('result_page_html = ?');
    params.push(result_page_html);
  }
  if (result_page_css !== undefined) {
    updates.push('result_page_css = ?');
    params.push(result_page_css);
  }
  if (result_page_js !== undefined) {
    updates.push('result_page_js = ?');
    params.push(result_page_js);
  }
  if (backend_chat_history !== undefined) {
    updates.push('backend_chat_history = ?');
    params.push(typeof backend_chat_history === 'string' ? backend_chat_history : JSON.stringify(backend_chat_history));
  }
  if (frontend_chat_history !== undefined) {
    updates.push('frontend_chat_history = ?');
    params.push(typeof frontend_chat_history === 'string' ? frontend_chat_history : JSON.stringify(frontend_chat_history));
  }
  if (result_chat_history !== undefined) {
    updates.push('result_chat_history = ?');
    params.push(typeof result_chat_history === 'string' ? result_chat_history : JSON.stringify(result_chat_history));
  }
  if (ai_context !== undefined) {
    updates.push('ai_context = ?');
    params.push(ai_context);
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');

  // If publishing, set published_at
  if (status === 'published') {
    updates.push('published_at = CURRENT_TIMESTAMP');
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  params.push(id);

  const updateQuery = `UPDATE logic_pages SET ${updates.join(', ')} WHERE id = ?`;

  db.run(updateQuery, params, function(err) {
    if (err) {
      console.error('❌ Error updating logic page:', err);
      return res.status(500).json({ error: 'Failed to update logic page', details: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Logic page not found' });
    }

    console.log('✅ Logic page updated');

    // Fetch updated page
    db.get('SELECT * FROM logic_pages WHERE id = ?', [id], (err, logicPage) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch updated page', details: err.message });
      }

      res.status(200).json({
        success: true,
        message: 'Logic page updated successfully',
        logic_page: {
          ...logicPage,
          inputs_json: logicPage.inputs_json ? JSON.parse(logicPage.inputs_json) : []
        }
      });
    });
  });
}

// DELETE /api/logic-pages/[id] - Delete logic page
function handleDeleteLogicPage(req, res, id) {
  console.log('🗑️ Deleting logic page:', id);

  db.run('DELETE FROM logic_pages WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('❌ Error deleting logic page:', err);
      return res.status(500).json({ error: 'Failed to delete logic page', details: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Logic page not found' });
    }

    console.log('✅ Logic page deleted');

    res.status(200).json({
      success: true,
      message: 'Logic page deleted successfully'
    });
  });
}
