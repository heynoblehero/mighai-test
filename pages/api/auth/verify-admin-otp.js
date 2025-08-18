const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const emailService = require('../../../services/emailService');
const { createSession } = require('../../../lib/session');

const dbPath = path.join(process.cwd(), 'site_builder.db');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, otp, username } = req.body;

  if (!email || !otp || !username) {
    return res.status(400).json({ error: 'Email, OTP, and username are required' });
  }

  const db = new sqlite3.Database(dbPath);

  try {
    // Verify OTP
    const isValidOTP = await emailService.verifyOTP(email, otp, 'admin_login');
    
    if (!isValidOTP) {
      return res.status(401).json({ error: 'Invalid or expired OTP' });
    }

    // Get user info again to create session
    const user = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM users WHERE email = ? AND username = ? AND role = ?',
        [email, username, 'admin'],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found or invalid permissions' });
    }

    // Create secure session
    const sessionUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };

    const sessionToken = await createSession(sessionUser);

    // Set secure session cookie
    res.setHeader('Set-Cookie', [
      `session_token=${sessionToken}; HttpOnly; Path=/; SameSite=Strict; Max-Age=86400${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
    ]);

    const { password: _, ...userWithoutPassword } = user;
    res.status(200).json({ 
      message: 'Admin login successful',
      user: userWithoutPassword 
    });

  } catch (error) {
    console.error('Admin OTP verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    db.close();
  }
}