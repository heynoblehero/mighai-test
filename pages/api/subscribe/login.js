const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const jwt = require('jsonwebtoken');
const config = require('../../../lib/config');

const dbPath = path.join(process.cwd(), 'site_builder.db');

export default async function handler(req, res) {
  console.log('=== LOGIN ENDPOINT HIT ===');
  console.log('Method:', req.method);
  console.log('Body:', req.body);
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const db = new sqlite3.Database(dbPath);

  try {
    // Find user
    const user = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM users WHERE email = ? AND role = ?',
        [email, 'subscriber'],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }


    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role,
        username: user.username 
      },
      config.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set cookie
    res.setHeader('Set-Cookie', `auth-token=${token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Strict`);

    // Return user info (without password)
    const { password: _, ...userWithoutPassword } = user;
    res.status(200).json({ 
      message: 'Login successful',
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Subscriber login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    db.close();
  }
}