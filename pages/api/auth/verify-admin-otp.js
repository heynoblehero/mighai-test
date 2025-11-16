const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const emailService = require('../../../services/emailService');
const telegramOTPService = require('../../../services/telegramOTPService');
const { createSession } = require('../../../lib/session');

const dbPath = path.join(process.cwd(), 'site_builder.db');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, otp, username, userId } = req.body;

  if ((!email && !userId) || !otp || !username) {
    return res.status(400).json({ error: 'Email/User ID, OTP, and username are required' });
  }

  const db = new sqlite3.Database(dbPath);

  try {
    // Get user first to check 2FA settings
    const user = await new Promise((resolve, reject) => {
      const query = userId
        ? 'SELECT * FROM users WHERE id = ? AND username = ? AND role = ?'
        : 'SELECT * FROM users WHERE email = ? AND username = ? AND role = ?';
      const params = userId ? [userId, username, 'admin'] : [email, username, 'admin'];

      db.get(query, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found or invalid permissions' });
    }

    // Check if user has 2FA enabled
    const twoFASettings = await telegramOTPService.get2FASettings(user.id);

    let isValidOTP = false;

    if (twoFASettings && twoFASettings.is_enabled && twoFASettings.require_on_login) {
      // Verify using Telegram 2FA system
      const verifyResult = await telegramOTPService.verifyOTP(user.id, otp, 'login');
      isValidOTP = verifyResult.success;
    } else {
      // Fallback to email OTP verification
      isValidOTP = await emailService.verifyOTP(user.email, otp, 'admin_login');
    }

    if (!isValidOTP) {
      return res.status(401).json({ error: 'Invalid or expired OTP' });
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