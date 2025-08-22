#!/usr/bin/env node

const http = require('http');

const BASE_URL = 'http://localhost:3000';
const cookies = 'connect.sid=s%3AfkfgWDfg3P0M-YfUZt7AFgAcOuCpg-ld.ycYg6EYjrJxOb6zuwkhBrgdoaOQeiSv0r9lxRuwfnYY';

const RESERVED_PAGE_TYPES = [
  'customer-login',
  'customer-signup', 
  'customer-dashboard',
  'customer-profile',
  'customer-billing',
  'password-reset',
  'customer-layout-sidebar',
  'customer-layout-chat',
  'customer-connections',
  'landing-page',
  'customer-ai-services'
];

async function testReservedPageGeneration(pageType) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      pageType: pageType,
      prompt: `Test generation for ${pageType}`
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/ai/generate-reserved-page',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
        'Content-Length': postData.length
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({
            pageType,
            status: res.statusCode,
            success: response.success === true,
            error: response.error || null,
            hasHtmlCode: !!response.html_code
          });
        } catch (err) {
          resolve({
            pageType,
            status: res.statusCode,
            success: false,
            error: 'Invalid JSON response',
            response: data
          });
        }
      });
    });

    req.on('error', (err) => {
      resolve({
        pageType,
        status: 0,
        success: false,
        error: err.message
      });
    });

    req.setTimeout(30000, () => {
      req.destroy();
      resolve({
        pageType,
        status: 0,
        success: false,
        error: 'Request timeout'
      });
    });

    req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing Reserved Pages AI Generation\n');
  console.log('=' + '='.repeat(50));
  
  let passed = 0;
  let failed = 0;
  const results = [];

  for (const pageType of RESERVED_PAGE_TYPES) {
    console.log(`Testing ${pageType}...`);
    const result = await testReservedPageGeneration(pageType);
    results.push(result);
    
    if (result.success && result.hasHtmlCode) {
      console.log(`✅ ${pageType} - SUCCESS`);
      passed++;
    } else if (result.error && result.error.includes('Unknown page type')) {
      console.log(`❌ ${pageType} - FAILED: Unknown page type`);
      failed++;
    } else {
      console.log(`⚠️  ${pageType} - FAILED: ${result.error || 'Unknown error'}`);
      failed++;
    }
    
    // Rate limiting - wait between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Results Summary');
  console.log('=' + '='.repeat(50));
  console.log(`✅ Passed: ${passed}/${RESERVED_PAGE_TYPES.length}`);
  console.log(`❌ Failed: ${failed}/${RESERVED_PAGE_TYPES.length}`);
  
  if (failed > 0) {
    console.log('\n🔍 Failed Tests:');
    results.filter(r => !r.success).forEach(result => {
      console.log(`  • ${result.pageType}: ${result.error}`);
    });
  }
  
  console.log(`\n${passed === RESERVED_PAGE_TYPES.length ? '🎉 All tests passed!' : '⚠️  Some tests failed.'}`);
}

runTests().catch(console.error);