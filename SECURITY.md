# Security Documentation

## Brute Force Protection System

This application implements enterprise-grade security measures to protect against brute force attacks, credential stuffing, and automated attacks on both admin and customer login panels.

---

## 🛡️ Security Features

### 1. Account Lockout System

**Automatic Account Locking:**
- After **5 failed login attempts**, accounts are automatically locked for **30 minutes**
- Lock status is checked before every login attempt
- Accounts auto-unlock after the lockout period expires
- Failed attempt counter resets to 0 on successful login

**Database Fields:**
```sql
failed_login_attempts INTEGER   -- Counter for failed attempts
locked_until DATETIME           -- Timestamp when lock expires
last_failed_login DATETIME      -- Last failed attempt time
last_successful_login DATETIME  -- Last successful login
last_login_ip TEXT             -- IP of last login
```

---

### 2. IP-Based Rate Limiting

**Login Endpoints:**
- **10 login attempts per 15 minutes** per IP address
- Blocks excessive requests from the same IP
- Returns HTTP 429 (Too Many Requests) when limit exceeded

**OTP Endpoints:**
- **5 OTP requests per hour** per email/IP combination
- Prevents OTP flooding and email enumeration attacks
- **10 OTP verification attempts per 15 minutes**

**IP Blocking:**
- After **20 failed login attempts** from the same IP, the IP is blocked for **24 hours**
- Tracks attempts across all users from that IP

---

### 3. Progressive Delays (Speed Limiting)

Implements exponential backoff to slow down attackers:

| Attempt # | Delay        |
|-----------|--------------|
| 1-2       | Instant      |
| 3         | 1 second     |
| 4         | 2 seconds    |
| 5         | 4 seconds    |
| 6+        | Account locked |

Maximum delay is capped at 30 seconds to prevent DoS.

---

### 4. Device Fingerprinting

**What is tracked:**
- Browser name and version
- Operating system
- Device type (desktop, mobile, tablet)
- User-Agent string
- Accept-Language header
- Accept-Encoding header

**Fingerprint Creation:**
```javascript
SHA256(userAgent + acceptLanguage + acceptEncoding + browser + os + device)
```

**Purpose:**
- Detect attacks from rotating IPs (proxy/VPN attacks)
- Identify suspicious device patterns
- Track login attempts across different IPs from same device

---

### 5. Proxy Protection

**Multi-Source IP Detection:**
The system extracts the real client IP from multiple headers to handle proxies:

1. `CF-Connecting-IP` (Cloudflare)
2. `X-Real-IP` (Nginx/Reverse Proxy)
3. `X-Forwarded-For` (Standard proxy header)
4. `req.socket.remoteAddress` (Direct connection)

**Why this matters:**
Attackers using proxies or VPNs to rotate IPs are still tracked via device fingerprinting.

---

### 6. Comprehensive Audit Logging

**Login Attempts Table:**
```sql
CREATE TABLE login_attempts (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  device_fingerprint TEXT,
  attempt_type TEXT,           -- 'admin', 'customer', 'otp'
  success BOOLEAN,
  failure_reason TEXT,
  attempted_at DATETIME
)
```

**Security Events Table:**
```sql
CREATE TABLE security_events (
  id INTEGER PRIMARY KEY,
  event_type TEXT NOT NULL,
  severity TEXT,               -- 'low', 'medium', 'high', 'critical'
  user_id INTEGER,
  email TEXT,
  ip_address TEXT,
  user_agent TEXT,
  device_fingerprint TEXT,
  event_data TEXT,             -- JSON blob with additional context
  created_at DATETIME
)
```

**Event Types:**
- `failed_login_attempt` - Invalid credentials
- `account_locked` - Account locked due to excessive failures
- `locked_account_attempt` - Login attempt on locked account
- `ip_blocked` - IP address blocked
- `blocked_attempt` - Attempt from blocked IP
- `admin_login_success` / `customer_login_success` - Successful logins
- `failed_otp_verification` - Invalid OTP entered
- `unauthorized_access_attempt` - Non-admin trying admin panel
- `signup_otp_sent` / `otp_send_failed` - OTP delivery events
- `login_system_error` - Internal errors

---

### 7. Protected Endpoints

| Endpoint | Protection | Rate Limit |
|----------|-----------|------------|
| `/api/auth/admin-login` | Brute force + Rate limit + Speed limit | 10/15min |
| `/api/auth/verify-admin-otp` | OTP rate limit + Attempt tracking | 10/15min |
| `/api/subscribe/login` | Brute force + Rate limit + Speed limit | 10/15min |
| `/api/subscribe/send-signup-otp` | OTP rate limit + Email enumeration protection | 5/hour |

---

## 📊 Security Configuration

**Located in:** `lib/security.js`

```javascript
const SECURITY_CONFIG = {
  LOGIN_MAX_ATTEMPTS: 5,                  // Failed attempts before lockout
  LOGIN_LOCKOUT_DURATION: 30 * 60 * 1000, // 30 minutes
  LOGIN_ATTEMPT_WINDOW: 15 * 60 * 1000,   // 15 minutes
  OTP_MAX_ATTEMPTS: 3,                    // OTP verification attempts
  OTP_LOCKOUT_DURATION: 60 * 60 * 1000,   // 1 hour
  PROGRESSIVE_DELAY_BASE: 1000,           // 1 second base delay
  IP_BLOCK_THRESHOLD: 20,                 // Block IP after 20 failures
  IP_BLOCK_DURATION: 24 * 60 * 60 * 1000, // 24 hours
};
```

---

## 🚨 Security Responses

### Account Locked
```json
{
  "error": "Account is locked due to too many failed login attempts. Please try again in 15 minutes.",
  "code": "ACCOUNT_LOCKED",
  "minutesRemaining": 15
}
```

### IP Blocked
```json
{
  "error": "Too many failed attempts from this IP address. Please try again later.",
  "code": "IP_BLOCKED",
  "retryAfter": 3600
}
```

### Rate Limit Exceeded
```json
{
  "error": "Too many login attempts from this IP, please try again later.",
  "code": "RATE_LIMIT_EXCEEDED"
}
```

### OTP Rate Limit
```json
{
  "error": "Too many OTP requests, please try again later.",
  "code": "OTP_RATE_LIMIT_EXCEEDED"
}
```

---

## 🔍 Monitoring Security Events

### Query Failed Login Attempts
```sql
SELECT
  email,
  ip_address,
  COUNT(*) as attempts,
  MAX(attempted_at) as last_attempt
FROM login_attempts
WHERE success = 0
  AND attempted_at > datetime('now', '-1 hour')
GROUP BY email, ip_address
HAVING attempts >= 3
ORDER BY attempts DESC;
```

### Query Locked Accounts
```sql
SELECT
  email,
  username,
  failed_login_attempts,
  locked_until,
  last_failed_login
FROM users
WHERE locked_until IS NOT NULL
  AND locked_until > datetime('now');
```

### Query Security Events by Severity
```sql
SELECT
  event_type,
  COUNT(*) as count,
  GROUP_CONCAT(DISTINCT email) as affected_users
FROM security_events
WHERE severity IN ('high', 'critical')
  AND created_at > datetime('now', '-24 hours')
GROUP BY event_type
ORDER BY count DESC;
```

### Query Suspicious IPs
```sql
SELECT
  ip_address,
  COUNT(DISTINCT email) as unique_targets,
  COUNT(*) as total_attempts,
  MAX(attempted_at) as last_seen
FROM login_attempts
WHERE success = 0
  AND attempted_at > datetime('now', '-1 hour')
GROUP BY ip_address
HAVING unique_targets > 3 OR total_attempts > 10
ORDER BY total_attempts DESC;
```

---

## 🛠️ Implementation Details

### Middleware Stack
```javascript
// Applied to login endpoints
1. loginRateLimiter      // IP-based rate limiting (10/15min)
2. loginSpeedLimiter     // Progressive delays
3. bruteForceProtection  // Account lockout + tracking
```

### Security Context
Each protected request gets a `securityContext` object:
```javascript
req.securityContext = {
  ip,                    // Client IP address
  userAgent,             // User-Agent header
  deviceFingerprint,     // Unique device hash
  deviceInfo: {
    browser,             // Browser name
    os,                  // Operating system
    device,              // Device type
  },
  attemptType,           // 'admin' or 'customer'
  currentAttempts,       // Failed attempts so far
  recordFailure(reason), // Record failed login
  recordSuccess(),       // Record successful login
  logEvent(type, severity, data), // Log security event
};
```

---

## 📦 Dependencies

```json
{
  "express-rate-limit": "^7.x",
  "express-slow-down": "^2.x",
  "ua-parser-js": "^1.x"
}
```

---

## ✅ Security Best Practices Implemented

- ✅ **Defense in Depth**: Multiple layers of protection (rate limiting + account lockout + IP blocking)
- ✅ **Progressive Response**: Gentle delays escalating to hard blocks
- ✅ **Audit Trail**: Complete logging of all authentication events
- ✅ **Automatic Recovery**: Auto-unlock prevents permanent lockouts
- ✅ **Proxy Protection**: Device fingerprinting defeats IP rotation
- ✅ **Email Enumeration Prevention**: Rate limits + timing-safe responses
- ✅ **OTP Flooding Prevention**: Strict limits on OTP generation
- ✅ **Credential Stuffing Protection**: Rate limits + progressive delays
- ✅ **Distributed Attack Protection**: IP + device fingerprint tracking
- ✅ **No Sensitive Data in Logs**: Passwords never logged, only events

---

## 🚀 Future Enhancements

Consider implementing:

1. **CAPTCHA Integration** - Add Google reCAPTCHA after 3 failed attempts
2. **Redis for Rate Limiting** - Distributed rate limiting across multiple servers
3. **Geolocation Blocking** - Block logins from specific countries
4. **Anomaly Detection** - ML-based unusual login pattern detection
5. **Security Dashboard** - Admin UI to view security events in real-time
6. **Email Notifications** - Alert users of failed login attempts
7. **Suspicious Device Alerts** - Notify on login from new device
8. **Time-Based Restrictions** - Limit login attempts during specific hours
9. **Honeypot Fields** - Catch bots with invisible form fields
10. **Magic Link Login** - Passwordless authentication option

---

## 📞 Support

For security concerns or questions:
- Review security events in the database: `security_events` table
- Check login attempts: `login_attempts` table
- Monitor locked accounts: `SELECT * FROM users WHERE locked_until > datetime('now')`

---

**Last Updated:** 2025-11-16
**Version:** 1.0.0
