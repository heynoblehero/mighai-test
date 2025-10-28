const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.cwd(), 'site_builder.db');
const db = new sqlite3.Database(dbPath);

console.log('Initializing logic_pages tables...');

db.serialize(() => {
  // Create logic_pages table
  db.run(`
    CREATE TABLE IF NOT EXISTS logic_pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      access_level TEXT DEFAULT 'public',
      is_active INTEGER DEFAULT 1,
      backend_code TEXT,
      frontend_code TEXT,
      backend_config TEXT,
      frontend_config TEXT,
      result_config TEXT,
      store_results INTEGER DEFAULT 1,
      store_analytics INTEGER DEFAULT 1,
      max_executions_per_user INTEGER DEFAULT 10,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating logic_pages table:', err);
    } else {
      console.log('✓ logic_pages table created/verified');
    }
  });

  // Create logic_page_fields table
  db.run(`
    CREATE TABLE IF NOT EXISTS logic_page_fields (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      logic_page_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      label TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      required INTEGER DEFAULT 0,
      placeholder TEXT,
      order_index INTEGER DEFAULT 0,
      options TEXT,
      validation_rules TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (logic_page_id) REFERENCES logic_pages(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) {
      console.error('Error creating logic_page_fields table:', err);
    } else {
      console.log('✓ logic_page_fields table created/verified');
    }
  });

  // Create logic_page_executions table for tracking
  db.run(`
    CREATE TABLE IF NOT EXISTS logic_page_executions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      logic_page_id INTEGER NOT NULL,
      input_data TEXT,
      output_data TEXT,
      success INTEGER DEFAULT 1,
      error_message TEXT,
      execution_time_ms INTEGER,
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (logic_page_id) REFERENCES logic_pages(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) {
      console.error('Error creating logic_page_executions table:', err);
    } else {
      console.log('✓ logic_page_executions table created/verified');
    }
  });

  // Close database
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('\n✅ Database initialization complete!');
    }
  });
});
