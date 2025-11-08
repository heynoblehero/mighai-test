import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/AdminLayout';

export default function NewEnhancedPage() {
  const [mode, setMode] = useState('visual'); // 'visual', 'ai', 'code'
  const [currentView, setCurrentView] = useState('split'); // 'preview', 'code', 'split'
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);

  const [pageData, setPageData] = useState({
    title: '',
    slug: '',
    meta_description: '',
    html_content: '',
    css_content: '',
    js_content: '',
    is_published: true,
    access_level: 'public'
  });

  // Visual Builder State
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const previewRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Component Templates
  const componentTemplates = {
    hero: {
      name: 'Hero Section',
      icon: '🎯',
      html: `<section class="hero-section">
  <div class="container">
    <h1>Your Amazing Headline</h1>
    <p class="subtitle">Your compelling subtitle goes here</p>
    <button class="cta-button">Get Started</button>
  </div>
</section>`,
      css: `.hero-section {
  padding: 100px 20px;
  text-align: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}
.hero-section h1 {
  font-size: 3rem;
  margin-bottom: 1rem;
  font-weight: bold;
}
.hero-section .subtitle {
  font-size: 1.25rem;
  margin-bottom: 2rem;
  opacity: 0.9;
}
.cta-button {
  background: white;
  color: #667eea;
  padding: 15px 40px;
  border: none;
  border-radius: 50px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s;
}
.cta-button:hover {
  transform: scale(1.05);
}`
    },
    features: {
      name: 'Features Grid',
      icon: '✨',
      html: `<section class="features-section">
  <div class="container">
    <h2>Features</h2>
    <div class="features-grid">
      <div class="feature-card">
        <div class="feature-icon">🚀</div>
        <h3>Fast</h3>
        <p>Lightning fast performance</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">🎨</div>
        <h3>Beautiful</h3>
        <p>Stunning design out of the box</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">🔒</div>
        <h3>Secure</h3>
        <p>Enterprise-grade security</p>
      </div>
    </div>
  </div>
</section>`,
      css: `.features-section {
  padding: 80px 20px;
  background: #f8f9fa;
}
.features-section h2 {
  text-align: center;
  font-size: 2.5rem;
  margin-bottom: 3rem;
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
  text-align: center;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  transition: transform 0.2s;
}
.feature-card:hover {
  transform: translateY(-5px);
}
.feature-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}
.feature-card h3 {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}
.feature-card p {
  color: #666;
}`
    },
    pricing: {
      name: 'Pricing Cards',
      icon: '💰',
      html: `<section class="pricing-section">
  <div class="container">
    <h2>Pricing Plans</h2>
    <div class="pricing-grid">
      <div class="pricing-card">
        <h3>Starter</h3>
        <div class="price">$9<span>/mo</span></div>
        <ul class="features-list">
          <li>✓ Feature 1</li>
          <li>✓ Feature 2</li>
          <li>✓ Feature 3</li>
        </ul>
        <button class="plan-button">Get Started</button>
      </div>
      <div class="pricing-card featured">
        <div class="badge">Popular</div>
        <h3>Pro</h3>
        <div class="price">$29<span>/mo</span></div>
        <ul class="features-list">
          <li>✓ Everything in Starter</li>
          <li>✓ Advanced Feature 1</li>
          <li>✓ Advanced Feature 2</li>
        </ul>
        <button class="plan-button">Get Started</button>
      </div>
      <div class="pricing-card">
        <h3>Enterprise</h3>
        <div class="price">$99<span>/mo</span></div>
        <ul class="features-list">
          <li>✓ Everything in Pro</li>
          <li>✓ Premium Feature 1</li>
          <li>✓ Premium Feature 2</li>
        </ul>
        <button class="plan-button">Contact Sales</button>
      </div>
    </div>
  </div>
</section>`,
      css: `.pricing-section {
  padding: 80px 20px;
}
.pricing-section h2 {
  text-align: center;
  font-size: 2.5rem;
  margin-bottom: 3rem;
}
.pricing-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}
.pricing-card {
  background: white;
  padding: 2.5rem;
  border-radius: 12px;
  border: 2px solid #e0e0e0;
  text-align: center;
  position: relative;
  transition: all 0.3s;
}
.pricing-card:hover {
  transform: translateY(-10px);
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
}
.pricing-card.featured {
  border-color: #667eea;
  transform: scale(1.05);
}
.badge {
  position: absolute;
  top: -15px;
  left: 50%;
  transform: translateX(-50%);
  background: #667eea;
  color: white;
  padding: 5px 20px;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 600;
}
.pricing-card h3 {
  font-size: 1.75rem;
  margin-bottom: 1rem;
}
.price {
  font-size: 3rem;
  font-weight: bold;
  color: #667eea;
  margin-bottom: 1.5rem;
}
.price span {
  font-size: 1.25rem;
  color: #666;
}
.features-list {
  list-style: none;
  padding: 0;
  margin: 2rem 0;
  text-align: left;
}
.features-list li {
  padding: 0.75rem 0;
  border-bottom: 1px solid #f0f0f0;
}
.plan-button {
  width: 100%;
  background: #667eea;
  color: white;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}
.plan-button:hover {
  background: #5568d3;
}`
    },
    contact: {
      name: 'Contact Form',
      icon: '📧',
      html: `<section class="contact-section">
  <div class="container">
    <h2>Get In Touch</h2>
    <form class="contact-form" onsubmit="return false;">
      <div class="form-row">
        <input type="text" placeholder="Your Name" required>
        <input type="email" placeholder="Your Email" required>
      </div>
      <textarea placeholder="Your Message" rows="5" required></textarea>
      <button type="submit" class="submit-button">Send Message</button>
    </form>
  </div>
</section>`,
      css: `.contact-section {
  padding: 80px 20px;
  background: #f8f9fa;
}
.contact-section h2 {
  text-align: center;
  font-size: 2.5rem;
  margin-bottom: 3rem;
}
.contact-form {
  max-width: 600px;
  margin: 0 auto;
}
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}
.contact-form input,
.contact-form textarea {
  width: 100%;
  padding: 15px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s;
}
.contact-form input:focus,
.contact-form textarea:focus {
  outline: none;
  border-color: #667eea;
}
.submit-button {
  width: 100%;
  background: #667eea;
  color: white;
  padding: 15px;
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}
.submit-button:hover {
  background: #5568d3;
}`
    },
    testimonials: {
      name: 'Testimonials',
      icon: '⭐',
      html: `<section class="testimonials-section">
  <div class="container">
    <h2>What Our Customers Say</h2>
    <div class="testimonials-grid">
      <div class="testimonial-card">
        <div class="stars">⭐⭐⭐⭐⭐</div>
        <p class="quote">"This product changed my life! Highly recommend to everyone."</p>
        <div class="author">
          <strong>John Doe</strong>
          <span>CEO, Company Inc</span>
        </div>
      </div>
      <div class="testimonial-card">
        <div class="stars">⭐⭐⭐⭐⭐</div>
        <p class="quote">"Amazing service and support. Worth every penny!"</p>
        <div class="author">
          <strong>Jane Smith</strong>
          <span>Founder, Startup Co</span>
        </div>
      </div>
      <div class="testimonial-card">
        <div class="stars">⭐⭐⭐⭐⭐</div>
        <p class="quote">"Best decision we made for our business this year."</p>
        <div class="author">
          <strong>Mike Johnson</strong>
          <span>CTO, Tech Corp</span>
        </div>
      </div>
    </div>
  </div>
</section>`,
      css: `.testimonials-section {
  padding: 80px 20px;
}
.testimonials-section h2 {
  text-align: center;
  font-size: 2.5rem;
  margin-bottom: 3rem;
}
.testimonials-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}
.testimonial-card {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.1);
}
.stars {
  font-size: 1.25rem;
  margin-bottom: 1rem;
}
.quote {
  font-size: 1.1rem;
  line-height: 1.6;
  margin-bottom: 1.5rem;
  color: #333;
  font-style: italic;
}
.author {
  display: flex;
  flex-direction: column;
}
.author strong {
  font-size: 1.1rem;
  margin-bottom: 0.25rem;
}
.author span {
  color: #666;
  font-size: 0.9rem;
}`
    },
    footer: {
      name: 'Footer',
      icon: '🔽',
      html: `<footer class="footer-section">
  <div class="container">
    <div class="footer-grid">
      <div class="footer-col">
        <h4>Company</h4>
        <ul>
          <li><a href="#">About</a></li>
          <li><a href="#">Careers</a></li>
          <li><a href="#">Contact</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Product</h4>
        <ul>
          <li><a href="#">Features</a></li>
          <li><a href="#">Pricing</a></li>
          <li><a href="#">Documentation</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Legal</h4>
        <ul>
          <li><a href="#">Privacy</a></li>
          <li><a href="#">Terms</a></li>
          <li><a href="#">Security</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <p>&copy; 2024 Your Company. All rights reserved.</p>
    </div>
  </div>
</footer>`,
      css: `.footer-section {
  background: #1a1a1a;
  color: white;
  padding: 60px 20px 20px;
}
.footer-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 3rem;
  max-width: 1200px;
  margin: 0 auto 2rem;
}
.footer-col h4 {
  margin-bottom: 1rem;
  font-size: 1.25rem;
}
.footer-col ul {
  list-style: none;
  padding: 0;
}
.footer-col li {
  margin-bottom: 0.75rem;
}
.footer-col a {
  color: #999;
  text-decoration: none;
  transition: color 0.2s;
}
.footer-col a:hover {
  color: white;
}
.footer-bottom {
  text-align: center;
  padding-top: 2rem;
  border-top: 1px solid #333;
  color: #999;
}`
    }
  };

  const addSection = (templateKey) => {
    const template = componentTemplates[templateKey];
    const newSection = {
      id: Date.now(),
      type: templateKey,
      name: template.name,
      html: template.html,
      css: template.css,
      js: ''
    };
    setSections(prev => [...prev, newSection]);
    updatePageData([...sections, newSection]);
  };

  const removeSection = (id) => {
    const updatedSections = sections.filter(s => s.id !== id);
    setSections(updatedSections);
    updatePageData(updatedSections);
  };

  const moveSectionUp = (index) => {
    if (index === 0) return;
    const newSections = [...sections];
    [newSections[index-1], newSections[index]] = [newSections[index], newSections[index-1]];
    setSections(newSections);
    updatePageData(newSections);
  };

  const moveSectionDown = (index) => {
    if (index === sections.length - 1) return;
    const newSections = [...sections];
    [newSections[index], newSections[index+1]] = [newSections[index+1], newSections[index]];
    setSections(newSections);
    updatePageData(newSections);
  };

  const updatePageData = (currentSections) => {
    const html = currentSections.map(s => s.html).join('\n\n');
    const css = `
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  line-height: 1.6;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

${currentSections.map(s => s.css).join('\n\n')}
`;
    const js = currentSections.map(s => s.js).filter(Boolean).join('\n\n');

    setPageData(prev => ({
      ...prev,
      html_content: html,
      css_content: css,
      js_content: js
    }));
    setPreviewKey(p => p + 1);
  };

  const generateWithAI = async (prompt, isModification = false) => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setError('');

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: prompt,
      timestamp: new Date()
    };
    setChatHistory(prev => [...prev, userMessage]);

    try {
      const response = await fetch('/api/ai/generate-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt,
          context: isModification ? {
            html: pageData.html_content,
            css: pageData.css_content,
            js: pageData.js_content
          } : '',
          iteration_type: isModification ? 'modify' : 'new',
          separate_assets: true
        })
      });

      const data = await response.json();

      if (data.success) {
        setPageData(prev => ({
          ...prev,
          html_content: data.html_code || data.html_content || '',
          css_content: data.css_code || data.css_content || '',
          js_content: data.js_code || data.js_content || ''
        }));
        setPreviewKey(prev => prev + 1);

        const aiMessage = {
          id: Date.now() + 1,
          type: 'ai',
          content: isModification ? 'Page updated successfully!' : 'Page generated successfully!',
          timestamp: new Date()
        };
        setChatHistory(prev => [...prev, aiMessage]);

        if (!isModification && !pageData.title) {
          const titleMatch = data.html_code?.match(/<title[^>]*>([^<]*)<\/title>/i) ||
                           data.html_code?.match(/<h1[^>]*>([^<]*)<\/h1>/i);
          const extractedTitle = titleMatch?.[1] || prompt.slice(0, 50) + '...';

          setPageData(prev => ({
            ...prev,
            title: extractedTitle,
            slug: generateSlug(extractedTitle)
          }));
        }
      } else {
        throw new Error(data.error || 'Failed to generate page');
      }
    } catch (error) {
      console.error('Generation failed:', error);
      setError(error.message);

      const errorMessage = {
        id: Date.now() + 1,
        type: 'error',
        content: 'Failed to generate page: ' + error.message,
        timestamp: new Date()
      };
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false);
      setCurrentPrompt('');
    }
  };

  const handleAISubmit = (e) => {
    e.preventDefault();
    if (currentPrompt.trim() && !isGenerating) {
      const isModification = chatHistory.length > 0 && (pageData.html_content || pageData.css_content);
      generateWithAI(currentPrompt, isModification);
    }
  };

  const savePage = async () => {
    if (!pageData.title || !pageData.html_content) {
      setError('Please add a title and content before saving');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const response = await fetch('/api/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pageData),
      });

      if (response.ok) {
        router.push('/admin/pages');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save page');
      }
    } catch (err) {
      setError('Failed to save page');
    } finally {
      setSaving(false);
    }
  };

  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  };

  const getPreviewContent = () => {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageData.title || 'Preview'}</title>
  <style>${pageData.css_content}</style>
</head>
<body>
  ${pageData.html_content}
  <script>${pageData.js_content}</script>
</body>
</html>`;
  };

  return (
    <AdminLayout title="Create Enhanced Page">
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">Create New Page</h1>
            <p className="text-slate-400 mt-1">Build advanced pages with visual components, AI, or custom code</p>
          </div>
          <div className="flex bg-slate-700 rounded-lg p-1">
            <button
              onClick={() => setMode('visual')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'visual' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              🎨 Visual
            </button>
            <button
              onClick={() => setMode('ai')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'ai' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              🤖 AI
            </button>
            <button
              onClick={() => setMode('code')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'code' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              💻 Code
            </button>
          </div>
        </div>

        {/* Visual Builder Mode */}
        {mode === 'visual' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Components Library */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-slate-200 mb-4">Components</h3>
              <div className="space-y-2">
                {Object.entries(componentTemplates).map(([key, template]) => (
                  <button
                    key={key}
                    onClick={() => addSection(key)}
                    className="w-full text-left px-4 py-3 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg transition-colors flex items-center space-x-3"
                  >
                    <span className="text-2xl">{template.icon}</span>
                    <span className="text-slate-200 font-medium">{template.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sections List */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-slate-200 mb-4">Page Sections</h3>
              {sections.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <div className="text-4xl mb-2">📄</div>
                  <p className="text-sm">No sections yet. Add components from the left.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sections.map((section, index) => (
                    <div key={section.id} className="bg-slate-700 border border-slate-600 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-200 font-medium">{section.name}</span>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => moveSectionUp(index)}
                            disabled={index === 0}
                            className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-30"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => moveSectionDown(index)}
                            disabled={index === sections.length - 1}
                            className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-30"
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => removeSection(section.id)}
                            className="p-1 text-red-400 hover:text-red-300"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Preview */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-700 bg-slate-900/50">
                <h3 className="text-lg font-semibold text-slate-200">Preview</h3>
              </div>
              <div className="h-[600px] bg-white">
                {pageData.html_content ? (
                  <iframe
                    key={previewKey}
                    srcDoc={getPreviewContent()}
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-forms allow-modals"
                    title="Page Preview"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-500">
                    <div className="text-center">
                      <div className="text-6xl mb-4">👀</div>
                      <p>Preview will appear here</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* AI Mode */}
        {mode === 'ai' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
            {/* AI Chat */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-slate-700 bg-slate-900/50">
                <h3 className="text-lg font-semibold text-slate-200">🤖 AI Assistant</h3>
                <p className="text-sm text-slate-400 mt-1">Describe your page and I'll build it with separated HTML, CSS, and JavaScript</p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatHistory.length === 0 && (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">🎨</div>
                    <h3 className="text-lg font-medium text-slate-200 mb-2">Ready to build!</h3>
                    <p className="text-slate-400 text-sm">Tell me what kind of page you want to create</p>
                  </div>
                )}

                {chatHistory.map((message) => (
                  <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-lg px-4 py-3 ${
                      message.type === 'user'
                        ? 'bg-emerald-600 text-white'
                        : message.type === 'error'
                        ? 'bg-red-900/20 border border-red-600/30 text-red-300'
                        : 'bg-slate-700 text-slate-200'
                    }`}>
                      <p className="text-sm">{message.content}</p>
                      <div className="text-xs text-slate-500 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}

                {isGenerating && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] bg-slate-700 text-slate-200 rounded-lg px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600"></div>
                        <span className="text-sm">Building your page...</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              <div className="border-t border-slate-700 p-4">
                <form onSubmit={handleAISubmit} className="flex space-x-3">
                  <input
                    type="text"
                    value={currentPrompt}
                    onChange={(e) => setCurrentPrompt(e.target.value)}
                    placeholder="Describe your page..."
                    className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    disabled={isGenerating}
                  />
                  <button
                    type="submit"
                    disabled={isGenerating || !currentPrompt.trim()}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {isGenerating ? '⏳' : '🚀'}
                  </button>
                </form>
              </div>
            </div>

            {/* Preview */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-slate-700 bg-slate-900/50">
                <h3 className="text-lg font-semibold text-slate-200">👁️ Live Preview</h3>
              </div>
              <div className="flex-1 bg-white">
                {pageData.html_content ? (
                  <iframe
                    key={previewKey}
                    srcDoc={getPreviewContent()}
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-forms allow-modals"
                    title="Page Preview"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-500">
                    <div className="text-center">
                      <div className="text-6xl mb-4">📄</div>
                      <p>Preview will appear here</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Code Mode */}
        {mode === 'code' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Code Editors */}
            <div className="space-y-4">
              <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                <div className="px-4 py-2 border-b border-slate-700 bg-slate-900/50">
                  <h4 className="text-sm font-semibold text-slate-200">HTML</h4>
                </div>
                <textarea
                  value={pageData.html_content}
                  onChange={(e) => {
                    setPageData(prev => ({ ...prev, html_content: e.target.value }));
                    setPreviewKey(p => p + 1);
                  }}
                  className="w-full h-64 p-4 bg-slate-900 text-slate-200 font-mono text-sm border-0 focus:outline-none resize-none"
                  placeholder="Enter HTML here..."
                />
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                <div className="px-4 py-2 border-b border-slate-700 bg-slate-900/50">
                  <h4 className="text-sm font-semibold text-slate-200">CSS</h4>
                </div>
                <textarea
                  value={pageData.css_content}
                  onChange={(e) => {
                    setPageData(prev => ({ ...prev, css_content: e.target.value }));
                    setPreviewKey(p => p + 1);
                  }}
                  className="w-full h-64 p-4 bg-slate-900 text-slate-200 font-mono text-sm border-0 focus:outline-none resize-none"
                  placeholder="Enter CSS here..."
                />
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                <div className="px-4 py-2 border-b border-slate-700 bg-slate-900/50">
                  <h4 className="text-sm font-semibold text-slate-200">JavaScript</h4>
                </div>
                <textarea
                  value={pageData.js_content}
                  onChange={(e) => {
                    setPageData(prev => ({ ...prev, js_content: e.target.value }));
                    setPreviewKey(p => p + 1);
                  }}
                  className="w-full h-64 p-4 bg-slate-900 text-slate-200 font-mono text-sm border-0 focus:outline-none resize-none"
                  placeholder="Enter JavaScript here..."
                />
              </div>
            </div>

            {/* Preview */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden sticky top-6">
              <div className="px-6 py-4 border-b border-slate-700 bg-slate-900/50">
                <h3 className="text-lg font-semibold text-slate-200">👁️ Preview</h3>
              </div>
              <div className="h-[800px] bg-white">
                {pageData.html_content ? (
                  <iframe
                    key={previewKey}
                    srcDoc={getPreviewContent()}
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-forms allow-modals"
                    title="Page Preview"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-500">
                    <div className="text-center">
                      <div className="text-6xl mb-4">📄</div>
                      <p>Start coding to see preview</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Page Settings & Actions */}
        <div className="mt-6 space-y-4">
          {(pageData.html_content || sections.length > 0) && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-slate-200 mb-4">Page Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Page Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={pageData.title}
                    onChange={(e) => setPageData(prev => ({
                      ...prev,
                      title: e.target.value,
                      slug: generateSlug(e.target.value)
                    }))}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Enter page title"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    URL Slug
                  </label>
                  <input
                    type="text"
                    value={pageData.slug}
                    onChange={(e) => setPageData(prev => ({ ...prev, slug: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="page-url-slug"
                  />
                  <p className="text-sm text-slate-400 mt-1">/{pageData.slug}</p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Meta Description
                  </label>
                  <textarea
                    value={pageData.meta_description}
                    onChange={(e) => setPageData(prev => ({ ...prev, meta_description: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    rows={2}
                    placeholder="SEO description"
                  />
                </div>
                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={pageData.is_published}
                      onChange={(e) => setPageData(prev => ({ ...prev, is_published: e.target.checked }))}
                      className="w-4 h-4 text-emerald-600 bg-slate-700 border-slate-600 rounded focus:ring-emerald-500"
                    />
                    <span className="text-sm font-medium text-slate-300">Publish immediately</span>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Access Level</label>
                  <select
                    value={pageData.access_level}
                    onChange={(e) => setPageData(prev => ({ ...prev, access_level: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="public">Public</option>
                    <option value="subscriber">Subscriber Only</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-900/20 border border-red-600/30 text-red-300 px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <div className="flex space-x-3">
            {(pageData.html_content || sections.length > 0) && (
              <button
                onClick={savePage}
                disabled={saving || !pageData.title}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : '💾 Save Page'}
              </button>
            )}
            <button
              onClick={() => router.push('/admin/pages')}
              className="bg-slate-600 hover:bg-slate-500 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
