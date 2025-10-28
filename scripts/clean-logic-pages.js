const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.cwd(), 'site_builder.db');
const db = new sqlite3.Database(dbPath);

console.log('Cleaning up logic pages...');

db.serialize(() => {
  db.run(`DELETE FROM logic_pages WHERE slug IN ('password-generator', 'simple-calculator')`, (err) => {
    if (err) {
      console.error('Error deleting logic pages:', err);
    } else {
      console.log('✓ Old test pages deleted');
    }

    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
      } else {
        console.log('✅ Cleanup complete!');
      }
    });
  });
});
