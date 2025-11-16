# Complete SaaS Builder Tutorial: Build a Task Management App

Welcome! This comprehensive tutorial will guide you through building a complete Task Management SaaS product from scratch. By the end, you'll have a fully functional, production-ready application with authentication, payments, and analytics.

---

## 📚 Table of Contents

1. [Introduction](#introduction)
2. [What We're Building](#what-were-building)
3. [Prerequisites](#prerequisites)
4. [Part 1: Planning & Design](#part-1-planning--design)
5. [Part 2: Building the Frontend](#part-2-building-the-frontend)
6. [Part 3: Database & Backend](#part-3-database--backend)
7. [Part 4: Authentication & User Management](#part-4-authentication--user-management)
8. [Part 5: Monetization & Payments](#part-5-monetization--payments)
9. [Part 6: Analytics & Monitoring](#part-6-analytics--monitoring)
10. [Part 7: Deployment & Launch](#part-7-deployment--launch)
11. [Advanced Features](#advanced-features)
12. [Best Practices](#best-practices)

---

## Introduction

### What You'll Learn

- ✅ How to plan and design a SaaS product
- ✅ Building responsive, beautiful UIs without code
- ✅ Designing and implementing databases
- ✅ Creating custom API endpoints
- ✅ User authentication and authorization
- ✅ Subscription billing integration
- ✅ Analytics and user tracking
- ✅ Deploying to production

### Estimated Time

- **Total:** 2-3 hours
- **MVP (Minimum Viable Product):** 45 minutes
- **Full Featured:** 3 hours

---

## What We're Building

**TaskFlow** - A modern task management SaaS that helps teams organize work and boost productivity.

### Core Features

1. **Task Management**
   - Create, edit, and delete tasks
   - Assign tasks to team members
   - Set priorities and due dates
   - Add tags and categories
   - Task comments and activity log

2. **Projects & Organization**
   - Create projects to group tasks
   - Invite team members to projects
   - Project-level analytics
   - Archive completed projects

3. **User Dashboard**
   - Today's tasks overview
   - Upcoming deadlines
   - Productivity charts
   - Recent activity feed

4. **Subscription Tiers**
   - **Free:** Up to 10 tasks, 1 project
   - **Pro ($19/mo):** Unlimited tasks & projects, advanced features
   - **Enterprise ($99/mo):** Teams, custom integrations, priority support

5. **Analytics & Insights**
   - Task completion rates
   - Productivity trends
   - Team performance metrics
   - Custom reports

---

## Prerequisites

### What You Need

- ✅ Access to this SaaS builder platform
- ✅ Basic understanding of web concepts (pages, forms, databases)
- ✅ **No coding required!** (But code knowledge helps for customization)
- ✅ An email for testing
- ✅ Lemon Squeezy account (for payments - free to set up)

### Recommended

- A text editor (for notes and planning)
- A notepad for sketching user flows
- 2-3 hours of uninterrupted time

---

## Part 1: Planning & Design

### Step 1.1: Define Your Features

Before building, let's plan what we need:

#### Essential Features (MVP)
```
✓ User Registration & Login
✓ Create Task
✓ View Tasks List
✓ Mark Task as Complete
✓ Delete Task
```

#### Nice-to-Have Features (V2)
```
○ Task Editing
○ Due Dates
○ Priorities
○ Tags/Categories
○ Team Collaboration
○ Comments
○ File Attachments
```

**💡 Pro Tip:** Start with the MVP, get it working, then add features incrementally.

---

### Step 1.2: Design Your Database Schema

Our app needs 4 main tables:

#### 1. Users Table (Already Exists)
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,  -- Hashed
  role TEXT DEFAULT 'subscriber',
  plan_id INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. Tasks Table
```sql
CREATE TABLE tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',  -- pending, in_progress, completed
  priority TEXT DEFAULT 'medium',  -- low, medium, high, urgent
  assigned_to INTEGER,  -- user_id
  created_by INTEGER NOT NULL,  -- user_id
  project_id INTEGER,
  due_date DATETIME,
  tags TEXT DEFAULT '[]',  -- JSON array
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assigned_to) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (project_id) REFERENCES projects(id)
);
```

#### 3. Projects Table
```sql
CREATE TABLE projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  owner_id INTEGER NOT NULL,
  team_members TEXT DEFAULT '[]',  -- JSON array of user_ids
  status TEXT DEFAULT 'active',  -- active, on_hold, completed, archived
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);
```

#### 4. Comments Table
```sql
CREATE TABLE comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  comment TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

### Step 1.3: Plan Your Pages

#### Public Pages
1. **Landing Page** (`/`)
   - Hero section
   - Features showcase
   - Pricing table
   - CTA buttons

2. **Login Page** (`/customer-login`)
   - Email/password form
   - "Forgot password" link
   - "Sign up" link

#### Customer/User Pages
3. **Dashboard** (`/dashboard`)
   - Today's tasks
   - Quick stats
   - Recent activity

4. **Tasks Page** (`/tasks`)
   - All tasks list
   - Filters (status, priority, project)
   - Create new task button

5. **Task Detail Page** (`/tasks/[id]`)
   - Task info
   - Comments section
   - Edit/delete options

6. **Projects Page** (`/projects`)
   - All projects list
   - Create project button

7. **Analytics Page** (`/analytics`)
   - Charts and insights
   - Productivity metrics

8. **Settings Page** (`/settings`)
   - Profile settings
   - Subscription management
   - Team management

---

### Step 1.4: Design Your User Flow

```
┌─────────────────────────────────────────┐
│         Visitor arrives at /            │
│      (Landing Page with features)       │
└────────────┬────────────────────────────┘
             │
             ├─── Clicks "Sign Up" ───┐
             │                        │
             │                        ▼
             │              ┌──────────────────┐
             │              │  Choose Plan     │
             │              │  (Free/Pro/Ent)  │
             │              └────────┬─────────┘
             │                       │
             │                       ▼
             │              ┌──────────────────┐
             │              │ Create Account   │
             │              │ (Email/Password) │
             │              └────────┬─────────┘
             │                       │
             └────── or ─────────────┘
                                     │
                                     ▼
                            ┌──────────────────┐
                            │   /dashboard     │
                            │  (User logged in)│
                            └────────┬─────────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              │                      │                      │
              ▼                      ▼                      ▼
      ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
      │  View Tasks  │      │ View Projects│      │  Analytics   │
      └──────┬───────┘      └──────┬───────┘      └──────────────┘
             │                     │
             ▼                     ▼
      ┌──────────────┐      ┌──────────────┐
      │ Create Task  │      │Create Project│
      └──────┬───────┘      └──────┬───────┘
             │                     │
             ▼                     ▼
      ┌──────────────┐      ┌──────────────┐
      │  Edit/Delete │      │ Manage Team  │
      └──────────────┘      └──────────────┘
```

---

## Part 2: Building the Frontend

### Step 2.1: Create the Landing Page

**Navigate to:** Admin Panel → Content → Reserved Pages → Landing Page

#### Hero Section

```html
<!-- Hero Section -->
<section class="hero">
  <div class="container">
    <h1>Organize Your Work, Amplify Your Productivity</h1>
    <p class="subtitle">
      TaskFlow helps teams manage tasks, track progress, and achieve goals together.
      Join 10,000+ teams already using TaskFlow.
    </p>
    <div class="cta-buttons">
      <a href="/subscribe/signup" class="btn btn-primary">Start Free Trial</a>
      <a href="#features" class="btn btn-secondary">Learn More</a>
    </div>
    <div class="hero-image">
      <img src="/dashboard-preview.png" alt="TaskFlow Dashboard" />
    </div>
  </div>
</section>
```

#### CSS Styling

```css
/* Hero Section */
.hero {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 100px 20px;
  text-align: center;
}

.hero h1 {
  font-size: 3.5rem;
  font-weight: 800;
  margin-bottom: 1.5rem;
  line-height: 1.2;
}

.hero .subtitle {
  font-size: 1.25rem;
  margin-bottom: 2rem;
  opacity: 0.95;
  max-width: 700px;
  margin-left: auto;
  margin-right: auto;
}

.cta-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-bottom: 3rem;
}

.btn {
  padding: 1rem 2.5rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1.1rem;
  text-decoration: none;
  transition: all 0.3s;
  display: inline-block;
}

.btn-primary {
  background: white;
  color: #667eea;
  box-shadow: 0 4px 15px rgba(0,0,0,0.2);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0,0,0,0.3);
}

.btn-secondary {
  background: transparent;
  color: white;
  border: 2px solid white;
}

.btn-secondary:hover {
  background: white;
  color: #667eea;
}

.hero-image {
  max-width: 1000px;
  margin: 0 auto;
}

.hero-image img {
  width: 100%;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}
```

#### Features Section

```html
<!-- Features Section -->
<section class="features" id="features">
  <div class="container">
    <h2 class="section-title">Everything You Need to Manage Tasks</h2>
    <p class="section-subtitle">Powerful features to help your team stay organized and productive</p>

    <div class="features-grid">
      <div class="feature-card">
        <div class="feature-icon">📝</div>
        <h3>Smart Task Management</h3>
        <p>Create, assign, and track tasks with ease. Set priorities, due dates, and get reminders.</p>
      </div>

      <div class="feature-card">
        <div class="feature-icon">👥</div>
        <h3>Team Collaboration</h3>
        <p>Work together seamlessly. Assign tasks, leave comments, and track team progress.</p>
      </div>

      <div class="feature-card">
        <div class="feature-icon">📊</div>
        <h3>Powerful Analytics</h3>
        <p>Visualize productivity with charts and insights. Make data-driven decisions.</p>
      </div>

      <div class="feature-card">
        <div class="feature-icon">🔔</div>
        <h3>Smart Notifications</h3>
        <p>Never miss a deadline. Get email and in-app notifications for important updates.</p>
      </div>

      <div class="feature-card">
        <div class="feature-icon">🏷️</div>
        <h3>Tags & Organization</h3>
        <p>Organize tasks with custom tags, projects, and filters for easy access.</p>
      </div>

      <div class="feature-card">
        <div class="feature-icon">⚡</div>
        <h3>Lightning Fast</h3>
        <p>Optimized for speed. Your tasks load instantly, every time.</p>
      </div>
    </div>
  </div>
</section>
```

```css
/* Features Section */
.features {
  padding: 80px 20px;
  background: #f9fafb;
}

.section-title {
  font-size: 2.5rem;
  font-weight: 800;
  text-align: center;
  margin-bottom: 1rem;
  color: #1f2937;
}

.section-subtitle {
  text-align: center;
  font-size: 1.1rem;
  color: #6b7280;
  margin-bottom: 4rem;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.feature-card {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.07);
  transition: all 0.3s;
  text-align: center;
}

.feature-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 24px rgba(0,0,0,0.15);
}

.feature-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.feature-card h3 {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
  color: #1f2937;
}

.feature-card p {
  color: #6b7280;
  line-height: 1.6;
}
```

#### Pricing Section

```html
<!-- Pricing Section -->
<section class="pricing" id="pricing">
  <div class="container">
    <h2 class="section-title">Simple, Transparent Pricing</h2>
    <p class="section-subtitle">Choose the plan that works for you. Upgrade or downgrade anytime.</p>

    <div class="pricing-grid">
      <!-- Free Plan -->
      <div class="pricing-card">
        <div class="plan-header">
          <h3>Free</h3>
          <div class="price">
            <span class="amount">$0</span>
            <span class="period">/month</span>
          </div>
          <p class="plan-description">Perfect for individuals</p>
        </div>
        <ul class="plan-features">
          <li>✓ Up to 10 tasks</li>
          <li>✓ 1 project</li>
          <li>✓ Basic analytics</li>
          <li>✓ Mobile app</li>
          <li>✓ Email support</li>
        </ul>
        <a href="/subscribe/signup?plan=free" class="plan-button">Get Started</a>
      </div>

      <!-- Pro Plan (Featured) -->
      <div class="pricing-card featured">
        <div class="badge">MOST POPULAR</div>
        <div class="plan-header">
          <h3>Pro</h3>
          <div class="price">
            <span class="amount">$19</span>
            <span class="period">/month</span>
          </div>
          <p class="plan-description">For professionals and small teams</p>
        </div>
        <ul class="plan-features">
          <li>✓ Unlimited tasks</li>
          <li>✓ Unlimited projects</li>
          <li>✓ Advanced analytics</li>
          <li>✓ Priority support</li>
          <li>✓ Custom integrations</li>
          <li>✓ Team collaboration</li>
          <li>✓ Export data</li>
        </ul>
        <a href="/subscribe/signup?plan=pro" class="plan-button">Start Free Trial</a>
        <p class="trial-notice">14-day free trial, no credit card required</p>
      </div>

      <!-- Enterprise Plan -->
      <div class="pricing-card">
        <div class="plan-header">
          <h3>Enterprise</h3>
          <div class="price">
            <span class="amount">$99</span>
            <span class="period">/month</span>
          </div>
          <p class="plan-description">For large teams and organizations</p>
        </div>
        <ul class="plan-features">
          <li>✓ Everything in Pro</li>
          <li>✓ Unlimited team members</li>
          <li>✓ Advanced security</li>
          <li>✓ Custom domain</li>
          <li>✓ Dedicated account manager</li>
          <li>✓ SLA guarantee</li>
          <li>✓ API access</li>
        </ul>
        <a href="/contact-sales" class="plan-button">Contact Sales</a>
      </div>
    </div>
  </div>
</section>
```

```css
/* Pricing Section */
.pricing {
  padding: 80px 20px;
  background: white;
}

.pricing-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.pricing-card {
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 16px;
  padding: 2.5rem;
  position: relative;
  transition: all 0.3s;
}

.pricing-card:hover {
  border-color: #667eea;
  box-shadow: 0 12px 24px rgba(102, 126, 234, 0.15);
}

.pricing-card.featured {
  border-color: #667eea;
  border-width: 3px;
  transform: scale(1.05);
  box-shadow: 0 12px 24px rgba(102, 126, 234, 0.2);
}

.badge {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0.4rem 1.5rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.plan-header {
  text-align: center;
  margin-bottom: 2rem;
  padding-bottom: 2rem;
  border-bottom: 2px solid #f3f4f6;
}

.plan-header h3 {
  font-size: 1.75rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: #1f2937;
}

.price {
  margin-bottom: 0.5rem;
}

.price .amount {
  font-size: 3rem;
  font-weight: 800;
  color: #667eea;
}

.price .period {
  font-size: 1rem;
  color: #6b7280;
}

.plan-description {
  color: #6b7280;
  font-size: 0.95rem;
}

.plan-features {
  list-style: none;
  padding: 0;
  margin-bottom: 2rem;
}

.plan-features li {
  padding: 0.75rem 0;
  color: #4b5563;
  border-bottom: 1px solid #f3f4f6;
}

.plan-features li:last-child {
  border-bottom: none;
}

.plan-button {
  display: block;
  width: 100%;
  padding: 1rem;
  background: #667eea;
  color: white;
  text-align: center;
  border-radius: 8px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.3s;
}

.plan-button:hover {
  background: #5568d3;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.trial-notice {
  text-align: center;
  margin-top: 1rem;
  font-size: 0.85rem;
  color: #6b7280;
}
```

**💡 Pro Tips for Landing Pages:**
- Keep hero section simple and clear
- Use social proof (testimonials, user count)
- Make CTAs prominent and action-oriented
- Show real product screenshots/demos
- Mobile-first responsive design

---

### Step 2.2: Create Customer Dashboard

**Navigate to:** Admin Panel → Content → Pages → New Page

**Slug:** `dashboard`
**Access Level:** `subscriber` (customers only)

#### Dashboard Layout

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard - TaskFlow</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      background: #f9fafb;
    }

    /* Navigation */
    .navbar {
      background: white;
      border-bottom: 1px solid #e5e7eb;
      padding: 1rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .logo {
      font-size: 1.5rem;
      font-weight: 800;
      color: #667eea;
    }

    .nav-links {
      display: flex;
      gap: 2rem;
      list-style: none;
    }

    .nav-links a {
      text-decoration: none;
      color: #4b5563;
      font-weight: 500;
      transition: color 0.2s;
    }

    .nav-links a:hover {
      color: #667eea;
    }

    /* Main Container */
    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem;
    }

    .page-header {
      margin-bottom: 2rem;
    }

    .page-header h1 {
      font-size: 2rem;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 0.5rem;
    }

    .page-header p {
      color: #6b7280;
    }

    /* Stats Cards */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      background: white;
      padding: 1.5rem;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .stat-card .label {
      font-size: 0.875rem;
      color: #6b7280;
      margin-bottom: 0.5rem;
    }

    .stat-card .value {
      font-size: 2rem;
      font-weight: 700;
      color: #1f2937;
    }

    .stat-card .change {
      font-size: 0.875rem;
      margin-top: 0.5rem;
    }

    .stat-card .change.positive {
      color: #10b981;
    }

    .stat-card .change.negative {
      color: #ef4444;
    }

    /* Task List */
    .task-section {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .task-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .task-header h2 {
      font-size: 1.25rem;
      font-weight: 700;
      color: #1f2937;
    }

    .btn-primary {
      background: #667eea;
      color: white;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      transition: background 0.2s;
    }

    .btn-primary:hover {
      background: #5568d3;
    }

    .task-list {
      list-style: none;
    }

    .task-item {
      padding: 1rem;
      border-bottom: 1px solid #f3f4f6;
      display: flex;
      align-items: center;
      justify-content: space-between;
      transition: background 0.2s;
    }

    .task-item:hover {
      background: #f9fafb;
    }

    .task-item:last-child {
      border-bottom: none;
    }

    .task-checkbox {
      width: 20px;
      height: 20px;
      margin-right: 1rem;
      cursor: pointer;
    }

    .task-content {
      flex: 1;
    }

    .task-title {
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 0.25rem;
    }

    .task-meta {
      font-size: 0.875rem;
      color: #6b7280;
    }

    .task-priority {
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .priority-high {
      background: #fee2e2;
      color: #991b1b;
    }

    .priority-medium {
      background: #fef3c7;
      color: #92400e;
    }

    .priority-low {
      background: #d1fae5;
      color: #065f46;
    }
  </style>
</head>
<body>
  <!-- Navigation -->
  <nav class="navbar">
    <div class="logo">TaskFlow</div>
    <ul class="nav-links">
      <li><a href="/dashboard">Dashboard</a></li>
      <li><a href="/tasks">Tasks</a></li>
      <li><a href="/projects">Projects</a></li>
      <li><a href="/analytics">Analytics</a></li>
      <li><a href="/settings">Settings</a></li>
    </ul>
    <div>
      <a href="/logout" class="btn-secondary">Logout</a>
    </div>
  </nav>

  <!-- Main Content -->
  <div class="container">
    <div class="page-header">
      <h1>Welcome back, [User Name]!</h1>
      <p>Here's what's happening with your tasks today</p>
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="label">Total Tasks</div>
        <div class="value" id="total-tasks">0</div>
        <div class="change positive">+5 from last week</div>
      </div>

      <div class="stat-card">
        <div class="label">In Progress</div>
        <div class="value" id="in-progress-tasks">0</div>
        <div class="change positive">+2 from yesterday</div>
      </div>

      <div class="stat-card">
        <div class="label">Completed</div>
        <div class="value" id="completed-tasks">0</div>
        <div class="change positive">+12 this week</div>
      </div>

      <div class="stat-card">
        <div class="label">Overdue</div>
        <div class="value" id="overdue-tasks">0</div>
        <div class="change negative">3 need attention</div>
      </div>
    </div>

    <!-- Today's Tasks -->
    <div class="task-section">
      <div class="task-header">
        <h2>Today's Tasks</h2>
        <a href="/tasks/new" class="btn-primary">+ New Task</a>
      </div>

      <ul class="task-list" id="task-list">
        <!-- Tasks will be loaded here via JavaScript -->
        <li class="task-item">
          <input type="checkbox" class="task-checkbox">
          <div class="task-content">
            <div class="task-title">Review pull requests</div>
            <div class="task-meta">Due today at 5:00 PM</div>
          </div>
          <span class="task-priority priority-high">High</span>
        </li>

        <li class="task-item">
          <input type="checkbox" class="task-checkbox">
          <div class="task-content">
            <div class="task-title">Update documentation</div>
            <div class="task-meta">Due tomorrow</div>
          </div>
          <span class="task-priority priority-medium">Medium</span>
        </li>

        <li class="task-item">
          <input type="checkbox" class="task-checkbox" checked>
          <div class="task-content">
            <div class="task-title" style="text-decoration: line-through; opacity: 0.6;">
              Team standup meeting
            </div>
            <div class="task-meta">Completed</div>
          </div>
          <span class="task-priority priority-low">Low</span>
        </li>
      </ul>
    </div>
  </div>

  <script>
    // Load user data and tasks
    async function loadDashboard() {
      try {
        // Fetch tasks from API
        const response = await fetch('/api/tasks?filter=today');
        const data = await response.json();

        // Update stats
        document.getElementById('total-tasks').textContent = data.total || 0;
        document.getElementById('in-progress-tasks').textContent = data.inProgress || 0;
        document.getElementById('completed-tasks').textContent = data.completed || 0;
        document.getElementById('overdue-tasks').textContent = data.overdue || 0;

        // Render tasks
        renderTasks(data.tasks || []);
      } catch (error) {
        console.error('Error loading dashboard:', error);
      }
    }

    function renderTasks(tasks) {
      const taskList = document.getElementById('task-list');
      taskList.innerHTML = tasks.map(task => `
        <li class="task-item">
          <input type="checkbox" class="task-checkbox" ${task.status === 'completed' ? 'checked' : ''}
                 onchange="toggleTask(${task.id})">
          <div class="task-content">
            <div class="task-title" style="${task.status === 'completed' ? 'text-decoration: line-through; opacity: 0.6;' : ''}">
              ${task.title}
            </div>
            <div class="task-meta">${task.dueDate ? 'Due ' + formatDate(task.dueDate) : 'No due date'}</div>
          </div>
          <span class="task-priority priority-${task.priority}">${task.priority}</span>
        </li>
      `).join('');
    }

    async function toggleTask(taskId) {
      try {
        await fetch(`/api/tasks/${taskId}/toggle`, { method: 'POST' });
        loadDashboard(); // Reload
      } catch (error) {
        console.error('Error toggling task:', error);
      }
    }

    function formatDate(dateString) {
      const date = new Date(dateString);
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      if (date.toDateString() === today.toDateString()) return 'today';
      if (date.toDateString() === tomorrow.toDateString()) return 'tomorrow';
      return date.toLocaleDateString();
    }

    // Load dashboard on page load
    document.addEventListener('DOMContentLoaded', loadDashboard);
  </script>
</body>
</html>
```

---

## Part 3: Database & Backend

### Step 3.1: Create Database Tables

**Navigate to:** Admin Panel → Backend → Database

#### Create Tasks Table

1. Click "Create New Collection"
2. Enter collection name: `tasks`
3. Add fields:
   - `id` (INTEGER, PRIMARY KEY, AUTO INCREMENT)
   - `title` (TEXT, REQUIRED, max 200 chars)
   - `description` (TEXT, optional)
   - `status` (TEXT, default: 'pending', enum: pending/in_progress/completed/archived)
   - `priority` (TEXT, default: 'medium', enum: low/medium/high/urgent)
   - `assigned_to` (INTEGER, foreign key to users.id)
   - `created_by` (INTEGER, REQUIRED, foreign key to users.id)
   - `project_id` (INTEGER, foreign key to projects.id)
   - `due_date` (DATETIME, optional)
   - `tags` (TEXT, default: '[]')
   - `created_at` (DATETIME, auto: CURRENT_TIMESTAMP)
   - `updated_at` (DATETIME, auto: CURRENT_TIMESTAMP)

4. Add indexes:
   - On `status` and `created_by` (compound index)
   - On `due_date`
   - On `project_id`

5. Click "Create Collection"

#### Create Projects Table

Repeat the process for `projects`:
- `id` (PRIMARY KEY)
- `name` (TEXT, REQUIRED)
- `description` (TEXT)
- `owner_id` (INTEGER, REQUIRED, FK to users)
- `team_members` (TEXT, default: '[]')
- `status` (TEXT, default: 'active')
- `created_at` (DATETIME)

#### Create Comments Table

And for `comments`:
- `id` (PRIMARY KEY)
- `task_id` (INTEGER, REQUIRED, FK to tasks with ON DELETE CASCADE)
- `user_id` (INTEGER, REQUIRED, FK to users)
- `comment` (TEXT, REQUIRED)
- `created_at` (DATETIME)

---

### Step 3.2: Create API Endpoints

**Navigate to:** Admin Panel → Backend → API Routes

#### Create "Get All Tasks" Endpoint

```javascript
// Route: /api/tasks
// Method: GET
// Description: Get all tasks for current user

const db = require('./database');
const jwt = require('jsonwebtoken');

// Get user from JWT token
const token = req.cookies['auth-token'];
if (!token) {
  return res.status(401).json({ error: 'Unauthorized' });
}

const decoded = jwt.verify(token, process.env.JWT_SECRET);
const userId = decoded.userId;

// Query tasks
const tasks = await db.all(`
  SELECT
    tasks.*,
    users.username as assigned_to_name
  FROM tasks
  LEFT JOIN users ON tasks.assigned_to = users.id
  WHERE tasks.created_by = ?
  AND tasks.status != 'archived'
  ORDER BY
    CASE
      WHEN tasks.status = 'in_progress' THEN 1
      WHEN tasks.status = 'pending' THEN 2
      ELSE 3
    END,
    tasks.due_date ASC NULLS LAST,
    tasks.created_at DESC
`, [userId]);

// Calculate stats
const stats = {
  total: tasks.length,
  pending: tasks.filter(t => t.status === 'pending').length,
  inProgress: tasks.filter(t => t.status === 'in_progress').length,
  completed: tasks.filter(t => t.status === 'completed').length,
  overdue: tasks.filter(t => {
    return t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed';
  }).length,
};

res.json({
  success: true,
  tasks,
  stats,
});
```

#### Create "Create Task" Endpoint

```javascript
// Route: /api/tasks
// Method: POST
// Description: Create a new task

const { title, description, priority, dueDate, projectId, tags } = req.body;

if (!title) {
  return res.status(400).json({ error: 'Title is required' });
}

// Get user ID from JWT
const token = req.cookies['auth-token'];
const decoded = jwt.verify(token, process.env.JWT_SECRET);
const userId = decoded.userId;

// Insert task
const result = await db.run(`
  INSERT INTO tasks (
    title, description, priority, due_date, project_id, tags, created_by, status
  ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
`, [
  title,
  description || null,
  priority || 'medium',
  dueDate || null,
  projectId || null,
  JSON.stringify(tags || []),
  userId,
]);

// Get created task
const task = await db.get('SELECT * FROM tasks WHERE id = ?', [result.lastID]);

res.json({
  success: true,
  task,
});
```

#### Create "Update Task" Endpoint

```javascript
// Route: /api/tasks/:id
// Method: PUT
// Description: Update a task

const { id } = req.params;
const { title, description, status, priority, dueDate, assignedTo, tags } = req.body;

// Get user ID
const token = req.cookies['auth-token'];
const decoded = jwt.verify(token, process.env.JWT_SECRET);
const userId = decoded.userId;

// Check if user owns the task
const task = await db.get('SELECT * FROM tasks WHERE id = ? AND created_by = ?', [id, userId]);
if (!task) {
  return res.status(404).json({ error: 'Task not found' });
}

// Update task
await db.run(`
  UPDATE tasks SET
    title = COALESCE(?, title),
    description = COALESCE(?, description),
    status = COALESCE(?, status),
    priority = COALESCE(?, priority),
    due_date = COALESCE(?, due_date),
    assigned_to = COALESCE(?, assigned_to),
    tags = COALESCE(?, tags),
    updated_at = CURRENT_TIMESTAMP
  WHERE id = ?
`, [
  title,
  description,
  status,
  priority,
  dueDate,
  assignedTo,
  tags ? JSON.stringify(tags) : null,
  id,
]);

// Get updated task
const updatedTask = await db.get('SELECT * FROM tasks WHERE id = ?', [id]);

res.json({
  success: true,
  task: updatedTask,
});
```

#### Create "Delete Task" Endpoint

```javascript
// Route: /api/tasks/:id
// Method: DELETE
// Description: Delete a task

const { id } = req.params;

// Get user ID
const token = req.cookies['auth-token'];
const decoded = jwt.verify(token, process.env.JWT_SECRET);
const userId = decoded.userId;

// Check if user owns the task
const task = await db.get('SELECT * FROM tasks WHERE id = ? AND created_by = ?', [id, userId]);
if (!task) {
  return res.status(404).json({ error: 'Task not found' });
}

// Delete task (will cascade delete comments)
await db.run('DELETE FROM tasks WHERE id = ?', [id]);

res.json({
  success: true,
  message: 'Task deleted successfully',
});
```

---

## Part 4: Authentication & User Management

### Step 4.1: Configure Customer Login

The platform already includes authentication! Here's how it works:

#### Login Flow
1. User visits `/customer-login`
2. Enters email and password
3. System verifies credentials
4. JWT token created and stored in cookie
5. User redirected to `/dashboard`

#### Customizing Login Page

**Navigate to:** Admin Panel → Content → Reserved Pages → Customer Login

You can customize the HTML/CSS to match your brand!

### Step 4.2: User Registration

**Navigate to:** Admin Panel → Content → Reserved Pages → Customer Signup

The signup flow:
1. User fills form (username, email, password)
2. OTP sent to email
3. User verifies OTP
4. Account created
5. Redirected to choose subscription plan
6. Redirected to dashboard

---

## Part 5: Monetization & Payments

### Step 5.1: Create Subscription Plans

**Navigate to:** Admin Panel → Business → Plans

Create three plans:

#### Free Plan
- Name: Free
- Price: $0/month
- API Limit: 100 requests/day
- Features:
  - Up to 10 tasks
  - 1 project
  - Basic analytics
  - Mobile app access

#### Pro Plan
- Name: Pro
- Price: $19/month
- API Limit: 10,000 requests/day
- Features:
  - Unlimited tasks
  - Unlimited projects
  - Advanced analytics
  - Priority support
  - Custom integrations
  - Team collaboration

#### Enterprise Plan
- Name: Enterprise
- Price: $99/month
- API Limit: Unlimited
- Features:
  - Everything in Pro
  - Unlimited team members
  - Advanced security
  - Custom domain
  - Dedicated support
  - SLA guarantee
  - API access

### Step 5.2: Connect Lemon Squeezy

1. Create account at https://lemonsqueezy.com
2. Create a store
3. Create products for each plan
4. Get API key
5. **Navigate to:** Admin Panel → Settings
6. Add Lemon Squeezy API key
7. Link products to plans

### Step 5.3: Add Upgrade CTA

In your dashboard, add upgrade prompts:

```html
<!-- Free plan users see this -->
<div class="upgrade-banner">
  <h3>🚀 Upgrade to Pro</h3>
  <p>Get unlimited tasks and advanced features</p>
  <a href="/subscribe/upgrade?plan=pro" class="btn-upgrade">Upgrade Now</a>
</div>
```

---

## Part 6: Analytics & Monitoring

### Step 6.1: Track User Events

**Navigate to:** Admin Panel → Analytics → Overview

The platform automatically tracks:
- Page views
- User sessions
- Feature usage
- API calls

### Step 6.2: Create Custom Analytics Page

Build an analytics dashboard showing:
- Task completion rate
- Productivity trends
- Time spent on tasks
- Most productive days/times

---

## Part 7: Deployment & Launch

### Step 7.1: Pre-Launch Checklist

- [ ] All pages tested and working
- [ ] Database properly set up
- [ ] API endpoints tested
- [ ] Authentication working
- [ ] Payments tested (sandbox mode)
- [ ] Mobile responsive design verified
- [ ] Email notifications configured
- [ ] Analytics tracking working
- [ ] Error handling in place
- [ ] Security measures enabled

### Step 7.2: Deploy

**Navigate to:** Admin Panel → System → Platform Update

1. Click "Deploy to Production"
2. Review deployment checklist
3. Confirm deployment
4. Monitor deployment logs
5. Test live site
6. Announce launch! 🎉

---

## Advanced Features

### Email Notifications

**Navigate to:** Admin Panel → Email → Templates

Create templates for:
- Task assigned
- Task due soon
- Task completed
- Weekly summary

### Team Collaboration

Add team features:
- Invite team members
- Assign tasks to team
- Team chat/comments
- Team analytics

### Integrations

Connect with:
- Slack notifications
- Google Calendar sync
- GitHub integration
- Zapier webhooks

---

## Best Practices

### Performance
- Add indexes to frequently queried fields
- Implement pagination for large task lists
- Use caching for static data
- Optimize images and assets

### Security
- Always validate user input
- Use parameterized queries (prevent SQL injection)
- Implement rate limiting
- Enable HTTPS in production
- Regular security audits

### User Experience
- Fast page load times (<2 seconds)
- Clear error messages
- Loading states for async operations
- Keyboard shortcuts for power users
- Mobile-first design

### Maintenance
- Monitor error logs regularly
- Track user feedback
- A/B test new features
- Regular backups
- Performance monitoring

---

## Congratulations! 🎉

You've built a complete Task Management SaaS from scratch!

**What you've learned:**
✅ SaaS product planning and design
✅ Frontend development with HTML/CSS/JavaScript
✅ Database schema design and implementation
✅ RESTful API development
✅ User authentication and authorization
✅ Payment integration
✅ Analytics and monitoring
✅ Deployment and launch

**Next Steps:**
- Add more features (file attachments, recurring tasks, etc.)
- Get your first customers
- Iterate based on feedback
- Scale and grow!

**Resources:**
- [Platform Documentation](/docs)
- [Community Forum](/community)
- [Video Tutorials](/tutorials)
- [Support](/support)

Happy building! 🚀
