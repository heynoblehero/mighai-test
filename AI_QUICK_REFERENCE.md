# AI PAGE CREATION SYSTEM - QUICK REFERENCE GUIDE

## Key Files and Line Numbers

### Frontend Components
| File | Lines | Purpose |
|------|-------|---------|
| `/pages/admin/pages/new.js` | 1-1106 | Main page creation UI with 3 modes (Visual/AI/Code) |
| `/pages/admin/pages/index.js` | 1-234 | Page management and listing |
| `/pages/admin/pages/edit/[id].js` | 1-240+ | Edit existing pages |

### Backend API Endpoints
| File | Lines | Purpose |
|------|-------|---------|
| `/pages/api/ai/generate-page.js` | 1-334 | General AI page generation |
| `/pages/api/ai/generate-reserved-page.js` | 1-437 | Reserved page AI generation |
| `/server.js` | 4838-4910 | Page CRUD API routes |

### Configuration & Context Files
| File | Purpose |
|------|---------|
| `/data/ai-settings.json` | API key, model, cost limits, usage tracking |
| `/data/ai-usage.json` | Per-request token and cost tracking |
| `/data/ai-context.json` | Routes, API endpoints, utilities |
| `/data/reserved-page-rules.json` | Page type rules and requirements |
| `/data/reserved-components-context.json` | Component restrictions and specs |

---

## AI Generation Flow - Step by Step

### 1. User Types Prompt
```
User: "Create a landing page for my SaaS product"
```

### 2. Frontend Sends Request
```javascript
// /pages/admin/pages/new.js - generateWithAI() function (lines 559-637)
const response = await fetch('/api/ai/generate-page', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: "Create a landing page for my SaaS product",
    context: isModification ? { html, css, js } : '',
    iteration_type: isModification ? 'modify' : 'new',
    separate_assets: true
  })
});
```

### 3. Backend Validates & Loads Settings
```javascript
// /pages/api/ai/generate-page.js - lines 108-144
if (req.method !== 'POST') return 405;
if (!prompt) return 400 { error: 'Prompt required' };

const settings = getSettings(); // Load /data/ai-settings.json
if (!settings?.claude_api_key) return 400 { error: 'API not configured' };
```

### 4. Check Cost Limits
```javascript
// /pages/api/ai/generate-page.js - lines 147-159
if (settings.current_month_usage >= settings.cost_limit_monthly) {
  return 400 { error: `Monthly limit of $${limit} reached` };
}
```

### 5. Build AI Prompt
```javascript
// /pages/api/ai/generate-page.js - lines 161-218
let finalPrompt;
if (separate_assets) {
  finalPrompt = SEPARATED_GENERATION_PROMPT
    .replace('{userPrompt}', prompt)
    .replace('{context}', contextString);
}
// Result: Full system prompt with user request
```

### 6. Call Claude API
```javascript
// /pages/api/ai/generate-page.js - lines 223-245
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': settings.claude_api_key,
    'anthropic-version': '2023-06-01'
  },
  body: JSON.stringify({
    model: settings.claude_model,        // claude-3-5-sonnet-20241022
    max_tokens: settings.max_tokens,     // 4096
    temperature: settings.temperature,   // 0.7
    messages: [{ role: 'user', content: finalPrompt }]
  })
});
```

### 7. Parse Response
```javascript
// /pages/api/ai/generate-page.js - lines 261-286
const generatedCode = data.content?.[0]?.text;
const tokensUsed = data.usage?.output_tokens;

if (separate_assets) {
  const htmlMatch = generatedCode.match(/===HTML===\s*([\s\S]*?)(?====CSS===|$)/);
  const cssMatch = generatedCode.match(/===CSS===\s*([\s\S]*?)(?====JS===|$)/);
  const jsMatch = generatedCode.match(/===JS===\s*([\s\S]*?)$/);
  
  html_code = htmlMatch[1].trim();
  css_code = cssMatch[1].trim();
  js_code = jsMatch[1].trim();
}
```

### 8. Track Usage
```javascript
// /pages/api/ai/generate-page.js - lines 287-306
const estimatedCost = (tokensUsed / 1000) * 0.015;
trackUsage(tokensUsed, estimatedCost);

settings.current_month_usage = (settings.current_month_usage || 0) + estimatedCost;
fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
```

### 9. Return to Frontend
```javascript
// /pages/api/ai/generate-page.js - lines 308-324
res.status(200).json({
  success: true,
  html_code: html_code,
  css_code: css_code,
  js_code: js_code,
  tokens_used: tokensUsed,
  estimated_cost: estimatedCost,
  monthly_usage: settings.current_month_usage,
  iteration_type: iteration_type,
  separated: separate_assets
});
```

### 10. Frontend Updates Preview
```javascript
// /pages/admin/pages/new.js - lines 591-598
setPageData(prev => ({
  ...prev,
  html_content: data.html_code,
  css_content: data.css_code,
  js_content: data.js_code
}));
setPreviewKey(prev => prev + 1); // Force iframe refresh
```

### 11. User Saves Page
```javascript
// /pages/admin/pages/new.js - lines 647-674
const response = await fetch('/api/pages', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(pageData)
});
// Saved to database
```

### 12. Page Published
```javascript
// /server.js - lines 4845-4867
// Page now available at /:slug route
```

---

## Prompt Templates

### Template 1: New Page Generation (Combined)
**File**: `/pages/api/ai/generate-page.js` (Lines 48-73)

Key points:
- Creates complete HTML with inline CSS and JS
- Emphasis on responsiveness and modern design
- Only HTML output required

### Template 2: New Page Generation (Separated)
**File**: `/pages/api/ai/generate-page.js` (Lines 75-106)

Key points:
- Three distinct sections: ===HTML===, ===CSS===, ===JS===
- Clean separation of concerns
- Parser expects exact delimiters

### Template 3: Reserved Page Generation
**File**: `/pages/api/ai/generate-reserved-page.js` (Lines 90-247)

Key points:
- 157 lines of context injection
- Rules enforcement
- Route mapping validation
- API endpoint verification
- Component restrictions

---

## Component Templates Library

**Location**: `/pages/admin/pages/new.js` (Lines 40-488)

Available components and their sizes:

| Component | HTML Size | CSS Size | Notes |
|-----------|-----------|----------|-------|
| Hero | 250 chars | 350 chars | Gradient bg, CTA |
| Features | 400 chars | 450 chars | 3-column grid |
| Pricing | 500 chars | 650 chars | Multi-tier cards |
| Contact | 400 chars | 450 chars | Form with validation |
| Testimonials | 350 chars | 400 chars | Star ratings |
| Footer | 300 chars | 380 chars | Multi-column layout |

**Total Template Library**: ~2000 lines of pre-built components

---

## Database Schema

### Pages Table
```sql
CREATE TABLE pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  meta_description TEXT,
  html_content TEXT NOT NULL,
  css_content TEXT,
  js_content TEXT,
  is_published BOOLEAN DEFAULT true,
  access_level TEXT DEFAULT 'public',  -- 'public'|'subscriber'
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);
```

### API Endpoints for Pages
```
GET    /api/pages                    - List all pages
POST   /api/pages                    - Create page
GET    /api/pages/:id                - Get single page
PUT    /api/pages/:id                - Update page
DELETE /api/pages/:id                - Delete page
```

All endpoints require authentication via `requireAuth` middleware.

---

## AI Settings Structure

**Location**: `/data/ai-settings.json`

```json
{
  "claude_api_key": "sk-ant-...",
  "claude_model": "claude-3-5-sonnet-20241022",
  "max_tokens": 4096,
  "temperature": 0.7,
  "cost_limit_monthly": 50.00,
  "current_month_usage": 12.45
}
```

**Configuration Options**:
- `claude_api_key`: From Anthropic dashboard
- `claude_model`: Model to use (can upgrade)
- `max_tokens`: Token limit per request (adjust for cost/quality)
- `temperature`: 0-1 (0=deterministic, 1=creative)
- `cost_limit_monthly`: Budget cap in USD
- `current_month_usage`: Auto-updated, resets monthly

---

## Error Responses

### Request Validation Errors
```json
{ "error": "Prompt is required" }                              // 400
{ "error": "pageType and prompt are required" }              // 400
{ "error": "Method not allowed" }                            // 405
```

### Configuration Errors
```json
{ "error": "Claude API not configured..." }                  // 400
{ "error": "Unknown page type: invalid-type" }              // 400
```

### Cost Limit Errors
```json
{ 
  "error": "Monthly cost limit of $50 reached. Current usage: $45.23"
}                                                             // 400
```

### API Errors
```json
{
  "error": "data.error.message || 'Failed to generate page'",
  "details": { /* full Claude API response */ }
}                                                             // 400
```

---

## Usage Tracking

**File**: `/data/ai-usage.json`

Each request creates entry:
```json
{
  "timestamp": "2024-11-08T14:23:45.123Z",
  "tokens_used": 1523,
  "estimated_cost": 0.0229,
  "month": "2024-11",
  "type": "page-generation|reserved-page-generation"
}
```

**Monthly Cost Calculation**:
```
Cost = (output_tokens / 1000) * 0.015

Example: 1500 tokens
       = (1500 / 1000) * 0.015
       = 1.5 * 0.015
       = $0.0225
```

---

## Key Functions Reference

### Frontend
```javascript
generateWithAI(prompt, isModification)          // Calls AI API
handleAISubmit(e)                               // Form submission
savePage()                                      // Save to database
generateSlug(title)                             // URL generation
getPreviewContent()                             // Build iframe HTML
addSection(templateKey)                         // Add template
updatePageData(currentSections)                 // Merge sections
```

### Backend
```javascript
getSettings()                                   // Load /data/ai-settings.json
getRules()                                      // Load page rules
getContext()                                    // Load routes/APIs
trackUsage(tokensUsed, estimatedCost)          // Log usage
generateReservedPagePrompt(...)                // Build context prompt
```

---

## Customization Points

### To Enhance Page Generation:
1. **Modify Prompts**: Edit `/pages/api/ai/generate-page.js` (lines 48-106)
2. **Add Components**: Edit `/pages/admin/pages/new.js` (lines 40-488)
3. **Change Model**: Edit `/data/ai-settings.json` (claude_model)
4. **Adjust Limits**: Edit `/data/ai-settings.json` (max_tokens, cost_limit)
5. **Add Rules**: Edit `/data/reserved-page-rules.json`

### To Add New Features:
1. **New API Endpoint**: Create `/pages/api/ai/new-feature.js`
2. **New UI Mode**: Add to `mode` state in `/pages/admin/pages/new.js`
3. **New Page Type**: Add to `/data/reserved-page-rules.json`
4. **New Context**: Add to `/data/ai-context.json` or `/data/reserved-components-context.json`

