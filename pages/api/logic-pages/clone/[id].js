import sqlite3 from 'sqlite3';
import path from 'path';

const db = new sqlite3.Database(path.join(process.cwd(), 'database.db'));

export default async function handler(req, res) {
  console.log('📋 Clone Logic Page API called:', req.method);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Logic page ID is required' });
  }

  try {
    // Fetch the original logic page
    db.get('SELECT * FROM logic_pages WHERE id = ?', [id], (err, logicPage) => {
      if (err) {
        console.error('❌ Error fetching logic page:', err);
        return res.status(500).json({ error: 'Database error', details: err.message });
      }

      if (!logicPage) {
        return res.status(404).json({ error: 'Logic page not found' });
      }

      // Generate unique slug
      const baseSlug = logicPage.slug;
      const newSlug = `${baseSlug}-copy-${Date.now()}`;
      const newTitle = `${logicPage.title} (Copy)`;
      const newBackendRoute = `/api/logic/${newSlug}`;

      // Check if slug already exists (unlikely but possible)
      db.get('SELECT id FROM logic_pages WHERE slug = ?', [newSlug], (err, existing) => {
        if (err) {
          console.error('❌ Error checking slug:', err);
          return res.status(500).json({ error: 'Database error', details: err.message });
        }

        if (existing) {
          return res.status(400).json({ error: 'Generated slug already exists. Please try again.' });
        }

        // Create the cloned logic page
        const insertQuery = `
          INSERT INTO logic_pages (
            title, slug, description, status, inputs_json,
            backend_function, backend_route, frontend_html,
            frontend_css, frontend_js, result_page_config,
            ai_context, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
          newTitle,
          newSlug,
          logicPage.description,
          'draft', // Always create clone as draft
          logicPage.inputs_json,
          logicPage.backend_function,
          newBackendRoute,
          logicPage.frontend_html,
          logicPage.frontend_css,
          logicPage.frontend_js,
          logicPage.result_page_config,
          logicPage.ai_context,
          logicPage.created_by
        ];

        db.run(insertQuery, values, function(err) {
          if (err) {
            console.error('❌ Error cloning logic page:', err);
            return res.status(500).json({ error: 'Failed to clone logic page', details: err.message });
          }

          const newId = this.lastID;

          // Fetch the newly created logic page
          db.get('SELECT * FROM logic_pages WHERE id = ?', [newId], (err, newLogicPage) => {
            if (err) {
              console.error('❌ Error fetching cloned logic page:', err);
              return res.status(500).json({ error: 'Failed to fetch cloned logic page', details: err.message });
            }

            console.log('✅ Logic page cloned successfully:', newId);

            res.status(200).json({
              success: true,
              logic_page: {
                ...newLogicPage,
                inputs_json: newLogicPage.inputs_json ? JSON.parse(newLogicPage.inputs_json) : [],
                result_page_config: newLogicPage.result_page_config ? JSON.parse(newLogicPage.result_page_config) : null
              },
              message: 'Logic page cloned successfully'
            });
          });
        });
      });
    });
  } catch (error) {
    console.error('❌ Error in clone handler:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
