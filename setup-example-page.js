const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the database
const db = new sqlite3.Database('./site_builder.db');

// HTML content for the example page
const htmlContent = `<!DOCTYPE html>
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

    <!-- Testing Controls -->
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
</html>`;

// CSS content
const cssContent = `/* Reset and Base Styles */
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

/* Testing Controls */
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

/* A/B Testing Variants */
.variant-b .hero-headline h1 {
    color: #ff6b6b;
}

.variant-b .hero-headline p {
    font-style: italic;
}

.variant-c .hero-section {
    background: linear-gradient(135deg, #ff6b6b 0%, #ffa726 100%);
}`;

// JavaScript content
const jsContent = `// Page-specific analytics and functionality
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
        // Test experiment ID 1
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
        alert('Heatmap Stats:\\n' + JSON.stringify(stats, null, 2));
        console.log('Heatmap stats:', stats);
    }
}

function applyABVariant() {
    // Manually switch between variants for testing
    const element = document.getElementById('hero-headline');
    if (element.classList.contains('variant-b')) {
        element.classList.remove('variant-b');
        element.classList.add('variant-c');
        element.innerHTML = \`
            <h1>Revolutionize Your Workflow</h1>
            <p>Variant C: A completely different approach to solving your business challenges.</p>
            <button class="cta-button primary" onclick="handleCTAClick('hero')">
                Start Revolution
            </button>
        \`;
    } else if (element.classList.contains('variant-c')) {
        element.classList.remove('variant-c');
        element.innerHTML = \`
            <h1>Transform Your Business Today</h1>
            <p>Back to Original: The original headline and description.</p>
            <button class="cta-button primary" onclick="handleCTAClick('hero')">
                Get Started Now
            </button>
        \`;
    } else {
        element.classList.add('variant-b');
        element.innerHTML = \`
            <h1>Boost Your Success Rate</h1>
            <p>Variant B: A different headline with emphasis on success and results.</p>
            <button class="cta-button primary" onclick="handleCTAClick('hero')">
                Boost Now
            </button>
        \`;
    }
}

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
});`;

console.log('🚀 Setting up example landing page and A/B testing...');

db.serialize(() => {
    // First, create the example page
    db.run(`INSERT OR REPLACE INTO pages (
        slug, title, meta_description, html_content, css_content, js_content, 
        is_published, access_level, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        'landing-page-test',
        'Analytics Test Landing Page',
        'A comprehensive test page with analytics tracking, heatmaps, and A/B testing capabilities',
        htmlContent,
        cssContent,
        jsContent,
        1, // is_published
        'public',
        1 // created_by (admin user)
    ], function(err) {
        if (err) {
            console.error('Error creating page:', err);
            return;
        }
        console.log('✅ Example page created: /landing-page-test');
    });

    // Create A/B test experiment (using actual schema)
    db.run(`INSERT OR REPLACE INTO ab_experiments (
        id, name, description, page_path, variant_a_content, variant_b_content, 
        traffic_split, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
        1,
        'Hero Headline Test',
        'Testing different headlines and CTAs for better conversion rates',
        '/landing-page-test',
        '<h1>Transform Your Business Today</h1><p>The original headline and description that will be A/B tested.</p><button class="cta-button primary" onclick="handleCTAClick(\'hero\')">Get Started Now</button>',
        '<h1>Boost Your Success Rate</h1><p>A different headline with emphasis on success and results.</p><button class="cta-button primary" onclick="handleCTAClick(\'hero\')">Boost Now</button>',
        50, // 50/50 split
        1 // is_active
    ], function(err) {
        if (err) {
            console.error('Error creating A/B experiment:', err);
            return;
        }
        console.log('✅ A/B experiment created: Hero Headline Test');
        console.log('   - Variant A: Transform Your Business Today');
        console.log('   - Variant B: Boost Your Success Rate');
        console.log('   - Traffic Split: 50/50');
    });

    console.log('\n🎉 Setup complete! ');
    console.log('\n📍 Your test page is available at: http://localhost:3000/landing-page-test');
    console.log('🔧 Admin panel: http://localhost:3000/admin');
    console.log('📊 Analytics: http://localhost:3000/admin/analytics');
    console.log('🎯 Heatmaps: http://localhost:3000/admin/heatmaps');
    console.log('🧪 A/B Tests: http://localhost:3000/admin/ab-tests');
    console.log('\n✨ The page includes:');
    console.log('   - Complete analytics tracking');
    console.log('   - Custom heatmap collection');
    console.log('   - A/B testing with 3 variants');
    console.log('   - Interactive testing controls');
    console.log('   - Responsive design');
    
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('\n🔒 Database connection closed.');
            console.log('\n🚀 Ready to test! Start the server with: npm run dev');
        }
    });
});

console.log('📝 Setup script executed');
console.log('🎯 Creating example page and A/B testing data...');