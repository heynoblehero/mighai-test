const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const emailService = require('../../../services/emailService');

const dbPath = path.join(process.cwd(), 'site_builder.db');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, email, password, otp } = req.body;

  if (!username || !email || !password || !otp) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const db = new sqlite3.Database(dbPath);

  try {
    // Verify OTP
    const isValidOTP = await emailService.verifyOTP(email, otp, 'customer_signup');
    
    if (!isValidOTP) {
      return res.status(401).json({ error: 'Invalid or expired verification code' });
    }

    // Check if user already exists (double check)
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

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const userId = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO users (username, email, password, role, verified) VALUES (?, ?, ?, ?, ?)',
        [username, email, hashedPassword, 'subscriber', 1],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    // Send admin notification about new subscriber
    try {
      await emailService.sendAdminNotification('new_subscriber', {
        email: email,
        planName: 'Free Plan', // Default plan
        totalSubscribers: await getUserCount(db)
      });
    } catch (notificationError) {
      console.error('Failed to send admin notification:', notificationError);
    }

    res.status(201).json({ 
      message: 'Account created successfully',
      userId: userId 
    });

  } catch (error) {
    console.error('Signup verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    db.close();
  }
}

// Helper function to get total user count
async function getUserCount(db) {
  return new Promise((resolve, reject) => {
    db.get('SELECT COUNT(*) as count FROM users WHERE role = ?', ['subscriber'], (err, row) => {
      if (err) reject(err);
      else resolve(row.count);
    });
  });
}