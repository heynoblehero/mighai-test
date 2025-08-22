import fs from 'fs';
import path from 'path';

const SETTINGS_FILE = path.join(process.cwd(), 'data', 'ai-settings.json');
const USAGE_FILE = path.join(process.cwd(), 'data', 'ai-usage.json');
const RULES_FILE = path.join(process.cwd(), 'data', 'reserved-page-rules.json');
const CONTEXT_FILE = path.join(process.cwd(), 'data', 'ai-context.json');
const COMPONENTS_FILE = path.join(process.cwd(), 'data', 'reserved-components-context.json');

function getSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error('Error reading AI settings:', error);
    return null;
  }
}

function getRules() {
  try {
    if (fs.existsSync(RULES_FILE)) {
      const data = fs.readFileSync(RULES_FILE, 'utf8');
      return JSON.parse(data);
    }
    return {};
  } catch (error) {
    console.error('Error reading reserved page rules:', error);
    return {};
  }
}

function getContext() {
  try {
    if (fs.existsSync(CONTEXT_FILE)) {
      const data = fs.readFileSync(CONTEXT_FILE, 'utf8');
      return JSON.parse(data);
    }
    return {};
  } catch (error) {
    console.error('Error reading AI context:', error);
    return {};
  }
}

function getComponentContext() {
  try {
    if (fs.existsSync(COMPONENTS_FILE)) {
      const data = fs.readFileSync(COMPONENTS_FILE, 'utf8');
      return JSON.parse(data);
    }
    return {};
  } catch (error) {
    console.error('Error reading component context:', error);
    return {};
  }
}

function trackUsage(tokensUsed, estimatedCost) {
  try {
    const usageData = {
      timestamp: new Date().toISOString(),
      tokens_used: tokensUsed,
      estimated_cost: estimatedCost,
      month: new Date().toISOString().slice(0, 7),
      type: 'reserved-page-generation'
    };

    let allUsage = [];
    if (fs.existsSync(USAGE_FILE)) {
      const existingData = fs.readFileSync(USAGE_FILE, 'utf8');
      allUsage = JSON.parse(existingData);
    }

    allUsage.push(usageData);

    if (allUsage.length > 1000) {
      allUsage = allUsage.slice(-1000);
    }

    fs.writeFileSync(USAGE_FILE, JSON.stringify(allUsage, null, 2));
  } catch (error) {
    console.error('Error tracking usage:', error);
  }
}

function generateReservedPagePrompt(pageType, rules, userPrompt, existingCode = '', aiContext = {}, componentContext = {}) {
  const pageRules = rules[pageType];
  if (!pageRules) {
    throw new Error(`No rules found for page type: ${pageType}`);
  }
  
  const pageContext = aiContext.required_functions?.[pageType] || {};
  const routes = aiContext.routes || {};
  const apis = aiContext.api_endpoints || {};
  const utilities = aiContext.common_utilities || {};
  
  // Component context
  const layoutType = pageRules.layout_type || 'standalone';
  const layoutSystem = componentContext.layout_system?.[layoutType];
  const reservedComponents = componentContext.reserved_components || {};
  const minimalRequirements = componentContext.minimal_functionality_requirements || {};
  const adminRestrictions = componentContext.admin_restrictions || {};

  let prompt = `You are an expert web developer creating a ${pageRules.name}.

CRITICAL REQUIREMENTS - YOU MUST FOLLOW THESE EXACTLY:

## Page Description:
${pageRules.description}

## LAYOUT SYSTEM:
${layoutType === 'subscriber_layout' ? `
This page MUST use the subscriber layout system:
- Layout Structure: ${layoutSystem ? JSON.stringify(layoutSystem.structure, null, 2) : 'Standard subscriber layout'}
- Protected Components: Sidebar navigation and support chat widget are AUTOMATICALLY INCLUDED
- Content Area: Only generate content for the main content area (${pageRules.content_area || 'main content'})
- Responsive Behavior: Layout handles responsive design automatically
` : 'Standalone page - full HTML structure required'}

## COMPONENT RESTRICTIONS:
${adminRestrictions.cannot_edit ? Object.entries(adminRestrictions.cannot_edit).map(([key, desc]) => 
  `- CANNOT MODIFY: ${key} - ${desc}`).join('\n') : ''}

${adminRestrictions.can_edit ? `
Customizable Elements:
${Object.entries(adminRestrictions.can_edit).map(([key, desc]) => 
  `- CAN CUSTOMIZE: ${key} - ${desc}`).join('\n')}` : ''}

## MINIMAL FUNCTIONALITY REQUIREMENTS:
${pageRules.required_elements?.filter(el => el.minimal_functionality).map(el => {
  const requirement = minimalRequirements[el.minimal_functionality];
  return requirement ? `- ${el.minimal_functionality}: ${requirement.description} (PROTECTION LEVEL: ${requirement.protection_level})` : '';
}).filter(Boolean).join('\n') || 'No special minimal requirements'}

## REQUIRED HTML ELEMENTS (MUST INCLUDE ALL):`;

  pageRules.required_elements.forEach(element => {
    prompt += `\n- ${element.type.toUpperCase()}`;
    if (element.id) prompt += ` with id="${element.id}"`;
    if (element.name) prompt += ` and name="${element.name}"`;
    if (element.input_type) prompt += ` of type="${element.input_type}"`;
    if (element.href) prompt += ` linking to "${element.href}"`;
    if (element.required) prompt += ` (REQUIRED)`;
    if (element.conditional) prompt += ` (only show when ${element.conditional})`;
    prompt += `\n  Purpose: ${element.description}`;
  });

  prompt += `\n\n## AVAILABLE ROUTES (USE THESE EXACT PATHS):`;
  if (routes.route_mappings) {
    prompt += `\nRoute Mappings for Navigation:`;
    Object.entries(routes.route_mappings).forEach(([key, route]) => {
      prompt += `\n- "${key}" maps to "${route}"`;
    });
  }
  
  if (routes.subscriber) {
    prompt += `\nSubscriber Routes: ${routes.subscriber.join(', ')}`;
  }
  
  if (routes.public) {
    prompt += `\nPublic Routes: ${routes.public.join(', ')}`;
  }

  prompt += `\n\n## VERIFIED API ENDPOINTS (THESE ACTUALLY EXIST):`;
  Object.entries(apis).forEach(([category, endpoints]) => {
    prompt += `\n${category.toUpperCase()}:`;
    Object.entries(endpoints).forEach(([endpoint, config]) => {
      prompt += `\n- ${config.method} ${endpoint}`;
      if (config.required_fields) prompt += ` (fields: ${config.required_fields.join(', ')})`;
      if (config.success_redirect) prompt += ` → ${config.success_redirect}`;
      if (config.auth_required) prompt += ` [AUTH REQUIRED]`;
      if (config.returns) prompt += ` Returns: ${config.returns}`;
    });
  });

  prompt += `\n\n## REQUIRED JAVASCRIPT FUNCTIONALITY (MUST IMPLEMENT ALL):`;

  pageRules.required_functionality.forEach(func => {
    prompt += `\n- ${func.name}(): ${func.description}`;
    
    // Add context-specific details if available
    const funcContext = pageContext[func.name];
    if (funcContext) {
      if (funcContext.route_mapping) {
        prompt += `\n  Route Mapping: ${JSON.stringify(funcContext.route_mapping)}`;
      }
      if (funcContext.populates) {
        prompt += `\n  Updates Elements: ${funcContext.populates.join(', ')}`;
      }
      if (funcContext.parameters) {
        prompt += `\n  Parameters: ${funcContext.parameters.join(', ')}`;
      }
    }
    
    if (func.api_endpoint) prompt += `\n  API: ${func.method} ${func.api_endpoint}`;
    if (func.required_fields) prompt += `\n  Required fields: ${func.required_fields.join(', ')}`;
    if (func.success_redirect) prompt += `\n  On success: redirect to ${func.success_redirect}`;
    if (func.success_action) prompt += `\n  On success: ${func.success_action}`;
    if (func.error_handling) prompt += `\n  Error handling: ${func.error_handling}`;
  });

  prompt += `\n\n## UTILITY FUNCTIONS AVAILABLE:`;
  Object.entries(utilities).forEach(([name, description]) => {
    prompt += `\n- ${name}(): ${description}`;
  });

  prompt += `\n\n## STYLING REQUIREMENTS:`;
  if (pageRules.styling_guidelines) {
    pageRules.styling_guidelines.forEach(guideline => {
      prompt += `\n- ${guideline}`;
    });
  }

  prompt += `\n\n## USER CUSTOMIZATION REQUEST:
${userPrompt}

${existingCode ? `## EXISTING CODE TO MODIFY:\n${existingCode}` : ''}

## CRITICAL RULES TO PREVENT ERRORS:
1. **Navigation Functions**: Use EXACT route mappings provided above. For dashboard navigation, use the route_mapping object.
2. **API Endpoints**: Only use the verified API endpoints listed above with correct methods and fields.
3. **Function Definitions**: Include ALL required functions with exact names and functionality.
4. **Element IDs**: Use the exact IDs specified in required_elements.
5. **Error Prevention**: 
   - Always define functions before using them in onclick handlers
   - Use try-catch blocks around all API calls
   - Validate all form inputs before submission
   - Handle loading states properly
6. **Route Validation**: Never hardcode routes - use the provided route mappings
7. **Context Awareness**: The page will be injected with additional functionality - don't conflict with reserved-page-injector.js

## FUNCTION IMPLEMENTATION REQUIREMENTS:
- Define ALL functions in global scope or ensure they're accessible when called
- Use proper error handling with user-friendly messages
- Implement loading states for all async operations
- Follow the exact API contracts specified above

Generate ONLY the complete HTML code with inline CSS and JavaScript. Do not include markdown code blocks or explanations.

The generated page MUST work as a drop-in replacement while preventing "function not defined" errors.`;

  return prompt;
}

export default async function handler(req, res) {
  console.log('🏠 Reserved Page Generation API called');
  console.log('🏠 Method:', req.method);
  console.log('🏠 Request body:', JSON.stringify(req.body, null, 2));
  
  if (req.method !== 'POST') {
    console.log('❌ Invalid method:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { pageType, prompt, context = '', iteration_type = 'new' } = req.body;
  console.log('🏠 Extracted params:');
  console.log('  - pageType:', pageType);
  console.log('  - prompt:', prompt);
  console.log('  - context length:', context?.length || 0);
  console.log('  - iteration_type:', iteration_type);

  if (!pageType || !prompt) {
    console.log('❌ Missing required parameters');
    console.log('  - pageType provided:', !!pageType);
    console.log('  - prompt provided:', !!prompt);
    return res.status(400).json({ error: 'pageType and prompt are required' });
  }

  // Get AI settings
  console.log('🏠 Loading AI settings from:', SETTINGS_FILE);
  const settings = getSettings();
  console.log('🏠 Settings loaded:', settings ? 'SUCCESS' : 'FAILED');
  
  if (!settings || !settings.claude_api_key) {
    console.log('❌ AI settings not configured properly');
    console.log('  - settings exists:', !!settings);
    console.log('  - has API key:', !!settings?.claude_api_key);
    return res.status(400).json({ error: 'Claude API not configured. Please set up your API key in settings.' });
  }
  
  console.log('🏠 Using model:', settings.claude_model);
  console.log('🏠 Max tokens:', settings.max_tokens);
  console.log('🏠 Temperature:', settings.temperature);

  // Get page rules and context
  console.log('🏠 Loading page rules from:', RULES_FILE);
  const rules = getRules();
  console.log('🏠 Available page types:', Object.keys(rules));
  
  console.log('🏠 Loading AI context from:', CONTEXT_FILE);
  const aiContext = getContext();
  console.log('🏠 AI context loaded:', Object.keys(aiContext));
  
  console.log('🏠 Loading component context from:', COMPONENTS_FILE);
  const componentContext = getComponentContext();
  console.log('🏠 Component context loaded:', Object.keys(componentContext));
  
  console.log(`🏠 Requested pageType: ${pageType}`);
  console.log('🏠 Available rule types:', Object.keys(rules));
  
  if (!rules[pageType]) {
    console.error(`❌ Unknown page type: ${pageType}. Available types: ${Object.keys(rules).join(', ')}`);
    return res.status(400).json({ 
      error: `Unknown page type: ${pageType}`, 
      availableTypes: Object.keys(rules),
      requestedType: pageType 
    });
  }
  
  console.log('🏠 Page type rules found:', rules[pageType]?.name);

  try {
    // Check cost limits
    const currentMonth = new Date().toISOString().slice(0, 7);
    console.log('🏠 Cost check:');
    console.log('  - Current month:', currentMonth);
    console.log('  - Monthly usage: $', settings.current_month_usage);
    console.log('  - Cost limit: $', settings.cost_limit_monthly);
    
    if (settings.current_month_usage >= settings.cost_limit_monthly) {
      console.log('❌ Monthly cost limit exceeded');
      return res.status(400).json({ 
        error: `Monthly cost limit of $${settings.cost_limit_monthly} reached. Current usage: $${settings.current_month_usage}` 
      });
    }

    // Generate the specialized prompt for this page type
    console.log('🏠 Generating specialized prompt for page type:', pageType);
    const finalPrompt = generateReservedPagePrompt(pageType, rules, prompt, context, aiContext, componentContext);
    console.log('🏠 Generated prompt length:', finalPrompt.length);
    console.log('🏠 First 200 chars of prompt:', finalPrompt.substring(0, 200) + '...');

    // Call Claude API
    console.log('🏠 Making API call to Claude...');
    const apiPayload = {
      model: settings.claude_model,
      max_tokens: settings.max_tokens,
      temperature: settings.temperature,
      messages: [
        {
          role: 'user',
          content: finalPrompt
        }
      ]
    };
    console.log('🏠 API payload model:', apiPayload.model);
    console.log('🏠 API payload max_tokens:', apiPayload.max_tokens);
    console.log('🏠 API payload temperature:', apiPayload.temperature);
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': settings.claude_api_key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(apiPayload)
    });

    console.log('🏠 API response status:', response.status);
    const data = await response.json();
    console.log('🏠 API response data keys:', Object.keys(data));
    console.log('🏠 API response content length:', data.content?.[0]?.text?.length || 0);

    if (!response.ok) {
      console.error('❌ Claude API error:', data);
      console.error('❌ Response status:', response.status);
      console.error('❌ Response headers:', Object.fromEntries(response.headers.entries()));
      return res.status(400).json({ 
        error: data.error?.message || 'Failed to generate reserved page',
        details: data
      });
    }

    const generatedCode = data.content?.[0]?.text || '';
    const tokensUsed = data.usage?.output_tokens || 0;
    
    console.log('🏠 Generation results:');
    console.log('  - Generated code length:', generatedCode.length);
    console.log('  - Tokens used:', tokensUsed);
    console.log('  - Input tokens:', data.usage?.input_tokens || 0);
    
    // Estimate cost (approximate pricing for Claude 3.5 Sonnet)
    const estimatedCost = (tokensUsed / 1000) * 0.015;
    console.log('  - Estimated cost: $', estimatedCost);

    // Track usage
    console.log('🏠 Tracking usage...');
    trackUsage(tokensUsed, estimatedCost);

    // Update monthly usage in settings
    const newMonthlyUsage = (settings.current_month_usage || 0) + estimatedCost;
    settings.current_month_usage = newMonthlyUsage;
    console.log('🏠 Updated monthly usage to: $', newMonthlyUsage);
    
    try {
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
      console.log('✅ Settings file updated successfully');
    } catch (error) {
      console.error('❌ Failed to update settings file:', error);
    }

    const responseData = {
      success: true,
      html_code: generatedCode,
      page_type: pageType,
      tokens_used: tokensUsed,
      estimated_cost: estimatedCost,
      monthly_usage: settings.current_month_usage,
      iteration_type,
      rules_applied: rules[pageType].name
    };
    
    console.log('✅ Sending successful response:');
    console.log('  - success:', responseData.success);
    console.log('  - page_type:', responseData.page_type);
    console.log('  - html_code length:', responseData.html_code.length);
    console.log('  - tokens_used:', responseData.tokens_used);
    console.log('  - estimated_cost:', responseData.estimated_cost);
    console.log('  - rules_applied:', responseData.rules_applied);
    
    res.status(200).json(responseData);

  } catch (error) {
    console.error('❌ Reserved page generation failed:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error type:', error.constructor.name);
    res.status(500).json({ 
      error: 'Failed to generate reserved page: ' + error.message 
    });
  }
}