const sqlite3 = require('sqlite3').verbose();

// Connect to the database
const db = new sqlite3.Database('./site_builder.db');

console.log('🚀 Creating live-test page with comprehensive A/B testing...');

// HTML content for the live test page
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
    
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f4f6f9;
        }
        
        .container {
            max-width: 1000px;
            margin: 0 auto;
            padding: 0 20px;
        }
        
        /* Header */
        .header {
            background: linear-gradient(135deg, #2c3e50, #3498db);
            color: white;
            padding: 60px 0;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 15px;
        }
        
        .header p {
            font-size: 1.2rem;
            opacity: 0.9;
        }
        
        /* A/B Test Section */
        .ab-test-section {
            background: white;
            padding: 50px 0;
            text-align: center;
        }
        
        #ab-test-hero {
            padding: 40px;
            border-radius: 10px;
            margin: 20px 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        
        #ab-test-hero h2 {
            font-size: 2rem;
            margin-bottom: 20px;
        }
        
        #ab-test-hero p {
            font-size: 1.1rem;
            margin-bottom: 30px;
        }
        
        .cta-button {
            display: inline-block;
            padding: 15px 30px;
            background: #e74c3c;
            color: white;
            text-decoration: none;
            border-radius: 50px;
            font-weight: bold;
            transition: all 0.3s ease;
            border: none;
            cursor: pointer;
            font-size: 1rem;
        }
        
        .cta-button:hover {
            background: #c0392b;
            transform: translateY(-2px);
        }
        
        /* Features Grid */
        .features {
            padding: 50px 0;
            background: #f8f9fa;
        }
        
        .features h2 {
            text-align: center;
            margin-bottom: 40px;
            font-size: 2rem;
            color: #2c3e50;
        }
        
        .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 30px;
        }
        
        .feature-card {
            background: white;
            padding: 30px;
            border-radius: 10px;
            text-align: center;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            transition: transform 0.3s ease;
            cursor: pointer;
        }
        
        .feature-card:hover {
            transform: translateY(-5px);
        }
        
        .feature-icon {
            font-size: 3rem;
            margin-bottom: 15px;
        }
        
        /* Contact Form */
        .contact-section {
            background: white;
            padding: 50px 0;
        }
        
        .contact-form {
            max-width: 600px;
            margin: 0 auto;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
            color: #2c3e50;
        }
        
        .form-group input,
        .form-group textarea {
            width: 100%;
            padding: 12px;
            border: 2px solid #ddd;
            border-radius: 5px;
            font-size: 1rem;
        }
        
        .form-group input:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: #3498db;
        }
        
        /* Testing Controls */
        .testing-panel {
            position: fixed;
            top: 10px;
            right: 10px;
            background: #2c3e50;
            color: white;
            padding: 15px;
            border-radius: 10px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            z-index: 1000;
            max-width: 250px;
        }
        
        .testing-panel h4 {
            margin-bottom: 10px;
            font-size: 0.9rem;
        }
        
        .test-button {
            display: block;
            width: 100%;
            margin: 5px 0;
            padding: 8px;
            background: #3498db;
            color: white;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 0.8rem;
        }
        
        .test-button:hover {
            background: #2980b9;
        }
        
        .stats-display {
            background: #34495e;
            padding: 10px;
            border-radius: 5px;
            margin-top: 10px;
            font-size: 0.7rem;
        }
        
        /* Responsive */
        @media (max-width: 768px) {
            .header h1 {
                font-size: 2rem;
            }
            
            .testing-panel {
                position: relative;
                top: auto;
                right: auto;
                margin: 20px;
            }
        }
    </style>
</head>
<body>
    <!-- Header -->
    <header class="header">
        <div class="container">
            <h1>Live Analytics & A/B Testing Demo</h1>
            <p>Complete testing environment with real-time tracking</p>
        </div>
    </header>

    <!-- A/B Test Hero Section -->
    <section class="ab-test-section">
        <div class="container">
            <h2>A/B Testing in Action</h2>
            <div id="ab-test-hero">
                <h2>Default Headline - Will Be Replaced</h2>
                <p>This content will be dynamically replaced by A/B test variants</p>
                <button class="cta-button" onclick="handleCTAClick('hero-section')">
                    Default CTA Button
                </button>
            </div>
            <p><em>The content above changes based on A/B test configuration</em></p>
        </div>
    </section>

    <!-- Features Section -->
    <section class="features">
        <div class="container">
            <h2>Interactive Features</h2>
            <div class="features-grid">
                <div class="feature-card" onclick="trackFeatureClick('analytics')">
                    <div class="feature-icon">📊</div>
                    <h3>Analytics Tracking</h3>
                    <p>Every click, scroll, and interaction is tracked in real-time</p>
                </div>
                
                <div class="feature-card" onclick="trackFeatureClick('heatmaps')">
                    <div class="feature-icon">🎯</div>
                    <h3>Custom Heatmaps</h3>
                    <p>Built-in heatmap solution without third-party dependencies</p>
                </div>
                
                <div class="feature-card" onclick="trackFeatureClick('ab-testing')">
                    <div class="feature-icon">🧪</div>
                    <h3>A/B Testing</h3>
                    <p>Live A/B testing with automatic variant assignment</p>
                </div>
                
                <div class="feature-card" onclick="trackFeatureClick('dashboard')">
                    <div class="feature-icon">📈</div>
                    <h3>Admin Dashboard</h3>
                    <p>Complete analytics dashboard with detailed insights</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Contact Form -->
    <section class="contact-section">
        <div class="container">
            <h2 style="text-align: center; margin-bottom: 30px;">Test Contact Form</h2>
            <form id="contact-form" class="contact-form">
                <div class="form-group">
                    <label for="name">Full Name</label>
                    <input type="text" id="name" name="name" required>
                </div>
                
                <div class="form-group">
                    <label for="email">Email Address</label>
                    <input type="email" id="email" name="email" required>
                </div>
                
                <div class="form-group">
                    <label for="company">Company (Optional)</label>
                    <input type="text" id="company" name="company">
                </div>
                
                <div class="form-group">
                    <label for="interest">Area of Interest</label>
                    <select id="interest" name="interest" style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 5px;">
                        <option value="">Select an option</option>
                        <option value="analytics">Analytics Solutions</option>
                        <option value="ab-testing">A/B Testing</option>
                        <option value="heatmaps">Heatmap Analysis</option>
                        <option value="integration">Custom Integration</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="message">Message</label>
                    <textarea id="message" name="message" rows="4" placeholder="Tell us about your needs..."></textarea>
                </div>
                
                <div style="text-align: center;">
                    <button type="submit" class="cta-button">
                        Send Message & Track Conversion
                    </button>
                </div>
            </form>
        </div>
    </section>

    <!-- Testing Control Panel -->
    <div class="testing-panel">
        <h4>🧪 Live Testing Controls</h4>
        
        <button class="test-button" onclick="showHeatmapOverlay()">
            👁️ Show Heatmap
        </button>
        
        <button class="test-button" onclick="hideHeatmapOverlay()">
            🙈 Hide Heatmap
        </button>
        
        <button class="test-button" onclick="switchABVariant()">
            🔄 Switch A/B Variant
        </button>
        
        <button class="test-button" onclick="clearHeatmapData()">
            🗑️ Clear Heatmap Data
        </button>
        
        <button class="test-button" onclick="showStats()">
            📊 Show Live Stats
        </button>
        
        <button class="test-button" onclick="triggerConversion()">
            🎯 Trigger Conversion
        </button>
        
        <div class="stats-display" id="live-stats">
            <div>Session: <span id="session-id">Loading...</span></div>
            <div>Clicks: <span id="click-count">0</span></div>
            <div>Duration: <span id="session-duration">0s</span></div>
            <div>A/B Variant: <span id="ab-variant">Loading...</span></div>
        </div>
    </div>

    <script>
        // Global variables for tracking
        let currentABVariant = 'A';
        let sessionStartTime = Date.now();
        let clickCount = 0;
        let conversionCount = 0;

        // Initialize page
        document.addEventListener('DOMContentLoaded', function() {
            console.log('🚀 Live test page loaded');
            
            // Initialize A/B testing
            initializeABTesting();
            
            // Setup form tracking
            setupFormTracking();
            
            // Update live stats
            updateLiveStats();
            setInterval(updateLiveStats, 2000);
            
            // Track page load
            if (typeof Analytics !== 'undefined') {
                Analytics.track('page_load', window.location.pathname, {
                    page_type: 'live_test',
                    test_environment: true,
                    timestamp: Date.now()
                });
            }
        });

        // A/B Testing Functions
        async function initializeABTesting() {
            try {
                // Try to get experiment ID 2 (we'll create this)
                const variant = await ABTest.applyVariant(2, '#ab-test-hero');
                currentABVariant = variant.variant;
                
                console.log('✅ A/B Test initialized:', variant);
                
                // Track A/B test exposure
                if (typeof Analytics !== 'undefined') {
                    Analytics.track('ab_test_exposure', window.location.pathname, {
                        experiment_id: 2,
                        variant: variant.variant,
                        experiment_name: 'Live Test Hero',
                        timestamp: Date.now()
                    });
                }
            } catch (error) {
                console.warn('⚠️ A/B Testing initialization failed:', error);
                // Fallback to default content
                currentABVariant = 'Default';
            }
        }

        // CTA Click Handler
        function handleCTAClick(source) {
            clickCount++;
            console.log('🎯 CTA clicked from:', source);
            
            // Track the CTA click with conversion intent
            if (typeof Analytics !== 'undefined') {
                Analytics.track('cta_click', window.location.pathname, {
                    cta_source: source,
                    ab_variant: currentABVariant,
                    button_text: event.target.textContent,
                    is_conversion_event: true,
                    timestamp: Date.now()
                });
            }
            
            // Simulate conversion
            conversionCount++;
            alert('🎉 Conversion tracked! CTA clicked from: ' + source + '\\nVariant: ' + currentABVariant);
        }

        // Feature Click Handler
        function trackFeatureClick(feature) {
            clickCount++;
            console.log('📱 Feature clicked:', feature);
            
            if (typeof Analytics !== 'undefined') {
                Analytics.track('feature_interaction', window.location.pathname, {
                    feature_name: feature,
                    ab_variant: currentABVariant,
                    timestamp: Date.now()
                });
            }
            
            // Visual feedback
            event.target.style.transform = 'scale(0.95)';
            setTimeout(() => {
                event.target.style.transform = '';
            }, 150);
        }

        // Form Tracking
        function setupFormTracking() {
            const form = document.getElementById('contact-form');
            if (!form) return;
            
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                
                const formData = new FormData(form);
                const data = Object.fromEntries(formData);
                
                console.log('📝 Form submitted:', data);
                
                // Track form conversion
                if (typeof Analytics !== 'undefined') {
                    Analytics.track('form_conversion', window.location.pathname, {
                        form_type: 'contact',
                        form_data: data,
                        ab_variant: currentABVariant,
                        is_conversion_event: true,
                        conversion_value: 100, // Assign value to conversion
                        timestamp: Date.now()
                    });
                }
                
                // Show success message
                conversionCount++;
                alert('✅ Form submitted successfully!\\n\\nData tracked:\\n' + JSON.stringify(data, null, 2));
                
                // Reset form
                form.reset();
            });

            // Track field interactions
            const inputs = form.querySelectorAll('input, textarea, select');
            inputs.forEach(input => {
                input.addEventListener('focus', function() {
                    if (typeof Analytics !== 'undefined') {
                        Analytics.track('form_field_interaction', window.location.pathname, {
                            field_name: input.name,
                            field_type: input.type || input.tagName.toLowerCase(),
                            ab_variant: currentABVariant,
                            timestamp: Date.now()
                        });
                    }
                });
            });
        }

        // Testing Control Functions
        function showHeatmapOverlay() {
            if (typeof CustomHeatmap !== 'undefined') {
                CustomHeatmap.createOverlay();
                console.log('👁️ Heatmap overlay displayed');
            }
        }

        function hideHeatmapOverlay() {
            if (typeof CustomHeatmap !== 'undefined') {
                CustomHeatmap.removeOverlay();
                console.log('🙈 Heatmap overlay hidden');
            }
        }

        function switchABVariant() {
            // Manual variant switching for testing
            const element = document.getElementById('ab-test-hero');
            const variants = ['A', 'B', 'C'];
            const currentIndex = variants.indexOf(currentABVariant);
            const nextIndex = (currentIndex + 1) % variants.length;
            currentABVariant = variants[nextIndex];

            const variantContent = {
                'A': {
                    html: '<h2>🚀 Boost Your Growth Today</h2><p>Variant A: Focus on growth and acceleration</p><button class="cta-button" onclick="handleCTAClick(\\'hero-section\\')">Start Growing Now</button>',
                    bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                },
                'B': {
                    html: '<h2>💡 Smart Solutions for Success</h2><p>Variant B: Emphasis on intelligence and success</p><button class="cta-button" onclick="handleCTAClick(\\'hero-section\\')">Get Smart Results</button>',
                    bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
                },
                'C': {
                    html: '<h2>⚡ Transform Your Business</h2><p>Variant C: Focus on transformation and power</p><button class="cta-button" onclick="handleCTAClick(\\'hero-section\\')">Transform Now</button>',
                    bg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
                }
            };

            element.innerHTML = variantContent[currentABVariant].html;
            element.style.background = variantContent[currentABVariant].bg;
            
            console.log('🔄 Switched to variant:', currentABVariant);
            
            // Track variant switch
            if (typeof Analytics !== 'undefined') {
                Analytics.track('ab_variant_switch', window.location.pathname, {
                    new_variant: currentABVariant,
                    manual_switch: true,
                    timestamp: Date.now()
                });
            }
        }

        function clearHeatmapData() {
            if (typeof CustomHeatmap !== 'undefined') {
                CustomHeatmap.clearData();
                console.log('🗑️ Heatmap data cleared');
            }
        }

        function showStats() {
            const stats = getComprehensiveStats();
            alert('📊 Live Analytics Stats:\\n\\n' + JSON.stringify(stats, null, 2));
        }

        function triggerConversion() {
            // Simulate a high-value conversion event
            conversionCount++;
            
            if (typeof Analytics !== 'undefined') {
                Analytics.track('manual_conversion', window.location.pathname, {
                    conversion_type: 'manual_trigger',
                    conversion_value: 250,
                    ab_variant: currentABVariant,
                    timestamp: Date.now()
                });
            }
            
            console.log('🎯 Manual conversion triggered');
            alert('🎯 High-value conversion event triggered!\\nThis simulates a purchase or signup.');
        }

        // Live Stats Update
        function updateLiveStats() {
            const sessionDuration = Math.floor((Date.now() - sessionStartTime) / 1000);
            
            document.getElementById('session-id').textContent = 
                (typeof Analytics !== 'undefined' && Analytics.sessionId) ? 
                Analytics.sessionId.substr(-8) : 'Loading...';
            
            document.getElementById('click-count').textContent = clickCount;
            document.getElementById('session-duration').textContent = sessionDuration + 's';
            document.getElementById('ab-variant').textContent = currentABVariant;
        }

        // Comprehensive stats for debugging
        function getComprehensiveStats() {
            const heatmapStats = (typeof CustomHeatmap !== 'undefined') ? 
                CustomHeatmap.getStats() : {};
                
            return {
                session: {
                    id: (typeof Analytics !== 'undefined') ? Analytics.sessionId : 'N/A',
                    duration: Math.floor((Date.now() - sessionStartTime) / 1000),
                    page: window.location.pathname
                },
                interactions: {
                    clicks: clickCount,
                    conversions: conversionCount,
                    ab_variant: currentABVariant
                },
                heatmap: heatmapStats,
                performance: {
                    page_load_time: performance.timing ? 
                        performance.timing.loadEventEnd - performance.timing.navigationStart : 'N/A',
                    dom_ready: document.readyState
                }
            };
        }

        // Scroll tracking
        let maxScrollDepth = 0;
        window.addEventListener('scroll', function() {
            const scrollPercent = Math.round(
                (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
            );
            
            if (scrollPercent > maxScrollDepth) {
                maxScrollDepth = scrollPercent;
                
                // Track scroll milestones
                if ([25, 50, 75, 100].includes(scrollPercent)) {
                    if (typeof Analytics !== 'undefined') {
                        Analytics.track('scroll_milestone', window.location.pathname, {
                            scroll_depth: scrollPercent,
                            ab_variant: currentABVariant,
                            timestamp: Date.now()
                        });
                    }
                }
            }
        });

        // Track clicks globally
        document.addEventListener('click', function(e) {
            clickCount++;
        });

        console.log('✅ Live test page fully initialized');
    </script>
</body>
</html>`;

db.serialize(() => {
    // Create the live-test page
    db.run(`INSERT OR REPLACE INTO pages (
        slug, title, meta_description, html_content, css_content, js_content, 
        is_published, access_level, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        'live-test',
        'Live Analytics & A/B Testing Demo',
        'Comprehensive live testing environment with real-time analytics, heatmaps, and A/B testing',
        htmlContent,
        '', // CSS is included in HTML
        '', // JavaScript is included in HTML
        1, // is_published
        'public',
        1 // created_by (admin user)
    ], function(err) {
        if (err) {
            console.error('❌ Error creating live-test page:', err);
            return;
        }
        console.log('✅ Live test page created: /live-test');
    });

    // Create comprehensive A/B test experiment for live testing
    db.run(`INSERT OR REPLACE INTO ab_experiments (
        id, name, description, page_path, variant_a_content, variant_b_content, 
        traffic_split, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
        2,
        'Live Test Hero Experiment',
        'Comprehensive A/B testing for the live test page hero section',
        '/live-test',
        '<h2>🚀 Boost Your Growth Today</h2><p>Variant A: Focus on growth and acceleration</p><button class="cta-button" onclick="handleCTAClick(\'hero-section\')">Start Growing Now</button>',
        '<h2>💡 Smart Solutions for Success</h2><p>Variant B: Emphasis on intelligence and success</p><button class="cta-button" onclick="handleCTAClick(\'hero-section\')">Get Smart Results</button>',
        50, // 50/50 split
        1 // is_active
    ], function(err) {
        if (err) {
            console.error('❌ Error creating A/B experiment:', err);
            return;
        }
        console.log('✅ A/B experiment created for live-test page');
        console.log('   📊 Experiment ID: 2');
        console.log('   🎯 Variant A: Boost Your Growth Today');
        console.log('   🎯 Variant B: Smart Solutions for Success');
    });

    console.log('\\n🎉 Live Test Setup Complete!');
    console.log('\\n🌟 Your comprehensive test page is ready at: http://localhost:3000/live-test');
    console.log('\\n✨ Features included:');
    console.log('   📊 Complete analytics tracking');
    console.log('   🎯 Custom heatmap with live visualization');
    console.log('   🧪 A/B testing with 2 variants (expandable to 3)');
    console.log('   📝 Form conversion tracking');
    console.log('   🎮 Interactive testing control panel');
    console.log('   📈 Real-time statistics display');
    console.log('   🔄 Manual variant switching');
    console.log('   🎨 Responsive design with modern UI');
    console.log('\\n🎯 Testing workflow:');
    console.log('   1. Visit /live-test page');
    console.log('   2. Use testing control panel (top-right)');
    console.log('   3. Click elements and fill forms');
    console.log('   4. View data in /admin/analytics and /admin/heatmaps');
    console.log('   5. Manage A/B tests in /admin/ab-tests');
    
    db.close((err) => {
        if (err) {
            console.error('❌ Database error:', err);
        } else {
            console.log('\\n🔒 Database connection closed.');
            console.log('\\n🚀 Ready to test! Your server is already running.');
        }
    });
});

console.log('📝 Setting up comprehensive live testing environment...');