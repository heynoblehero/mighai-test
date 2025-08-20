const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

console.log('Setting up Site Builder database...');

const db = new sqlite3.Database('./site_builder.db');

db.serialize(() => {
  // Create users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Create dynamic pages table
  db.run(`CREATE TABLE IF NOT EXISTS pages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    meta_description TEXT,
    html_content TEXT NOT NULL,
    css_content TEXT,
    js_content TEXT,
    is_published BOOLEAN DEFAULT true,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users (id)
  )`);

  // Create blog posts table
  db.run(`CREATE TABLE IF NOT EXISTS blog_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    featured_image TEXT,
    is_published BOOLEAN DEFAULT false,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users (id)
  )`);

  // Create default admin user
  const defaultPassword = bcrypt.hashSync('admin123', 10);
  db.run(`INSERT OR IGNORE INTO users (username, email, password, role) 
          VALUES ('admin', 'admin@example.com', ?, 'admin')`, [defaultPassword], function(err) {
    if (err) {
      console.error('Error creating admin user:', err);
    } else if (this.changes > 0) {
      console.log('✅ Default admin user created: admin@example.com / admin123');
    } else {
      console.log('✅ Admin user already exists');
    }
  });

  // Insert sample page
  db.run(`INSERT OR IGNORE INTO pages (slug, title, meta_description, html_content, css_content, is_published, created_by) 
          VALUES (?, ?, ?, ?, ?, ?, ?)`, 
    [
      'sample-page',
      'Sample Page',
      'This is a sample page created by the site builder',
      `<div class="container">
        <h1>Welcome to Our Sample Page!</h1>
        <p>This page was created using our site builder admin panel.</p>
        <p>You can create pages with custom HTML, CSS, and JavaScript!</p>
      </div>`,
      `body { 
        font-family: Arial, sans-serif; 
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        margin: 0;
        padding: 20px;
      }
      .container { 
        max-width: 800px; 
        margin: 0 auto; 
        padding: 40px;
        background: rgba(255,255,255,0.1);
        border-radius: 10px;
      }
      h1 { 
        color: #fff; 
        text-align: center;
        margin-bottom: 30px;
      }
      p {
        line-height: 1.6;
        font-size: 18px;
      }`,
      true,
      1
    ], function(err) {
      if (err) {
        console.error('Error creating sample page:', err);
      } else if (this.changes > 0) {
        console.log('✅ Sample page created: /sample-page');
      }
    });
});

db.close((err) => {
  if (err) {
    console.error('Error closing database:', err);
  } else {
    console.log('✅ Database setup completed successfully!');
    console.log('\nTo get started:');
    console.log('1. Run: npm install');
    console.log('2. Run: npm run dev');
    console.log('3. Visit: http://localhost:5000');
    console.log('4. Login at: http://localhost:5000/login');
    console.log('5. Admin panel: http://localhost:5000/admin');
    console.log('\nDefault credentials: admin@example.com / admin123');
  }
});