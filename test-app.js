// Test script to verify app functionality
const puppeteer = require('puppeteer');

async function testApp() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Listen for console errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  page.on('pageerror', error => {
    errors.push(error.message);
  });
  
  try {
    // Navigate to app
    await page.goto('http://localhost:8342', { waitUntil: 'networkidle2' });
    
    // Wait a bit for React to render
    await page.waitForTimeout(2000);
    
    // Check for errors
    if (errors.length > 0) {
      console.log('❌ ERRORS FOUND:');
      errors.forEach(err => console.log('  -', err));
      process.exit(1);
    } else {
      console.log('✅ No console errors found');
    }
    
    // Try to find key elements
    const hasApp = await page.$('#root') !== null;
    console.log(hasApp ? '✅ App root found' : '❌ App root missing');
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

testApp();