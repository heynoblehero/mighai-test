const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const emailService = require('../../../services/emailService');

const dbPath = path.join(process.cwd(), 'site_builder.db');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }

  const db = new sqlite3.Database(dbPath);

  try {
    // Check if user already exists
    const existingUser = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM users WHERE username = ? OR email = ?',
        [username, email],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (existingUser) {
      return res.status(400).json({ 
        error: existingUser.username === username ? 'Username already exists' : 'Email already registered' 
      });
    }

    // Send OTP email
    try {
      await emailService.sendOTP(email, 'customer_signup', 15);
      
      res.status(200).json({ 
        message: 'Verification code sent to your email',
        email: email 
      });
    } catch (emailError) {
      console.error('Failed to send signup OTP:', emailError);
      res.status(500).json({ error: 'Failed to send verification code' });
    }

  } catch (error) {
    console.error('Signup OTP error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    db.close();
  }
}