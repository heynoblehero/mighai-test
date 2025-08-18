const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const emailService = require('../../../services/emailService');

const dbPath = path.join(process.cwd(), 'site_builder.db');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const db = new sqlite3.Database(dbPath);

  try {
    // Find user
    const user = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM users WHERE username = ? OR email = ?',
        [username, username],
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

    // Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Send OTP email
    try {
      await emailService.sendOTP(user.email, 'admin_login', 10);
      
      // Return user info (without password) but don't create session yet
      const { password: _, ...userWithoutPassword } = user;
      res.status(200).json({ 
        message: 'OTP sent successfully',
        user: userWithoutPassword 
      });
    } catch (emailError) {
      console.error('Failed to send OTP:', emailError);
      res.status(500).json({ error: 'Failed to send verification code' });
    }

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    db.close();
  }
}