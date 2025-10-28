const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.cwd(), 'site_builder.db');
const db = new sqlite3.Database(dbPath);

console.log('Running migration to add missing columns...');

db.serialize(() => {
  // Add store_results column
  db.run(`ALTER TABLE logic_pages ADD COLUMN store_results INTEGER DEFAULT 1`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding store_results column:', err.message);
    } else {
      console.log('✓ store_results column added/exists');
    }
  });

  // Add store_analytics column
  db.run(`ALTER TABLE logic_pages ADD COLUMN store_analytics INTEGER DEFAULT 1`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding store_analytics column:', err.message);
    } else {
      console.log('✓ store_analytics column added/exists');
    }
  });

  // Add max_executions_per_user column
  db.run(`ALTER TABLE logic_pages ADD COLUMN max_executions_per_user INTEGER DEFAULT 10`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding max_executions_per_user column:', err.message);
    } else {
      console.log('✓ max_executions_per_user column added/exists');
    }
  });

  // Add created_by column
  db.run(`ALTER TABLE logic_pages ADD COLUMN created_by INTEGER`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding created_by column:', err.message);
    } else {
      console.log('✓ created_by column added/exists');
    }
  });

  // Close database
  setTimeout(() => {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
      } else {
        console.log('\n✅ Migration complete!');
      }
    });
  }, 1000);
});
