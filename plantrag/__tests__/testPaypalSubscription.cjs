// testPayPalConfiguration.js
// Standalone script to test PayPal configuration and plan availability

const dotenv = require('dotenv');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');

// Load environment variables from multiple possible locations
function loadEnvironmentVariables() {
  const possibleEnvFiles = [
    '.env',
    '.env.local', 
    '.env.server',
    '../.env',
    '../.env.local',
    '../.env.server',
    '../../.env',
    '../../.env.local', 
    '../../.env.server'
  ];

  console.log('🔍 Looking for environment files...');
  console.log('Current directory:', process.cwd());
  
  let envLoaded = false;
  
  for (const envFile of possibleEnvFiles) {
    const envPath = path.resolve(envFile);
    if (fs.existsSync(envPath)) {
      console.log(`✅ Found environment file: ${envPath}`);
      const result = dotenv.config({ path: envPath });
      if (!result.error) {
        envLoaded = true;
        break;
      }
    }
  }
  
  if (!envLoaded) {
    console.log('⚠️ No .env file found. Checking for environment variables...');
    console.log('Looked in these locations:');
    possibleEnvFiles.forEach(file => {
      console.log(`  - ${path.resolve(file)}`);
    });
  }
  
  return envLoaded;
}

// PayPal REST API Base URLs
const PAYPAL_API_BASE = process.env.PAYPAL_MODE === 'live' 
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

// Get subscription plans configuration (reads env vars dynamically)
function getSubscriptionPlans() {
  return {
    BASIC: {
      name: 'Plant Enthusiast',
      price: 5,
      paypalPlanId: process.env.PAYPAL_BASIC_PLAN_ID,
    },
    PREMIUM: {
      name: 'Garden Guru',
      price: 10,
      paypalPlanId: process.env.PAYPAL_PREMIUM_PLAN_ID,
    },
    PROFESSIONAL: {
      name: 'Botanical Expert',
      price: 25,
      paypalPlanId: process.env.PAYPAL_PROFESSIONAL_PLAN_ID,
    }
  };
}

// Validate environment variables
function validateEnvironmentVariables() {
  const requiredVars = {
    PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID,
    PAYPAL_CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET,
    PAYPAL_MODE: process.env.PAYPAL_MODE,
    PAYPAL_BASIC_PLAN_ID: process.env.PAYPAL_BASIC_PLAN_ID,
    PAYPAL_PREMIUM_PLAN_ID: process.env.PAYPAL_PREMIUM_PLAN_ID,
    PAYPAL_PROFESSIONAL_PLAN_ID: process.env.PAYPAL_PROFESSIONAL_PLAN_ID,
    CLIENT_URL: process.env.CLIENT_URL
  };

  console.log('🔍 Environment variable check:');
  Object.keys(requiredVars).forEach(key => {
    const value = requiredVars[key];
    const status = value ? '✅' : '❌';
    const display = value ? 
      (key.includes('SECRET') ? '[HIDDEN]' : 
       key.includes('CLIENT_ID') ? `${value.substring(0, 10)}...` : value) : 
      'NOT SET';
    console.log(`  ${status} ${key}: ${display}`);
  });

  const missing = Object.keys(requiredVars).filter(key => !requiredVars[key]);
  
  if (missing.length > 0) {
    console.error('\n❌ Missing PayPal environment variables:', missing);
    console.log('\n💡 Troubleshooting tips:');
    console.log('1. Make sure your .env.server file is in the project root');
    console.log('2. Check that your environment variables are properly formatted');
    console.log('3. Restart your terminal/process after adding env vars');
    console.log('4. Try running this script from your project root directory');
    throw new Error(`Missing PayPal environment variables: ${missing.join(', ')}`);
  }

  console.log('\n✅ All PayPal environment variables are configured');
  console.log('🔧 PayPal Configuration:', {
    mode: process.env.PAYPAL_MODE,
    clientIdLength: process.env.PAYPAL_CLIENT_ID?.length,
    hasClientSecret: !!process.env.PAYPAL_CLIENT_SECRET,
    clientUrl: process.env.CLIENT_URL,
    planIds: {
      basic: process.env.PAYPAL_BASIC_PLAN_ID,
      premium: process.env.PAYPAL_PREMIUM_PLAN_ID,
      professional: process.env.PAYPAL_PROFESSIONAL_PLAN_ID
    }
  });

  return requiredVars;
}

// Get PayPal Access Token
async function getPayPalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  
  console.log('🔑 Getting PayPal access token...');
  
  try {
    const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'en_US',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ PayPal auth failed:', error);
      throw new Error(`PayPal authentication failed: ${response.status} ${error}`);
    }

    const data = await response.json();
    console.log('✅ PayPal access token obtained');
    return data.access_token;
  } catch (error) {
    console.error('💥 Error getting PayPal access token:', error);
    throw error;
  }
}

// Verify PayPal plan exists
async function verifyPayPalPlan(planId, accessToken) {
  console.log(`🔍 Verifying PayPal plan: ${planId}`);
  
  try {
    const response = await fetch(`${PAYPAL_API_BASE}/v1/billing/plans/${planId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ Plan verification failed for ${planId}:`, {
        status: response.status,
        error: error
      });
      return false;
    }

    const planData = await response.json();
    console.log(`✅ Plan verified:`, {
      id: planData.id,
      name: planData.name,
      status: planData.status,
      productId: planData.product_id
    });

    return planData;
  } catch (error) {
    console.error(`💥 Error verifying plan ${planId}:`, error);
    return false;
  }
}

// Test PayPal configuration and plan availability
async function testPayPalConfiguration() {
  console.log('🧪 Testing PayPal configuration...');
  console.log('==================================================');
  
  try {
    // Validate environment variables
    const envVars = validateEnvironmentVariables();
    
    // Get access token
    const accessToken = await getPayPalAccessToken();
    
    // Get subscription plans (after env vars are loaded)
    const SUBSCRIPTION_PLANS = getSubscriptionPlans();
    
    // Test each plan
    const planTests = [];
    const plansToTest = ['BASIC', 'PREMIUM', 'PROFESSIONAL'];
    
    console.log('\n📋 Testing PayPal Plans:');
    console.log('==================================================');
    
    for (const planKey of plansToTest) {
      const planDetails = SUBSCRIPTION_PLANS[planKey];
      if (planDetails.paypalPlanId) {
        console.log(`\n🔍 Testing ${planKey} plan...`);
        const verification = await verifyPayPalPlan(planDetails.paypalPlanId, accessToken);
        
        const testResult = {
          plan: planKey,
          planId: planDetails.paypalPlanId,
          exists: !!verification,
          details: verification || null
        };
        
        if (!verification) {
          testResult.error = `Plan ${planDetails.paypalPlanId} not found or not accessible`;
        }
        
        planTests.push(testResult);
      } else {
        console.log(`⚠️ No plan ID configured for ${planKey}`);
        planTests.push({
          plan: planKey,
          planId: 'NOT_CONFIGURED',
          exists: false,
          details: null,
          error: 'No plan ID configured in environment variables'
        });
      }
    }
    
    console.log('\n✅ PayPal configuration test completed');
    console.log('==================================================');
    
    const result = {
      success: true,
      environment: {
        mode: process.env.PAYPAL_MODE,
        apiBase: PAYPAL_API_BASE,
        clientUrl: process.env.CLIENT_URL
      },
      plans: planTests,
      accessTokenObtained: true
    };
    
    // Print summary
    console.log('\n📊 Test Summary:');
    console.log('==================================================');
    console.log(`Environment: ${result.environment.mode}`);
    console.log(`API Base: ${result.environment.apiBase}`);
    console.log(`Client URL: ${result.environment.clientUrl}`);
    console.log(`Access Token: ${result.accessTokenObtained ? '✅ Obtained' : '❌ Failed'}`);
    
    console.log('\nPlan Status:');
    planTests.forEach(test => {
      const status = test.exists ? '✅ EXISTS' : '❌ MISSING';
      const details = test.details ? `(${test.details.status})` : test.error ? `(${test.error})` : '';
      console.log(`  ${test.plan}: ${status} ${details}`);
      console.log(`    Plan ID: ${test.planId}`);
    });
    
    const allPlansExist = planTests.every(test => test.exists);
    
    console.log('\n' + '='.repeat(50));
    if (allPlansExist) {
      console.log('🎉 ALL TESTS PASSED! Your PayPal configuration is ready.');
    } else {
      console.log('⚠️ SOME TESTS FAILED! Please check the missing plans above.');
      console.log('\n💡 To fix missing plans:');
      console.log('1. Check your environment variables are correct');
      console.log('2. Make sure the plan IDs exist in your PayPal developer account');
      console.log('3. Verify you\'re using the right mode (sandbox vs live)');
      console.log('4. You can create plans using the createSandboxPlans function');
    }
    console.log('='.repeat(50));
    
    return result;
    
  } catch (error) {
    console.error('❌ PayPal configuration test failed:', error);
    
    const errorResult = {
      success: false,
      environment: {
        mode: process.env.PAYPAL_MODE || 'unknown',
        apiBase: PAYPAL_API_BASE,
        clientUrl: process.env.CLIENT_URL || 'unknown'
      },
      plans: [],
      accessTokenObtained: false,
      error: error.message || String(error)
    };
    
    return errorResult;
  }
}

// Additional helper function to check specific plan
async function checkSpecificPlan(planId) {
  console.log(`🔍 Checking specific plan: ${planId}`);
  
  try {
    validateEnvironmentVariables();
    const accessToken = await getPayPalAccessToken();
    const result = await verifyPayPalPlan(planId, accessToken);
    
    if (result) {
      console.log('✅ Plan found:', result);
      return result;
    } else {
      console.log('❌ Plan not found or not accessible');
      return null;
    }
  } catch (error) {
    console.error('💥 Error checking plan:', error);
    return null;
  }
}

// Main function for running as script
async function main() {
  try {
    console.log('🌱 PayPal Configuration Test Tool');
    console.log('==================================\n');
    
    // Load environment variables first
    loadEnvironmentVariables();
    
    const result = await testPayPalConfiguration();
    
    if (result.success) {
      console.log('\n💾 Full test results saved to console.');
      
      // Optional: Check for specific issues
      const failedPlans = result.plans.filter(plan => !plan.exists);
      if (failedPlans.length > 0) {
        console.log('\n🔧 Troubleshooting failed plans:');
        for (const plan of failedPlans) {
          console.log(`\n❌ ${plan.plan} Plan (${plan.planId}):`);
          if (plan.planId === 'NOT_CONFIGURED') {
            console.log('   - Add the plan ID to your .env file');
            console.log(`   - Add: PAYPAL_${plan.plan}_PLAN_ID=your_plan_id_here`);
          } else {
            console.log('   - Plan ID might be incorrect');
            console.log('   - Plan might not exist in your PayPal account');
            console.log('   - Check you\'re using the right environment (sandbox/live)');
          }
        }
      }
      
      process.exit(0);
    } else {
      console.error('\n💥 Test failed with error:', result.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  }
}

// Export functions for use in other files
module.exports = {
  testPayPalConfiguration,
  checkSpecificPlan,
  validateEnvironmentVariables,
  loadEnvironmentVariables,
  getPayPalAccessToken,
  verifyPayPalPlan,
  getSubscriptionPlans
};

// Run if this file is executed directly
if (require.main === module) {
  main();
}