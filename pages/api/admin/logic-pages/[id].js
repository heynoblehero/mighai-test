const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.cwd(), 'database.db');
const db = new sqlite3.Database(dbPath);

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'DELETE') {
    // Delete logic page
    try {
      db.run('DELETE FROM logic_pages WHERE id = ?', [id], function(err) {
        if (err) {
          console.error('Error deleting logic page:', err);
          return res.status(500).json({ error: 'Failed to delete page' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: 'Page not found' });
        }

        res.json({ success: true, message: 'Page deleted successfully' });
      });
    } catch (error) {
      console.error('Error in DELETE logic page:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'GET') {
    // Get single logic page
    try {
      db.get('SELECT * FROM logic_pages WHERE id = ?', [id], (err, page) => {
        if (err) {
          console.error('Error fetching logic page:', err);
          return res.status(500).json({ error: 'Failed to fetch page' });
        }

        if (!page) {
          return res.status(404).json({ error: 'Page not found' });
        }

        // Parse JSON fields
        const formattedPage = {
          ...page,
          frontend_config: page.frontend_config ? JSON.parse(page.frontend_config) : {},
          backend_config: page.backend_config ? JSON.parse(page.backend_config) : {},
          result_config: page.result_config ? JSON.parse(page.result_config) : {}
        };

        res.json({ page: formattedPage });
      });
    } catch (error) {
      console.error('Error in GET logic page:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'PUT') {
    // Update logic page
    try {
      const {
        name,
        slug,
        description,
        access_level,
        inputs,
        backend_config,
        frontend_config,
        result_config
      } = req.body;

      // Validate required fields
      if (!name || !slug || !description) {
        return res.status(400).json({ error: 'Name, slug, and description are required' });
      }

      // Check if slug already exists for a different page
      db.get('SELECT id FROM logic_pages WHERE slug = ? AND id != ?', [slug, id], (err, existingPage) => {
        if (err) {
          console.error('Error checking slug:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        if (existingPage) {
          return res.status(400).json({ error: 'Slug already exists' });
        }

        // Update the logic page
        db.run(
          `UPDATE logic_pages SET
           name = ?, slug = ?, description = ?, access_level = ?,
           frontend_config = ?, backend_config = ?, result_config = ?,
           updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [
            name,
            slug,
            description,
            access_level || 'public',
            JSON.stringify(frontend_config || {}),
            JSON.stringify(backend_config || {}),
            JSON.stringify(result_config || {}),
            id
          ],
          function(err) {
            if (err) {
              console.error('Error updating logic page:', err);
              return res.status(500).json({ error: 'Failed to update page' });
            }

            if (this.changes === 0) {
              return res.status(404).json({ error: 'Page not found' });
            }

            // Update input fields if provided
            if (inputs && inputs.length > 0) {
              // Delete existing fields
              db.run('DELETE FROM logic_page_fields WHERE logic_page_id = ?', [id], (delErr) => {
                if (delErr) {
                  console.error('Error deleting old fields:', delErr);
                  return res.status(500).json({ error: 'Failed to update fields' });
                }

                // Insert new fields
                const insertFieldQuery = `INSERT INTO logic_page_fields (
                  logic_page_id, field_name, field_label, field_type,
                  field_options, is_required, placeholder, help_text, order_index
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

                const fieldPromises = inputs.map((input, index) => {
                  return new Promise((resolve, reject) => {
                    db.run(
                      insertFieldQuery,
                      [
                        id,
                        input.name,
                        input.label || input.name,
                        input.type,
                        JSON.stringify(input.options || {}),
                        input.required || false,
                        input.placeholder || '',
                        input.description || '',
                        index
                      ],
                      (err) => {
                        if (err) reject(err);
                        else resolve();
                      }
                    );
                  });
                });

                Promise.all(fieldPromises)
                  .then(() => {
                    res.json({
                      success: true,
                      message: 'Logic page updated successfully'
                    });
                  })
                  .catch((error) => {
                    console.error('Error updating fields:', error);
                    res.status(500).json({ error: 'Failed to update input fields' });
                  });
              });
            } else {
              res.json({
                success: true,
                message: 'Logic page updated successfully'
              });
            }
          }
        );
      });
    } catch (error) {
      console.error('Error in PUT logic page:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).json({ error: 'Method not allowed' });
  }
}