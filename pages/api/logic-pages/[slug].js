const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.cwd(), 'site_builder.db');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { slug } = req.query;

  const db = new sqlite3.Database(dbPath);

  try {
    // Get the logic page
    db.get(
      `SELECT * FROM logic_pages WHERE slug = ? AND is_active = 1`,
      [slug],
      (err, page) => {
        if (err) {
          db.close();
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        if (!page) {
          db.close();
          return res.status(404).json({ error: 'Logic page not found' });
        }

        // Get the fields for this page
        db.all(
          `SELECT * FROM logic_page_fields WHERE logic_page_id = ? ORDER BY order_index`,
          [page.id],
          (fieldsErr, fields) => {
            db.close();

            if (fieldsErr) {
              console.error('Fields error:', fieldsErr);
              return res.status(500).json({ error: 'Failed to load fields' });
            }

            // Parse JSON configs
            try {
              const parsedPage = {
                ...page,
                frontend_config: page.frontend_config ? JSON.parse(page.frontend_config) : {},
                backend_config: page.backend_config ? JSON.parse(page.backend_config) : {},
                result_config: page.result_config ? JSON.parse(page.result_config) : {}
              };

              res.json({
                success: true,
                page: parsedPage,
                fields: fields || []
              });
            } catch (parseError) {
              console.error('Parse error:', parseError);
              res.status(500).json({ error: 'Invalid page configuration' });
            }
          }
        );
      }
    );
  } catch (error) {
    console.error('Error fetching logic page:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
