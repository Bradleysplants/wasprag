// createPayPalPlans.js - Script to create PayPal subscription plans
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const fetch = require('node-fetch');

// Load environment variables from multiple possible locations
function loadEnvironmentVariables() {
  const possibleEnvFiles = [
    '.env',
    '.env.local', 
    '.env.server',
    '../.env',
    '../.env.local',
    '../.env.server'
  ];

  console.log('🔍 Looking for environment files...');
  
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
  }
  
  return envLoaded;
}

const PAYPAL_API_BASE = process.env.PAYPAL_MODE === 'live' 
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

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

// Create sandbox plans
async function createSandboxPlans() {
  console.log('🏗️ Creating PayPal sandbox plans via API...');

  try {
    const accessToken = await getPayPalAccessToken();
    console.log('✅ Access token obtained');

    // Step 1: Create Product
    console.log('📦 Creating product...');
    const productResponse = await fetch(`${PAYPAL_API_BASE}/v1/catalogs/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        name: 'Plant Care Subscriptions',
        description: 'Plant identification and care subscription service',
        type: 'SERVICE',
        category: 'SOFTWARE'
      })
    });

    if (!productResponse.ok) {
      const error = await productResponse.text();
      throw new Error(`Product creation failed: ${productResponse.status} ${error}`);
    }

    const product = await productResponse.json();
    console.log('✅ Product created:', product.id);

    // Step 2: Create Plans
    const plansToCreate = [
      {
        name: 'Plant Enthusiast (Basic)',
        description: 'Basic plant identification service - 100 questions per month',
        price: '5.00'
      },
      {
        name: 'Garden Guru (Premium)', 
        description: 'Premium plant identification with advanced features - 500 questions per month',
        price: '10.00'
      },
      {
        name: 'Botanical Expert (Professional)',
        description: 'Professional plant identification with commercial license - Unlimited questions',
        price: '25.00'
      }
    ];

    const createdPlans = [];

    for (const planConfig of plansToCreate) {
      console.log(`🏗️ Creating ${planConfig.name}...`);

      const planResponse = await fetch(`${PAYPAL_API_BASE}/v1/billing/plans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          product_id: product.id,
          name: planConfig.name,
          description: planConfig.description,
          status: 'ACTIVE',
          billing_cycles: [
            {
              frequency: {
                interval_unit: 'MONTH',
                interval_count: 1
              },
              tenure_type: 'REGULAR',
              sequence: 1,
              total_cycles: 0, // 0 = infinite
              pricing_scheme: {
                fixed_price: {
                  value: planConfig.price,
                  currency_code: 'USD'
                }
              }
            }
          ],
          payment_preferences: {
            auto_bill_outstanding: true,
            setup_fee: {
              value: '0.00',
              currency_code: 'USD'
            },
            setup_fee_failure_action: 'CONTINUE',
            payment_failure_threshold: 3
          },
          taxes: {
            percentage: '0.00',
            inclusive: false
          }
        })
      });

      if (!planResponse.ok) {
        const error = await planResponse.text();
        console.error(`❌ Failed to create ${planConfig.name}:`, error);
        continue;
      }

      const plan = await planResponse.json();
      createdPlans.push({
        name: plan.name,
        id: plan.id,
        status: plan.status,
        price: planConfig.price
      });

      console.log(`✅ ${planConfig.name} created: ${plan.id}`);
    }

    console.log('\n🎉 All plans created successfully!');
    console.log('\n📋 UPDATE YOUR .env.server FILE WITH THESE NEW PLAN IDs:');
    console.log('='.repeat(70));
    
    const planKeys = ['PAYPAL_BASIC_PLAN_ID', 'PAYPAL_PREMIUM_PLAN_ID', 'PAYPAL_PROFESSIONAL_PLAN_ID'];
    createdPlans.forEach((plan, index) => {
      console.log(`${planKeys[index]}=${plan.id}`);
    });
    
    console.log('='.repeat(70));
    console.log('\n💡 Next steps:');
    console.log('1. Copy the plan IDs above to your .env.server file');
    console.log('2. Restart your Wasp development server');
    console.log('3. Test your subscription flow - the 404 error should be fixed!');

    return {
      success: true,
      product: product,
      plans: createdPlans
    };

  } catch (error) {
    console.error('💥 Error creating sandbox plans:', error);
    throw error;
  }
}

// Main function
async function main() {
  try {
    console.log('🌱 PayPal Plan Creation Tool');
    console.log('============================\n');
    
    // Load environment variables first
    loadEnvironmentVariables();
    
    // Validate required environment variables
    const requiredVars = ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'PAYPAL_MODE'];
    const missing = requiredVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
      console.error('❌ Missing required environment variables:', missing);
      console.log('💡 Make sure your .env.server file contains:');
      console.log('   PAYPAL_CLIENT_ID=your_client_id');
      console.log('   PAYPAL_CLIENT_SECRET=your_client_secret');
      console.log('   PAYPAL_MODE=sandbox');
      process.exit(1);
    }
    
    console.log(`🔧 Using PayPal ${process.env.PAYPAL_MODE} mode`);
    
    const result = await createSandboxPlans();
    console.log('\n✅ Plan creation completed successfully!');
    
  } catch (error) {
    console.error('\n💥 Plan creation failed:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { createSandboxPlans };