import sqlite3 from 'sqlite3';
import path from 'path';

const db = new sqlite3.Database(path.join(process.cwd(), 'database.db'));

export default async function handler(req, res) {
  console.log('🔧 Logic Pages API called:', req.method);

  if (req.method === 'GET') {
    // List all logic pages
    return handleGetLogicPages(req, res);
  } else if (req.method === 'POST') {
    // Create new logic page
    return handleCreateLogicPage(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

// GET /api/logic-pages - List all logic pages
function handleGetLogicPages(req, res) {
  const { status, search, slug } = req.query;

  let query = 'SELECT * FROM logic_pages WHERE 1=1';
  const params = [];

  // Exact slug match (for public pages)
  if (slug) {
    query += ' AND slug = ?';
    params.push(slug);
  }

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  if (search) {
    query += ' AND (title LIKE ? OR description LIKE ? OR slug LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  query += ' ORDER BY created_at DESC';

  db.all(query, params, (err, logicPages) => {
    if (err) {
      console.error('❌ Error fetching logic pages:', err);
      return res.status(500).json({ error: 'Failed to fetch logic pages', details: err.message });
    }

    // Parse JSON fields
    const parsedPages = logicPages.map(page => ({
      ...page,
      inputs_json: page.inputs_json ? JSON.parse(page.inputs_json) : [],
      result_page_config: page.result_page_config ? JSON.parse(page.result_page_config) : null
    }));

    res.status(200).json({
      success: true,
      logic_pages: parsedPages,
      count: parsedPages.length
    });
  });
}

// POST /api/logic-pages - Create new logic page
function handleCreateLogicPage(req, res) {
  const {
    title,
    slug,
    description,
    status = 'draft',
    ai_context = ''
  } = req.body;

  console.log('📝 Creating logic page:', { title, slug });

  if (!title || !slug || !description) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['title', 'slug', 'description']
    });
  }

  // Validate slug format (lowercase, hyphens only)
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  if (!slugRegex.test(slug)) {
    return res.status(400).json({
      error: 'Invalid slug format. Use lowercase letters, numbers, and hyphens only.'
    });
  }

  // Check if slug already exists
  db.get('SELECT id FROM logic_pages WHERE slug = ?', [slug], (err, existing) => {
    if (err) {
      console.error('❌ Error checking slug:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }

    if (existing) {
      return res.status(400).json({ error: 'Slug already exists. Please choose a different slug.' });
    }

    // Create backend route based on slug
    const backend_route = `/api/logic/${slug}`;

    // Insert logic page
    const insertQuery = `
      INSERT INTO logic_pages (
        title, slug, description, status, backend_route, ai_context, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    // For now, using user_id = 1 (admin). In production, get from session
    const created_by = 1;

    db.run(insertQuery, [title, slug, description, status, backend_route, ai_context, created_by], function(err) {
      if (err) {
        console.error('❌ Error creating logic page:', err);
        return res.status(500).json({ error: 'Failed to create logic page', details: err.message });
      }

      console.log('✅ Logic page created:', this.lastID);

      // Fetch the created page
      db.get('SELECT * FROM logic_pages WHERE id = ?', [this.lastID], (err, logicPage) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to fetch created page', details: err.message });
        }

        res.status(201).json({
          success: true,
          message: 'Logic page created successfully',
          logic_page: {
            ...logicPage,
            inputs_json: logicPage.inputs_json ? JSON.parse(logicPage.inputs_json) : []
          }
        });
      });
    });
  });
}
