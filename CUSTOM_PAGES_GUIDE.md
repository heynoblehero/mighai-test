# 📚 Complete Guide: Creating Custom Pages with A/B Testing & Analytics

This guide will show you how to create custom pages in your site builder with full analytics tracking, heatmap collection, and A/B testing capabilities.

## 🚀 Quick Overview

Your site builder allows you to:
- Create custom HTML pages with full CSS and JavaScript
- Automatically track analytics (page views, clicks, form submissions)
- Collect heatmap data with our built-in solution
- Run A/B testing campaigns on any element
- View detailed analytics and heatmap data in the admin panel

## 📁 File Structure

```
/pages/
├── admin/           # Admin panel pages
├── blog/            # Blog pages  
├── dashboard/       # User dashboard
├── index.js         # Homepage
├── login.js         # Login page
├── test-analytics.js # Public analytics testing
└── [slug].js        # Dynamic custom pages (THIS IS KEY!)

/pages/admin/
├── pages/
│   ├── index.js     # Manage all custom pages
│   └── new.js       # Create new custom pages
```

## 🔧 How Custom Pages Work

### 1. Dynamic Page System
- Custom pages are served via `/pages/[slug].js`
- Pages are stored in SQLite database with HTML, CSS, JS content
- Each page has a unique slug (URL path)

### 2. Database Schema
```sql
CREATE TABLE pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,           -- URL path (/my-landing-page)
  title TEXT NOT NULL,                 -- Page title
  meta_description TEXT,               -- SEO description
  html_content TEXT NOT NULL,          -- HTML content
  css_content TEXT,                    -- Custom CSS
  js_content TEXT,                     -- Custom JavaScript
  is_published BOOLEAN DEFAULT true,   -- Published status
  access_level TEXT DEFAULT 'public',  -- public/private/subscriber
  created_by INTEGER,                  -- Admin user ID
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);
```

## 🎯 Step-by-Step: Creating a Custom Page

### Step 1: Access the Admin Panel
1. Go to `http://localhost:3000/admin`
2. Login with: `admin@example.com` / `admin123`
3. Navigate to **Pages** → **All Pages**

### Step 2: Create a New Page
1. Click **"Create New Page"**
2. Fill out the form:

```
Slug: landing-page-test
Title: Test Landing Page
Meta Description: A test landing page with A/B testing capabilities
Access Level: Public
```

### Step 3: Add HTML Content
Copy this example HTML into the **HTML Content** field:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}}</title>
    <meta name="description" content="{{meta_description}}">
    
    <!-- Analytics & Heatmap Scripts -->
    <script src="/analytics.js"></script>
    <script src="/heatmap.js"></script>
</head>
<body>
    <!-- Header Section -->
    <header class="hero-section">
        <div class="container">
            <!-- A/B Testing Target - This will be replaced by different variants -->
            <div id="hero-headline" class="hero-headline">
                <h1>Transform Your Business Today</h1>
                <p>The original headline and description that will be A/B tested.</p>
                <button class="cta-button primary" onclick="handleCTAClick('hero')">
                    Get Started Now
                </button>
            </div>
        </div>
    </header>

    <!-- Features Section -->
    <section class="features">
        <div class="container">
            <h2>Why Choose Our Solution?</h2>
            <div class="feature-grid">
                <div class="feature-card" onclick="trackFeatureClick('analytics')">
                    <div class="feature-icon">📊</div>
                    <h3>Advanced Analytics</h3>
                    <p>Track every user interaction with detailed analytics and heatmaps.</p>
                </div>
                <div class="feature-card" onclick="trackFeatureClick('testing')">
                    <div class="feature-icon">🧪</div>
                    <h3>A/B Testing</h3>
                    <p>Optimize your pages with built-in A/B testing capabilities.</p>
                </div>
                <div class="feature-card" onclick="trackFeatureClick('realtime')">
                    <div class="feature-icon">⚡</div>
                    <h3>Real-time Data</h3>
                    <p>See user behavior data in real-time with live heatmaps.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Contact Form Section -->
    <section class="contact-form">
        <div class="container">
            <h2>Get Started Today</h2>
            <form id="contact-form" class="contact-form-grid">
                <div class="form-group">
                    <label for="name">Full Name</label>
                    <input type="text" id="name" name="name" required>
                </div>
                <div class="form-group">
                    <label for="email">Email Address</label>
                    <input type="email" id="email" name="email" required>
                </div>
                <div class="form-group">
                    <label for="company">Company</label>
                    <input type="text" id="company" name="company">
                </div>
                <div class="form-group">
                    <label for="message">Message</label>
                    <textarea id="message" name="message" rows="4"></textarea>
                </div>
                <div class="form-group full-width">
                    <button type="submit" class="cta-button secondary">
                        Send Message
                    </button>
                </div>
            </form>
        </div>
    </section>

    <!-- Testing Controls (Remove in production) -->
    <div class="testing-controls">
        <div class="container">
            <h3>🧪 Testing Controls</h3>
            <div class="control-buttons">
                <button onclick="showHeatmap()" class="test-button">Show Heatmap</button>
                <button onclick="hideHeatmap()" class="test-button">Hide Heatmap</button>
                <button onclick="getHeatmapStats()" class="test-button">Heatmap Stats</button>
                <button onclick="applyABVariant()" class="test-button">Switch A/B Variant</button>
            </div>
        </div>
    </div>
</body>
</html>
```

### Step 4: Add Custom CSS
Copy this CSS into the **CSS Content** field:

```css
/* Reset and Base Styles */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    line-height: 1.6;
    color: #333;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
}

/* Hero Section */
.hero-section {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 80px 0;
    text-align: center;
}

.hero-headline h1 {
    font-size: 3.5rem;
    font-weight: 700;
    margin-bottom: 20px;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
}

.hero-headline p {
    font-size: 1.3rem;
    margin-bottom: 30px;
    opacity: 0.9;
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
}

/* Buttons */
.cta-button {
    display: inline-block;
    padding: 15px 30px;
    font-size: 1.1rem;
    font-weight: 600;
    text-decoration: none;
    border-radius: 50px;
    transition: all 0.3s ease;
    cursor: pointer;
    border: none;
    text-transform: uppercase;
    letter-spacing: 1px;
}

.cta-button.primary {
    background: #ff6b6b;
    color: white;
    box-shadow: 0 4px 15px rgba(255, 107, 107, 0.4);
}

.cta-button.primary:hover {
    background: #ff5252;
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(255, 107, 107, 0.6);
}

.cta-button.secondary {
    background: #4ecdc4;
    color: white;
    box-shadow: 0 4px 15px rgba(78, 205, 196, 0.4);
}

.cta-button.secondary:hover {
    background: #45b7b8;
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(78, 205, 196, 0.6);
}

/* Features Section */
.features {
    padding: 80px 0;
    background: #f8f9fa;
}

.features h2 {
    text-align: center;
    font-size: 2.5rem;
    margin-bottom: 50px;
    color: #2c3e50;
}

.feature-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 30px;
    margin-top: 40px;
}

.feature-card {
    background: white;
    padding: 40px 30px;
    border-radius: 10px;
    text-align: center;
    box-shadow: 0 5px 15px rgba(0,0,0,0.08);
    transition: all 0.3s ease;
    cursor: pointer;
}

.feature-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 25px rgba(0,0,0,0.15);
}

.feature-icon {
    font-size: 3rem;
    margin-bottom: 20px;
}

.feature-card h3 {
    font-size: 1.5rem;
    margin-bottom: 15px;
    color: #2c3e50;
}

.feature-card p {
    color: #6c757d;
    line-height: 1.6;
}

/* Contact Form Section */
.contact-form {
    padding: 80px 0;
    background: white;
}

.contact-form h2 {
    text-align: center;
    font-size: 2.5rem;
    margin-bottom: 50px;
    color: #2c3e50;
}

.contact-form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
    max-width: 800px;
    margin: 0 auto;
}

.form-group {
    display: flex;
    flex-direction: column;
}

.form-group.full-width {
    grid-column: 1 / -1;
}

.form-group label {
    font-weight: 600;
    margin-bottom: 8px;
    color: #2c3e50;
}

.form-group input,
.form-group textarea {
    padding: 12px 15px;
    border: 2px solid #e9ecef;
    border-radius: 8px;
    font-size: 1rem;
    transition: border-color 0.3s ease;
}

.form-group input:focus,
.form-group textarea:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

/* Testing Controls (Remove in production) */
.testing-controls {
    background: #2c3e50;
    color: white;
    padding: 30px 0;
    text-align: center;
}

.testing-controls h3 {
    margin-bottom: 20px;
}

.control-buttons {
    display: flex;
    justify-content: center;
    gap: 15px;
    flex-wrap: wrap;
}

.test-button {
    background: #3498db;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 5px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: background-color 0.3s ease;
}

.test-button:hover {
    background: #2980b9;
}

/* Responsive Design */
@media (max-width: 768px) {
    .hero-headline h1 {
        font-size: 2.5rem;
    }
    
    .hero-headline p {
        font-size: 1.1rem;
    }
    
    .features h2,
    .contact-form h2 {
        font-size: 2rem;
    }
    
    .control-buttons {
        flex-direction: column;
        align-items: center;
    }
}

/* A/B Testing Variants - These will be applied dynamically */
.variant-b .hero-headline h1 {
    color: #ff6b6b;
}

.variant-b .hero-headline p {
    font-style: italic;
}

.variant-c .hero-section {
    background: linear-gradient(135deg, #ff6b6b 0%, #ffa726 100%);
}
```

### Step 5: Add Custom JavaScript
Copy this JavaScript into the **JavaScript Content** field:

```javascript
// Page-specific analytics and functionality
document.addEventListener('DOMContentLoaded', function() {
    console.log('Custom page loaded with analytics tracking');
    
    // Track page load event
    if (typeof Analytics !== 'undefined') {
        Analytics.track('page_load', window.location.pathname, {
            page_type: 'custom_landing',
            has_ab_testing: true,
            timestamp: Date.now()
        });
    }
    
    // Initialize A/B testing
    initializeABTesting();
    
    // Setup form tracking
    setupFormTracking();
    
    // Setup heatmap controls
    setupHeatmapControls();
});

// A/B Testing Functions
async function initializeABTesting() {
    try {
        // Test experiment ID 1 (you'll create this in admin)
        const variant = await ABTest.applyVariant(1, '#hero-headline');
        
        console.log('A/B Test Applied:', variant);
        
        // Track which variant was shown
        if (typeof Analytics !== 'undefined') {
            Analytics.track('ab_test_view', window.location.pathname, {
                experiment_id: 1,
                variant: variant.variant,
                timestamp: Date.now()
            });
        }
    } catch (error) {
        console.warn('A/B Testing not available:', error);
    }
}

// CTA Button Click Handler
function handleCTAClick(source) {
    console.log('CTA clicked from:', source);
    
    // Track the CTA click
    if (typeof Analytics !== 'undefined') {
        Analytics.track('cta_click', window.location.pathname, {
            cta_source: source,
            button_text: event.target.textContent,
            timestamp: Date.now()
        });
    }
    
    // Simulate conversion action
    alert('CTA clicked! This would normally redirect to signup/purchase page.');
}

// Feature Card Click Handler
function trackFeatureClick(feature) {
    console.log('Feature clicked:', feature);
    
    if (typeof Analytics !== 'undefined') {
        Analytics.track('feature_click', window.location.pathname, {
            feature_name: feature,
            timestamp: Date.now()
        });
    }
}

// Form Tracking Setup
function setupFormTracking() {
    const form = document.getElementById('contact-form');
    if (!form) return;
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        console.log('Form submitted:', data);
        
        // Track form submission
        if (typeof Analytics !== 'undefined') {
            Analytics.track('form_submit', window.location.pathname, {
                form_type: 'contact',
                form_data: data,
                timestamp: Date.now()
            });
        }
        
        // Simulate form processing
        alert('Form submitted! Data: ' + JSON.stringify(data, null, 2));
        
        // Reset form
        form.reset();
    });
    
    // Track form field interactions
    const inputs = form.querySelectorAll('input, textarea');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            if (typeof Analytics !== 'undefined') {
                Analytics.track('form_field_focus', window.location.pathname, {
                    field_name: input.name,
                    field_type: input.type,
                    timestamp: Date.now()
                });
            }
        });
    });
}

// Heatmap Control Functions
function setupHeatmapControls() {
    console.log('Heatmap controls ready');
}

function showHeatmap() {
    if (typeof CustomHeatmap !== 'undefined') {
        CustomHeatmap.createOverlay();
        console.log('Heatmap overlay displayed');
    }
}

function hideHeatmap() {
    if (typeof CustomHeatmap !== 'undefined') {
        CustomHeatmap.removeOverlay();
        console.log('Heatmap overlay hidden');
    }
}

function getHeatmapStats() {
    if (typeof CustomHeatmap !== 'undefined') {
        const stats = CustomHeatmap.getStats();
        alert('Heatmap Stats:\n' + JSON.stringify(stats, null, 2));
        console.log('Heatmap stats:', stats);
    }
}

function applyABVariant() {
    // Manually switch between variants for testing
    const element = document.getElementById('hero-headline');
    if (element.classList.contains('variant-b')) {
        element.classList.remove('variant-b');
        element.classList.add('variant-c');
        element.innerHTML = `
            <h1>Revolutionize Your Workflow</h1>
            <p>Variant C: A completely different approach to solving your business challenges.</p>
            <button class="cta-button primary" onclick="handleCTAClick('hero')">
                Start Revolution
            </button>
        `;
    } else if (element.classList.contains('variant-c')) {
        element.classList.remove('variant-c');
        element.innerHTML = `
            <h1>Transform Your Business Today</h1>
            <p>Back to Original: The original headline and description.</p>
            <button class="cta-button primary" onclick="handleCTAClick('hero')">
                Get Started Now
            </button>
        `;
    } else {
        element.classList.add('variant-b');
        element.innerHTML = `
            <h1>Boost Your Success Rate</h1>
            <p>Variant B: A different headline with emphasis on success and results.</p>
            <button class="cta-button primary" onclick="handleCTAClick('hero')">
                Boost Now
            </button>
        `;
    }
}

// Custom event tracking for specific page elements
document.addEventListener('click', function(e) {
    // Track clicks on specific elements
    if (e.target.matches('.feature-card')) {
        console.log('Feature card clicked');
    }
    
    if (e.target.matches('.cta-button')) {
        console.log('CTA button clicked');
    }
});

// Track scroll depth
let maxScrollDepth = 0;
window.addEventListener('scroll', function() {
    const scrollDepth = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
    
    if (scrollDepth > maxScrollDepth && scrollDepth % 25 === 0) {
        maxScrollDepth = scrollDepth;
        
        if (typeof Analytics !== 'undefined') {
            Analytics.track('scroll_depth', window.location.pathname, {
                scroll_percentage: scrollDepth,
                timestamp: Date.now()
            });
        }
    }
});
```

### Step 6: Save and Publish
1. Click **"Create Page"**
2. Your page will be available at: `http://localhost:3000/landing-page-test`

## 🧪 Setting Up A/B Testing

### Step 1: Create A/B Test Experiment
1. Go to **Admin** → **A/B Tests**
2. Click **"Create New Experiment"**
3. Fill out the form:

```
Name: Hero Headline Test
Description: Testing different headlines for better conversion
Status: Active
```

4. Click **"Create Experiment"**
5. Note the **Experiment ID** (usually 1 for first experiment)

### Step 2: Create Test Variants
1. Click **"Add Variant"** for your experiment
2. Create variants:

**Variant A (Control):**
```
Name: Original
Content: <h1>Transform Your Business Today</h1><p>The original headline and description that will be A/B tested.</p><button class="cta-button primary" onclick="handleCTAClick('hero')">Get Started Now</button>
```

**Variant B:**
```
Name: Success Focus
Content: <h1>Boost Your Success Rate</h1><p>A different headline with emphasis on success and results.</p><button class="cta-button primary" onclick="handleCTAClick('hero')">Boost Now</button>
```

**Variant C:**
```
Name: Revolutionary
Content: <h1>Revolutionize Your Workflow</h1><p>A completely different approach to solving your business challenges.</p><button class="cta-button primary" onclick="handleCTAClick('hero')">Start Revolution</button>
```

## 📊 Viewing Analytics & Heatmaps

### Analytics Dashboard
1. Go to **Admin** → **Analytics Dashboard**
2. View page performance, events, and conversions
3. Filter by date range and page path

### Heatmap Data
1. Go to **Admin** → **Heatmaps** → **View Heatmaps**
2. Filter by page path: `/landing-page-test`
3. Click **"View Details"** on any session to see click data
4. View aggregated heatmap visualizations

### A/B Test Results  
1. Go to **Admin** → **A/B Tests**
2. Click on your experiment
3. View conversion rates by variant
4. Analyze statistical significance

## 🔧 Advanced Features

### Custom Event Tracking
Add this to your JavaScript:

```javascript
// Track custom events
Analytics.track('video_play', '/landing-page-test', {
    video_id: 'intro-video',
    duration: 30,
    timestamp: Date.now()
});

// Track user engagement
Analytics.track('time_on_page', '/landing-page-test', {
    duration_seconds: 120,
    interactions: 5,
    scroll_depth: 75
});
```

### Advanced Heatmap Features
```javascript
// Get detailed heatmap statistics
const stats = CustomHeatmap.getStats();
console.log('Total clicks:', stats.totalClicks);
console.log('Session duration:', stats.sessionDuration);
console.log('Average clicks per minute:', stats.averageClicksPerMinute);

// Manual heatmap data collection
CustomHeatmap.sendData(); // Force send data to server

// Clear current session data
CustomHeatmap.clearData();
```

### Database Queries (Admin Only)
You can query the database directly:

```sql
-- Get all analytics events for your page
SELECT * FROM analytics_events 
WHERE page_path = '/landing-page-test' 
ORDER BY created_at DESC;

-- Get heatmap sessions
SELECT * FROM heatmap_sessions 
WHERE page_path = '/landing-page-test'
ORDER BY created_at DESC;

-- A/B test exposures
SELECT * FROM analytics_events 
WHERE event_type = 'ab_test_exposure' 
AND JSON_EXTRACT(event_data, '$.experiment_id') = 1;
```

## 🛠️ Troubleshooting

### Common Issues

**Page Not Loading:**
- Check slug is unique
- Ensure page is published
- Verify HTML syntax

**Analytics Not Tracking:**
- Confirm analytics.js script is included
- Check browser console for errors
- Verify Analytics object exists

**Heatmap Not Working:**
- Include heatmap.js script
- Check CustomHeatmap object
- Ensure API endpoints are working

**A/B Test Not Applying:**
- Verify experiment is active
- Check variant content is valid HTML
- Ensure target element exists

### Testing Your Setup
1. Visit your page: `http://localhost:3000/landing-page-test`
2. Open browser DevTools Console
3. Check for analytics and heatmap objects
4. Test all interactive elements
5. Verify data in admin dashboard

## 🎯 Best Practices

### Page Performance
- Minimize CSS and JavaScript
- Optimize images
- Use semantic HTML
- Test on mobile devices

### Analytics Strategy  
- Track meaningful events
- Set up conversion goals
- Monitor user flow
- A/B test incrementally

### A/B Testing Guidelines
- Test one element at a time
- Run tests for statistical significance
- Consider external factors
- Document learnings

## 📋 Checklist: New Page Creation

- [ ] Page created with unique slug
- [ ] HTML includes analytics and heatmap scripts  
- [ ] CSS is optimized and responsive
- [ ] JavaScript handles all interactions
- [ ] A/B test experiments configured
- [ ] Analytics events are tracking
- [ ] Heatmap data is collecting
- [ ] Page is published and accessible
- [ ] Mobile responsiveness tested
- [ ] Performance optimized

---

## 🚀 You're All Set!

Your custom page is now fully equipped with:
- ✅ **Analytics Tracking** - Every interaction monitored
- ✅ **Custom Heatmap** - Visual click tracking without third-party tools
- ✅ **A/B Testing** - Optimize conversion rates
- ✅ **Admin Dashboard** - Complete data visibility
- ✅ **Responsive Design** - Works on all devices

Visit your page, interact with elements, and watch the data flow into your admin dashboard!