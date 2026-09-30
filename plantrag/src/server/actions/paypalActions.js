// src/server/actions/paypalActions.js
// PayPal subscription management and webhook handling.
// Assumes PAYPAL_MODE env var controls live/sandbox API endpoints.

import { HttpError } from 'wasp/server';
import paypalCheckoutSdk from '@paypal/checkout-server-sdk'; // For PayPal SDK (especially for webhook verification)

// PayPal REST API Base URLs determined by PAYPAL_MODE
const PAYPAL_API_BASE = process.env.PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

// Subscription plan definitions, ensure PAYPAL_*_PLAN_ID env vars are set correctly for the target mode (live/sandbox)
const SUBSCRIPTION_PLANS = {
  FREE: {
    name: 'Green Thumb Starter',
    price: 0,
    monthlyQuestions: 5,
    paypalPlanId: null, // No PayPal plan for FREE
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
    PAYPAL_MODE: process.env.PAYPAL_MODE, // 'live' or 'sandbox'
    PAYPAL_WEBHOOK_ID: process.env.PAYPAL_WEBHOOK_ID, // Crucial for webhooks
    // Plan IDs are needed for creating subscriptions and mapping in webhooks
    // These should correspond to the plans in the PAYPAL_MODE environment (live or sandbox)
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

// Get PayPal Access Token (used by subscription creation/management functions)
async function getPayPalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

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
      const errorText = await response.text();
      console.error(`💥 PayPal authentication failed (${PAYPAL_API_BASE}): ${response.status}`, errorText);
      console.log(PAYPAL_API_BASE, clientId, clientSecret); // Log API base and credentials for debugging
      throw new Error(`PayPal authentication failed: ${response.status} ${errorText}`);
    }
    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('💥 Error getting PayPal access token:', error.message);
    throw error;
  }
}

// --- HELPER FUNCTIONS FOR QUESTION RESET LOGIC ---

// Calculate proper reset date based on PayPal resource data
function calculateQuestionsResetDate(resource) {
  // Use PayPal's next billing time if available
  if (resource.billing_info?.next_billing_time) {
    return new Date(resource.billing_info.next_billing_time);
  }
  
  // Fallback: Calculate 1 month from start time
  if (resource.start_time) {
    const startDate = new Date(resource.start_time);
    const resetDate = new Date(startDate);
    resetDate.setMonth(resetDate.getMonth() + 1);
    return resetDate;
  }
  
  // Last fallback: 30 days from now
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
}

// Check if questions need to be reset and reset them
async function checkAndResetQuestions(subscription, context) {
  const now = new Date();
  const resetDate = new Date(subscription.questionsResetAt);
  
  if (now >= resetDate) {
    // Calculate next reset date (1 month from now)
    const nextReset = new Date(now);
    nextReset.setMonth(nextReset.getMonth() + 1);
    
    console.log(`🔄 Resetting questions for subscription ${subscription.id} - reset date passed`);
    
    return await context.entities.Subscription.update({
      where: { id: subscription.id },
      data: {
        monthlyQuestions: 0,
        questionsResetAt: nextReset
      }
    });
  }
  
  return subscription;
}

// --- PayPal SDK Client Setup (Primarily for Webhook Verification) ---
// This uses the @paypal/checkout-server-sdk and respects PAYPAL_MODE
function getPayPalSdkClientForWebhookVerification() {
  // Validation for these specific vars is good here as SDK client init is critical
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const mode = process.env.PAYPAL_MODE; // 'live' or 'sandbox'

  if (!clientId || !clientSecret || !mode) {
    const missing = [
        !clientId && "PAYPAL_CLIENT_ID",
        !clientSecret && "PAYPAL_CLIENT_SECRET",
        !mode && "PAYPAL_MODE"
    ].filter(Boolean).join(', ');
    console.error(`FATAL ERROR: PayPal SDK client credentials/mode missing for webhook: ${missing}`);
    throw new Error("PayPal SDK client credentials/mode missing. Webhook verification cannot operate.");
  }

  const environment = mode === 'live'
    ? new paypalCheckoutSdk.core.LiveEnvironment(clientId, clientSecret)
    : new paypalCheckoutSdk.core.SandboxEnvironment(clientId, clientSecret);

  return new paypalCheckoutSdk.core.PayPalHttpClient(environment);
}

// --- BEGIN WEBHOOK SPECIFIC LOGIC ---

async function verifyPayPalWebhookSignature(requestHeaders, parsedWebhookEventBody, webhookIdFromEnv) {
  if (!webhookIdFromEnv) {
    console.error("PayPal Webhook ID (PAYPAL_WEBHOOK_ID) is not configured in environment variables.");
    throw new HttpError(500, "Webhook verification configuration error: Missing Webhook ID.");
  }
  const requiredHeaders = ['paypal-auth-algo', 'paypal-cert-url', 'paypal-transmission-id', 'paypal-transmission-sig', 'paypal-transmission-time'];
  for (const header of requiredHeaders) {
    if (!requestHeaders[header.toLowerCase()]) { // Headers can be case-insensitive
        console.warn(`Webhook verification missing required header: ${header}`);
        return false; // Verification should fail if critical headers are missing
    }
  }

  try {
    const client = getPayPalSdkClientForWebhookVerification();
    const verifyRequest = new paypalCheckoutSdk.webhooks.WebhooksVerifySignatureRequest();

    // The @paypal/checkout-server-sdk's WebhooksVerifySignatureRequest
    // expects the *parsed JSON object* of the event in `webhook_event`.
    verifyRequest.requestBody({
      auth_algo: requestHeaders['paypal-auth-algo'.toLowerCase()],
      cert_url: requestHeaders['paypal-cert-url'.toLowerCase()],
      transmission_id: requestHeaders['paypal-transmission-id'.toLowerCase()],
      transmission_sig: requestHeaders['paypal-transmission-sig'.toLowerCase()],
      transmission_time: requestHeaders['paypal-transmission-time'.toLowerCase()],
      webhook_id: webhookIdFromEnv,
      webhook_event: parsedWebhookEventBody // The already parsed event object from Wasp's `args`
    });

    const response = await client.execute(verifyRequest);

    if (response.statusCode === 200 && response.result.verification_status === 'SUCCESS') {
      console.log("✅ PayPal Webhook Signature Verified Successfully!");
      return true;
    } else {
      console.warn("PayPal Webhook Signature Verification Failed. SDK Response:", response.result, "HTTP Status:", response.statusCode);
      return false;
    }
  } catch (error) {
    console.error("💥 Error during PayPal webhook signature verification (SDK call):", error.message);
    // Log more details from SDK error if available
    if (error.data) console.error("PayPal SDK Error details:", JSON.stringify(error.data, null, 2));
    else console.error("Full SDK error object for verification:", error);
    return false;
  }
}

function getInternalPlanKeyByPaypalId(paypalPlanId) {
  for (const planKey in SUBSCRIPTION_PLANS) {
    if (SUBSCRIPTION_PLANS[planKey].paypalPlanId === paypalPlanId) {
      return planKey;
    }
  }
  console.warn(`Unknown PayPal Plan ID encountered in webhook: ${paypalPlanId}. Cannot map to internal plan.`);
  return null;
}

export const handlePayPalWebhook = async (req, res, context) => {
  try {
    // Enable CORS for PayPal
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST");
    res.set("Access-Control-Allow-Headers", "Content-Type, paypal-auth-algo, paypal-cert-url, paypal-transmission-id, paypal-transmission-sig, paypal-transmission-time");

    validateEnvironmentVariables(); // Ensure all necessary env vars are present

    const requestHeaders = req.headers;
    const parsedWebhookEventBody = req.body; // Express already parsed the JSON
    const webhookIdFromEnv = process.env.PAYPAL_WEBHOOK_ID;

    console.log(`🚀 PayPal Webhook Received! Event Type: ${parsedWebhookEventBody.event_type || 'Unknown'}`);

    const isVerified = await verifyPayPalWebhookSignature(requestHeaders, parsedWebhookEventBody, webhookIdFromEnv);

    if (!isVerified) {
      console.error("PayPal Webhook Verification Failed! Request will be ignored.");
      return res.status(401).json({ error: "Webhook signature verification failed" });
    }
    console.log("✅ PayPal Webhook Verified.");

    const eventType = parsedWebhookEventBody.event_type;
    const resource = parsedWebhookEventBody.resource;

    if (!eventType || !resource) {
      console.error("Invalid PayPal webhook payload: missing event_type or resource.");
      return res.status(400).json({ error: "Invalid payload" });
    }

    console.log(`Processing PayPal event: ${eventType}`);
    let userIdToLink = null;

    // --- Handle different PayPal event types ---
    if (eventType === 'BILLING.SUBSCRIPTION.ACTIVATED') {
      const paypalSubscriptionId = resource.id;
      const paypalPlanId = resource.plan_id;
      const internalPlanKey = getInternalPlanKeyByPaypalId(paypalPlanId);

      if (!internalPlanKey) {
        throw new Error(`Webhook Error: Could not map PayPal plan ID ${paypalPlanId} to an internal plan.`);
      }

      console.log(`Subscription ${paypalSubscriptionId} ACTIVATED for PayPal plan ${paypalPlanId} (Internal: ${internalPlanKey}).`);

      if (resource.custom_id) {
        try {
          userIdToLink = parseInt(resource.custom_id.split('_')[0]);
          if (isNaN(userIdToLink)) userIdToLink = null;
        } catch (e) { console.warn(`Could not parse userId from custom_id: ${resource.custom_id}`); }
      }
      
      let user;
      if (userIdToLink) {
        user = await context.entities.User.findUnique({ where: { id: userIdToLink } });
      } else if (resource.subscriber?.email_address) {
        user = await context.entities.User.findUnique({ where: { email: resource.subscriber.email_address } });
      }

      if (user) {
        const subscriptionData = {
          paypalSubscriptionId: paypalSubscriptionId,
          paypalPlanId: paypalPlanId,
          paypalPayerId: resource.subscriber?.payer_id,
          plan: internalPlanKey,
          status: 'ACTIVE',
          currentPeriodStart: resource.start_time ? new Date(resource.start_time) : new Date(),
          nextBillingTime: resource.billing_info?.next_billing_time ? new Date(resource.billing_info.next_billing_time) : null,
          monthlyQuestions: 0,
          questionsResetAt: calculateQuestionsResetDate(resource)
        };
        await context.entities.Subscription.upsert({
          where: { userId: user.id },
          create: { userId: user.id, ...subscriptionData },
          update: subscriptionData,
        });
        console.log(`Updated subscription for user ${user.id} to plan ${internalPlanKey}.`);
      } else {
        console.warn(`Webhook: Could not find user for ACTIVATED PayPal subscription ${paypalSubscriptionId}`);
      }

    } else if (eventType === 'BILLING.SUBSCRIPTION.CANCELLED') {
      const paypalSubscriptionId = resource.id;
      console.log(`Subscription ${paypalSubscriptionId} CANCELLED by PayPal.`);
      const updatedCount = await context.entities.Subscription.updateMany({
        where: { paypalSubscriptionId: paypalSubscriptionId },
        data: { status: 'CANCELLED', plan: 'FREE' }
      });
      if (updatedCount.count > 0) console.log(`Marked ${updatedCount.count} subscription(s) as CANCELLED and downgraded to FREE.`);

    } else if (eventType === 'BILLING.SUBSCRIPTION.EXPIRED' || eventType === 'BILLING.SUBSCRIPTION.SUSPENDED' || eventType === 'BILLING.SUBSCRIPTION.PAYMENT.FAILED') {
      const paypalSubscriptionId = resource.id;
      console.log(`Subscription ${paypalSubscriptionId} ${eventType}.`);
      const newStatus = (eventType === 'BILLING.SUBSCRIPTION.EXPIRED') ? 'EXPIRED' : 'SUSPENDED';
      await context.entities.Subscription.updateMany({
          where: { paypalSubscriptionId: paypalSubscriptionId },
          data: { status: newStatus, plan: 'FREE' }
      });
      console.log(`Updated subscription ${paypalSubscriptionId} to ${newStatus} and plan FREE.`);
      
    } else if (eventType === 'PAYMENT.SALE.COMPLETED') {
      const saleId = resource.id;
      const paypalSubscriptionIdIfApplicable = resource.billing_agreement_id;
      console.log(`Payment ${saleId} COMPLETED. Linked subscription: ${paypalSubscriptionIdIfApplicable || 'N/A'}`);

      if (paypalSubscriptionIdIfApplicable) {
        const subscription = await context.entities.Subscription.findUnique({
          where: { paypalSubscriptionId: paypalSubscriptionIdIfApplicable }
        });
        
        if (subscription) {
          // Record the payment
          await context.entities.Payment.create({
            data: {
              userId: subscription.userId,
              paypalOrderId: saleId,
              paypalPaymentId: saleId,
              paypalPayerId: resource.payer?.payer_id,
              amount: parseFloat(resource.amount.value),
              currency: resource.amount.currency_code,
              status: 'COMPLETED',
              description: `Payment for subscription ${paypalSubscriptionIdIfApplicable}`,
            }
          });
          
          // Reset questions for new billing period
          const nextReset = new Date();
          nextReset.setMonth(nextReset.getMonth() + 1);
          
          await context.entities.Subscription.update({
            where: { id: subscription.id },
            data: {
              monthlyQuestions: 0,
              questionsResetAt: nextReset,
              currentPeriodStart: new Date(),
              ...(resource.next_billing_time && { 
                nextBillingTime: new Date(resource.next_billing_time) 
              })
            }
          });
          
          console.log(`✅ Recorded payment ${saleId} and reset questions for user ${subscription.userId}`);
        }
      }
    } else {
      console.log(`Unhandled PayPal event type: ${eventType}`);
    }

    // Return success response to PayPal
    return res.status(200).json({ 
      success: true, 
      message: `Webhook event '${eventType}' processed successfully` 
    });

  } catch (error) {
    console.error(`💥 Error processing PayPal webhook:`, error.message, error.stack);
    return res.status(500).json({ 
      error: "Internal server error", 
      message: error.message 
    });
  }
};

// --- END WEBHOOK SPECIFIC LOGIC ---

// --- EXISTING SUBSCRIPTION MANAGEMENT FUNCTIONS ---

// Create PayPal subscription using REST API
export const createPayPalSubscription = async (args, context) => {
  if (!context.user) throw new HttpError(401, 'User not authenticated');
  validateEnvironmentVariables();

  const { plan: planKey } = args; // e.g., 'BASIC', 'PREMIUM'
  console.log(`🚀 Creating PayPal subscription for user ${context.user.id}, plan: ${planKey}`);

  const planDetails = SUBSCRIPTION_PLANS[planKey.toUpperCase()];
  if (!planDetails) throw new HttpError(400, `Invalid plan: ${planKey}`);
  if (planKey.toUpperCase() === 'FREE') throw new HttpError(400, 'Cannot create PayPal subscription for FREE plan');
  if (!planDetails.paypalPlanId) throw new HttpError(400, `No PayPal plan ID configured for plan: ${planKey}`);

  try {
    const accessToken = await getPayPalAccessToken();
    const subscriptionData = {
      plan_id: planDetails.paypalPlanId,
      // start_time: new Date(Date.now() + 120000).toISOString(), // Start in 2 mins for testing
      subscriber: {
        name: {
          given_name: context.user.firstName || 'Valued',
          surname: context.user.lastName || 'Customer'
        },
        email_address: context.user.email // Ensure user email exists
      },
      application_context: {
        brand_name: 'BotaniBuddy Plant Care', // Customize your brand name
        locale: 'en-US',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'SUBSCRIBE_NOW',
        payment_method: { payer_selected: 'PAYPAL', payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED' },
        return_url: `${process.env.WASP_WEB_CLIENT_URL || 'http://localhost:3000'}/subscription/success`, // Use Wasp env var
        cancel_url: `${process.env.WASP_WEB_CLIENT_URL || 'http://localhost:3000'}/pricing-page`
      },
      custom_id: `${context.user.id}` // Store user ID for webhook linking
    };

    const response = await fetch(`${PAYPAL_API_BASE}/v1/billing/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'PayPal-Request-Id': `sub-${context.user.id}-${Date.now()}` // Unique request ID
      },
      body: JSON.stringify(subscriptionData)
    });

    const responseData = await response.json();
    if (!response.ok) {
      console.error('💥 PayPal API Error (createSubscription):', JSON.stringify(responseData, null, 2));
      throw new HttpError(response.status, `PayPal API error: ${responseData.message || 'Failed to create subscription'}`);
    }

    const approvalUrl = responseData.links?.find(link => link.rel === 'approve')?.href;
    if (!approvalUrl) throw new HttpError(500, 'No approval URL returned from PayPal');

    console.log(`✅ PayPal subscription ${responseData.id} created, status: ${responseData.status}. Approval URL ready.`);
    return {
      subscriptionId: responseData.id,
      approvalUrl: approvalUrl,
      status: responseData.status,
      plan: planKey,
      planDetails: planDetails
    };
  } catch (error) {
    console.error('💥 PayPal subscription creation error:', error.message, error.stack);
    if (error instanceof HttpError) throw error;
    throw new HttpError(500, `Failed to create subscription: ${error.message}`);
  }
};

// Activate PayPal subscription (typically called after user approves on PayPal and is redirected back)
export const activatePayPalSubscription = async (args, context) => {
  if (!context.user) throw new HttpError(401, 'User not authenticated');
  validateEnvironmentVariables();
  const { subscriptionId: paypalSubscriptionIdFromArgs } = args; // This is PayPal's subscription ID
  console.log(`🔄 Activating PayPal subscription ${paypalSubscriptionIdFromArgs} for user ${context.user.id}`);

  try {
    const accessToken = await getPayPalAccessToken();
    const response = await fetch(`${PAYPAL_API_BASE}/v1/billing/subscriptions/${paypalSubscriptionIdFromArgs}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' }
    });
    const paypalSubscription = await response.json();

    if (!response.ok) {
      console.error('💥 PayPal API Error (getSubscriptionDetails):', JSON.stringify(paypalSubscription, null, 2));
      throw new HttpError(response.status, `Failed to get subscription details: ${paypalSubscription.message || 'Error fetching subscription'}`);
    }

    if (paypalSubscription.status !== 'ACTIVE') {
      // It might be PENDING_APPROVAL or similar. Webhook will handle full activation.
      // This action can confirm it's created and user is linked, but final ACTIVE state handled by webhook.
      console.warn(`PayPal subscription ${paypalSubscriptionIdFromArgs} status is ${paypalSubscription.status}, not yet ACTIVE. Webhook will confirm activation.`);
      // You might still want to create a PENDING subscription record here.
    }

    const internalPlanKey = getInternalPlanKeyByPaypalId(paypalSubscription.plan_id);
    if (!internalPlanKey) throw new HttpError(400, `Unknown PayPal subscription plan ID: ${paypalSubscription.plan_id}`);

    const planDetails = SUBSCRIPTION_PLANS[internalPlanKey];
    const subscriptionData = {
      paypalSubscriptionId: paypalSubscriptionIdFromArgs,
      paypalPlanId: paypalSubscription.plan_id,
      paypalPayerId: paypalSubscription.subscriber?.payer_id,
      plan: internalPlanKey,
      status: paypalSubscription.status === 'ACTIVE' ? 'ACTIVE' : 'PENDING', // Reflect current PayPal status
      currentPeriodStart: paypalSubscription.start_time ? new Date(paypalSubscription.start_time) : new Date(),
      nextBillingTime: paypalSubscription.billing_info?.next_billing_time ? new Date(paypalSubscription.billing_info.next_billing_time) : null,
      monthlyQuestions: 0,
      questionsResetAt: calculateQuestionsResetDate(paypalSubscription) // ✅ Fixed calculation
    };

    const updatedDbSubscription = await context.entities.Subscription.upsert({
      where: { userId: context.user.id },
      update: subscriptionData,
      create: { userId: context.user.id, ...subscriptionData }
    });

    console.log(`🎉 Subscription ${paypalSubscriptionIdFromArgs} details synced for user ${context.user.id}. Plan: ${internalPlanKey}, Status: ${updatedDbSubscription.status}`);
    return {
      success: true,
      plan: internalPlanKey,
      planDetails: planDetails,
      subscriptionId: paypalSubscriptionIdFromArgs,
      subscription: updatedDbSubscription,
      message: `Subscription details for ${internalPlanKey} plan synced. Status: ${updatedDbSubscription.status}.`
    };
  } catch (error) {
    console.error('💥 PayPal subscription activation/sync error:', error.message, error.stack);
    if (error instanceof HttpError) throw error;
    throw new HttpError(500, `Failed to activate/sync subscription: ${error.message}`);
  }
};

// Cancel PayPal subscription
export const cancelPayPalSubscription = async (args, context) => {
  if (!context.user) throw new HttpError(401, 'User not authenticated');
  validateEnvironmentVariables();

  try {
    const userSubscription = await context.entities.Subscription.findUnique({
      where: { userId: context.user.id }
    });
    if (!userSubscription || !userSubscription.paypalSubscriptionId || userSubscription.status === 'CANCELLED' || userSubscription.status === 'EXPIRED') {
      throw new HttpError(404, 'No active PayPal subscription found to cancel, or already cancelled/expired.');
    }

    const accessToken = await getPayPalAccessToken();
    // Note: PayPal API doesn't always immediately reflect cancellation. Webhook is source of truth for final status.
    const response = await fetch(`${PAYPAL_API_BASE}/v1/billing/subscriptions/${userSubscription.paypalSubscriptionId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' },
      body: JSON.stringify({ reason: 'User requested cancellation via app' })
    });

    if (!response.ok && response.status !== 204) { // 204 No Content is success for cancel
      const errorText = await response.text();
      console.error('💥 PayPal API Error (cancelSubscription):', errorText);
      throw new HttpError(response.status, `Failed to cancel PayPal subscription: ${errorText}`);
    }
    console.log(`✅ PayPal subscription ${userSubscription.paypalSubscriptionId} cancellation request sent.`);

    // Update our DB immediately to reflect intent, webhook will confirm final state.
    const updatedDbSubscription = await context.entities.Subscription.update({
      where: { id: userSubscription.id },
      data: {
        status: 'CANCELLED', // Set to CANCELLED immediately
        plan: 'FREE', // Downgrade to FREE immediately
        // cancelledAt: new Date(), // Optional: track cancellation date
      }
    });
    return {
      success: true,
      message: 'Subscription cancelled successfully. You have been downgraded to the free plan.',
      subscription: updatedDbSubscription
    };
  } catch (error) {
    console.error('💥 PayPal subscription cancellation error:', error.message, error.stack);
    if (error instanceof HttpError) throw error;
    throw new HttpError(500, `Failed to cancel subscription: ${error.message}`);
  }
};

// Helper function to use a question and check for reset
export const useQuestionAndCheckReset = async (userId, context) => {
  const subscription = await context.entities.Subscription.findUnique({
    where: { userId }
  });
  
  if (!subscription) return null;
  
  // Check if reset is needed before incrementing
  const updatedSubscription = await checkAndResetQuestions(subscription, context);
  
  // Now increment the question count
  return await context.entities.Subscription.update({
    where: { id: updatedSubscription.id },
    data: {
      monthlyQuestions: updatedSubscription.monthlyQuestions + 1
    }
  });
};

// Test PayPal configuration and plan availability (useful for both live and sandbox)
export const testPayPalConfiguration = async (args, context) => {
  console.log(`🧪 Testing PayPal configuration (Mode: ${process.env.PAYPAL_MODE})...`);
  try {
    validateEnvironmentVariables();
    const accessToken = await getPayPalAccessToken();
    const planTests = [];
    const plansToTest = ['BASIC', 'PREMIUM', 'PROFESSIONAL'];

    for (const planKey of plansToTest) {
      const planDetails = SUBSCRIPTION_PLANS[planKey];
      let planExists = false;
      let paypalPlanData = null;
      if (planDetails.paypalPlanId) {
        paypalPlanData = await verifyPayPalPlanExists(planDetails.paypalPlanId, accessToken);
        planExists = !!paypalPlanData;
      }
      planTests.push({
        planKey: planKey,
        configuredPayPalId: planDetails.paypalPlanId || 'N/A',
        existsOnPayPal: planExists,
        payPalDetails: paypalPlanData
      });
    }
    console.log('✅ PayPal configuration test completed.');
    return {
      success: true,
      environment: { mode: process.env.PAYPAL_MODE, apiBase: PAYPAL_API_BASE, clientUrl: process.env.WASP_WEB_CLIENT_URL },
      plans: planTests,
      accessTokenObtained: !!accessToken
    };
  } catch (error) {
    console.error('❌ PayPal configuration test failed:', error.message);
    return { success: false, message: `Configuration test failed: ${error.message}`, error: error };
  }
};

// Verify PayPal plan exists (helper for testPayPalConfiguration)
async function verifyPayPalPlanExists(planId, accessToken) {
  // console.log(`🔍 Verifying PayPal plan: ${planId}`);
  try {
    const response = await fetch(`${PAYPAL_API_BASE}/v1/billing/plans/${planId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      // console.error(`❌ Plan verification failed for ${planId}: Status ${response.status}`);
      return false; // Plan does not exist or error fetching
    }
    const planData = await response.json();
    // console.log(`✅ Plan ${planId} verified: ${planData.name}`);
    return { id: planData.id, name: planData.name, status: planData.status, productId: planData.product_id };
  } catch (error) {
    // console.error(`💥 Error verifying plan ${planId}:`, error.message);
    return false;
  }
}