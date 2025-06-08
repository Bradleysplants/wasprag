// src/server/actions/paypalActions.js
// UPDATED PayPal subscription management using consistent plans

import { HttpError } from 'wasp/server';

// PayPal REST API Base URLs
const PAYPAL_API_BASE = process.env.PAYPAL_MODE === 'live' 
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

// MUST match the plans in subscriptionActions.js
const SUBSCRIPTION_PLANS = {
  FREE: {
    name: 'Green Thumb Starter',
    price: 0,
    monthlyQuestions: 5,
    paypalPlanId: null,
    features: ['Basic plant identification', '5 questions per month']
  },
  BASIC: {
    name: 'Plant Enthusiast',
    price: 5,
    monthlyQuestions: 100,
    paypalPlanId: process.env.PAYPAL_BASIC_PLAN_ID,
    features: ['Enhanced plant identification', '100 questions per month', 'Care recommendations']
  },
  PREMIUM: {
    name: 'Garden Guru',
    price: 10,
    monthlyQuestions: 500,
    paypalPlanId: process.env.PAYPAL_PREMIUM_PLAN_ID,
    features: ['Everything in Basic', '500 questions per month', 'Garden planning tools', 'Priority support']
  },
  PROFESSIONAL: {
    name: 'Botanical Expert',
    price: 25,
    monthlyQuestions: -1, // unlimited
    paypalPlanId: process.env.PAYPAL_PROFESSIONAL_PLAN_ID,
    features: ['Everything in Premium', 'Unlimited questions', 'Commercial license', 'API access']
  }
};

// Environment variables validation
function validateEnvironmentVariables() {
  const requiredVars = {
    PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID,
    PAYPAL_CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET,
    PAYPAL_MODE: process.env.PAYPAL_MODE,
    PAYPAL_BASIC_PLAN_ID: process.env.PAYPAL_BASIC_PLAN_ID,
    PAYPAL_PREMIUM_PLAN_ID: process.env.PAYPAL_PREMIUM_PLAN_ID,
    PAYPAL_PROFESSIONAL_PLAN_ID: process.env.PAYPAL_PROFESSIONAL_PLAN_ID
  };

  const missing = Object.keys(requiredVars).filter(key => !requiredVars[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing PayPal environment variables:', missing);
    throw new Error(`Missing PayPal environment variables: ${missing.join(', ')}`);
  }

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

// Create PayPal subscription using REST API
export const createPayPalSubscription = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'User not authenticated');
  }

  const { plan } = args;
  console.log(`🚀 Creating PayPal subscription for user ${context.user.id}, plan: ${plan}`);
  
  try {
    validateEnvironmentVariables();
    
    const planDetails = SUBSCRIPTION_PLANS[plan.toUpperCase()];
    if (!planDetails) {
      throw new HttpError(400, `Invalid plan: ${plan}`);
    }
    
    if (plan === 'FREE') {
      throw new HttpError(400, 'Cannot create PayPal subscription for FREE plan');
    }

    if (!planDetails.paypalPlanId) {
      throw new HttpError(400, `No PayPal plan ID configured for plan: ${plan}`);
    }

    const accessToken = await getPayPalAccessToken();

    const subscriptionData = {
      plan_id: planDetails.paypalPlanId,
      start_time: new Date(Date.now() + 60000).toISOString(),
      subscriber: {
        name: {
          given_name: context.user.firstName || context.user.username || 'Customer',
          surname: context.user.lastName || 'User'
        },
        email_address: context.user.email || context.user.username
      },
      application_context: {
        brand_name: 'Plant Care Assistant',
        locale: 'en-US',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'SUBSCRIBE_NOW',
        payment_method: {
          payer_selected: 'PAYPAL',
          payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED'
        },
        return_url: `${process.env.CLIENT_URL || 'http://localhost:3000'}/subscription/success`,
        cancel_url: `${process.env.CLIENT_URL || 'http://localhost:3000'}/pricing`
      },
      custom_id: `${context.user.id}_${plan}_${Date.now()}`
    };

    console.log('📡 Sending request to PayPal...');
    const response = await fetch(`${PAYPAL_API_BASE}/v1/billing/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'PayPal-Request-Id': `${context.user.id}-${plan}-${Date.now()}`
      },
      body: JSON.stringify(subscriptionData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('💥 PayPal API Error:', errorText);
      throw new HttpError(400, `PayPal API error: ${errorText}`);
    }

    const subscription = await response.json();
    const approvalUrl = subscription.links?.find(link => link.rel === 'approve')?.href;

    if (!approvalUrl) {
      throw new HttpError(500, 'No approval URL returned from PayPal');
    }

    console.log('✅ PayPal subscription created:', subscription.id);

    return {
      subscriptionId: subscription.id,
      approvalUrl: approvalUrl,
      status: subscription.status,
      plan: plan,
      planDetails: planDetails
    };

  } catch (error) {
    console.error('💥 PayPal subscription creation error:', error);
    if (error instanceof HttpError) {
      throw error;
    }
    throw new HttpError(500, `Failed to create subscription: ${error.message}`);
  }
};

// Activate PayPal subscription after user approval  
export const activatePayPalSubscription = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'User not authenticated');
  }

  const { subscriptionId } = args;
  console.log(`🔄 Activating PayPal subscription ${subscriptionId} for user ${context.user.id}`);

  try {
    validateEnvironmentVariables();
    const accessToken = await getPayPalAccessToken();
    
    // Get subscription details from PayPal
    const response = await fetch(`${PAYPAL_API_BASE}/v1/billing/subscriptions/${subscriptionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new HttpError(400, `Failed to get subscription details: ${response.status}`);
    }

    const paypalSubscription = await response.json();
    
    if (paypalSubscription.status !== 'ACTIVE') {
      throw new HttpError(400, `Subscription is not active. Status: ${paypalSubscription.status}`);
    }

    // Determine plan based on PayPal plan ID
    let plan = null;
    if (paypalSubscription.plan_id === process.env.PAYPAL_BASIC_PLAN_ID) {
      plan = 'BASIC';
    } else if (paypalSubscription.plan_id === process.env.PAYPAL_PREMIUM_PLAN_ID) {
      plan = 'PREMIUM';
    } else if (paypalSubscription.plan_id === process.env.PAYPAL_PROFESSIONAL_PLAN_ID) {
      plan = 'PROFESSIONAL';
    }

    if (!plan) {
      throw new HttpError(400, `Unknown subscription plan ID: ${paypalSubscription.plan_id}`);
    }

    console.log(`✅ Plan matched: ${plan} for PayPal plan ID: ${paypalSubscription.plan_id}`);

    // Update subscription in database - THIS IS THE KEY PART!
    const subscriptionData = {
      paypalSubscriptionId: subscriptionId,
      paypalPlanId: paypalSubscription.plan_id,
      paypalPayerId: paypalSubscription.subscriber?.payer_id,
      plan: plan, // THIS UPGRADES THE USER'S PLAN!
      status: 'ACTIVE',
      currentPeriodStart: new Date(),
      nextBillingTime: paypalSubscription.billing_info?.next_billing_time 
        ? new Date(paypalSubscription.billing_info.next_billing_time)
        : null,
      // Reset question count when upgrading
      monthlyQuestions: 0,
      questionsResetAt: new Date()
    };

    console.log('💾 Updating subscription in database with plan:', plan);
    const updatedSubscription = await context.entities.Subscription.upsert({
      where: { userId: context.user.id },
      update: subscriptionData,
      create: {
        userId: context.user.id,
        ...subscriptionData
      }
    });

    console.log('🎉 Subscription activated successfully:', {
      userId: context.user.id,
      plan: plan,
      subscriptionId: subscriptionId,
      monthlyQuestions: updatedSubscription.monthlyQuestions,
      newQuestionLimit: SUBSCRIPTION_PLANS[plan].monthlyQuestions
    });

    return { 
      success: true, 
      plan: plan,
      planDetails: SUBSCRIPTION_PLANS[plan],
      subscriptionId: subscriptionId,
      subscription: updatedSubscription,
      message: `Successfully upgraded to ${plan} plan!`
    };

  } catch (error) {
    console.error('💥 PayPal subscription activation error:', error);
    if (error instanceof HttpError) {
      throw error;
    }
    throw new HttpError(500, `Failed to activate subscription: ${error.message}`);
  }
};

// Cancel PayPal subscription
export const cancelPayPalSubscription = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'User not authenticated');
  }

  try {
    validateEnvironmentVariables();
    
    const userSubscription = await context.entities.Subscription.findUnique({
      where: { userId: context.user.id }
    });

    if (!userSubscription || !userSubscription.paypalSubscriptionId) {
      throw new HttpError(404, 'No active PayPal subscription found');
    }

    const accessToken = await getPayPalAccessToken();
    
    // Cancel subscription via PayPal API
    const response = await fetch(`${PAYPAL_API_BASE}/v1/billing/subscriptions/${userSubscription.paypalSubscriptionId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        reason: 'User requested cancellation'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new HttpError(400, `Failed to cancel PayPal subscription: ${response.status}`);
    }

    // Update subscription to FREE plan instead of just cancelling
    const updatedSubscription = await context.entities.Subscription.update({
      where: { id: userSubscription.id },
      data: {
        plan: 'FREE', // Downgrade to free
        status: 'CANCELLED',
        cancelledAt: new Date(),
        paypalSubscriptionId: null,
        paypalPlanId: null,
        paypalPayerId: null,
        monthlyQuestions: 0, // Reset question count
        questionsResetAt: new Date()
      }
    });

    console.log('✅ Subscription cancelled and downgraded to FREE');

    return { 
      success: true,
      message: 'Subscription cancelled. You have been moved to the FREE plan.',
      subscription: updatedSubscription
    };

  } catch (error) {
    console.error('💥 PayPal subscription cancellation error:', error);
    if (error instanceof HttpError) {
      throw error;
    }
    throw new HttpError(500, `Failed to cancel subscription: ${error.message}`);
  }
};

// Create sandbox plans (for development setup)
export const createSandboxPlans = async (args, context) => {
  console.log('🏗️ Creating PayPal sandbox plans via API...');

  try {
    validateEnvironmentVariables();
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
        description: 'Enhanced plant identification - 100 questions per month',
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

    console.log('🎉 All plans created successfully!');
    console.log('📋 UPDATE YOUR .env.server FILE WITH THESE NEW PLAN IDs:');
    
    const planKeys = ['PAYPAL_BASIC_PLAN_ID', 'PAYPAL_PREMIUM_PLAN_ID', 'PAYPAL_PROFESSIONAL_PLAN_ID'];
    createdPlans.forEach((plan, index) => {
      console.log(`${planKeys[index]}=${plan.id}`);
    });

    return {
      success: true,
      product: product,
      plans: createdPlans
    };

  } catch (error) {
    console.error('💥 Error creating sandbox plans:', error);
    throw new HttpError(500, `Failed to create plans: ${error.message}`);
  }
};

// Test PayPal configuration and plan availability
export const testPayPalConfiguration = async (args, context) => {
  console.log('🧪 Testing PayPal configuration...');
  
  try {
    // Validate environment variables
    const envVars = validateEnvironmentVariables();
    
    // Get access token
    const accessToken = await getPayPalAccessToken();
    
    // Test each plan
    const planTests = [];
    const plansToTest = ['BASIC', 'PREMIUM', 'PROFESSIONAL'];
    
    for (const planKey of plansToTest) {
      const planDetails = SUBSCRIPTION_PLANS[planKey];
      if (planDetails.paypalPlanId) {
        const verification = await verifyPayPalPlan(planDetails.paypalPlanId, accessToken);
        planTests.push({
          plan: planKey,
          planId: planDetails.paypalPlanId,
          exists: !!verification,
          details: verification || null
        });
      }
    }
    
    console.log('✅ PayPal configuration test completed');
    
    return {
      success: true,
      environment: {
        mode: process.env.PAYPAL_MODE,
        apiBase: PAYPAL_API_BASE,
        clientUrl: process.env.CLIENT_URL
      },
      plans: planTests,
      accessTokenObtained: true
    };
    
  } catch (error) {
    console.error('❌ PayPal configuration test failed:', error);
    throw new HttpError(500, `Configuration test failed: ${error.message}`);
  }
};

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