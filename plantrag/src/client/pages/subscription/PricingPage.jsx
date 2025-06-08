// src/client/components/PayPalPricingPlans.jsx - Updated for Backend Integration
import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getUserSubscription,
  createPayPalSubscription,
  cancelPayPalSubscription,
  testPayPalConfiguration
} from 'wasp/client/operations';

const SUBSCRIPTION_PLANS = {
  FREE: {
    name: 'Green Thumb Starter',
    price: 0,
    monthlyQuestions: 5,
    features: ['5 plant questions per month', 'Basic plant care tips', 'Community support'],
    icon: '🌱',
    popular: false,
  },
  BASIC: {
    name: 'Plant Enthusiast',
    price: 5.00,
    monthlyQuestions: 100,
    features: ['100 plant questions per month', 'Advanced plant identification', 'Care reminders', 'Priority support'],
    icon: '🌿',
    popular: true,
  },
  PREMIUM: {
    name: 'Green Thumb Pro',
    price: 10.00,
    monthlyQuestions: 500,
    features: ['500 plant questions per month', 'Expert consultation', 'Disease diagnosis', 'Custom care plans', 'Plant journal'],
    icon: '🌳',
    popular: false,
  },
  PROFESSIONAL: {
    name: 'Botanical Expert',
    price: 25.00,
    monthlyQuestions: -1,
    features: ['Unlimited questions', 'Priority expert support', 'Commercial use license', 'API access', 'White-label features'],
    icon: '🏛️',
    popular: false,
  },
};

// PayPal subscription button component
const PayPalButton = ({ planKey, plan, onSuccess, onError }) => {
  const [isCreating, setIsCreating] = useState(false);

  const handleSubscribe = async () => {
    if (isCreating) return;
    
    setIsCreating(true);
    console.log(`💳 Creating subscription for ${planKey}`);
    
    try {
      const result = await createPayPalSubscription({ plan: planKey });
      console.log('✅ Subscription created:', result);
      
      // Redirect to PayPal for approval
      if (result.approvalUrl) {
        console.log('🔄 Redirecting to PayPal for approval...');
        window.location.href = result.approvalUrl;
      } else {
        throw new Error('No approval URL received from PayPal');
      }
    } catch (error) {
      console.error('❌ Subscription creation failed:', error);
      onError(error);
      setIsCreating(false);
    }
  };

  return (
    <button
      onClick={handleSubscribe}
      disabled={isCreating}
      className={`w-full py-2 px-3 rounded-lg font-medium text-sm transition-colors ${
        isCreating
          ? 'bg-gray-400 text-white cursor-wait'
          : 'bg-blue-600 hover:bg-blue-700 text-white'
      }`}
    >
      {isCreating ? (
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          Creating...
        </div>
      ) : (
        `Subscribe - $${plan.price}/mo`
      )}
    </button>
  );
};

// Cancel subscription button
const CancelButton = ({ onSuccess, onError }) => {
  const [isCancelling, setCancelling] = useState(false);

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your subscription?')) {
      return;
    }

    setCancelling(true);
    try {
      const result = await cancelPayPalSubscription();
      console.log('✅ Subscription cancelled:', result);
      onSuccess(result);
    } catch (error) {
      console.error('❌ Cancellation failed:', error);
      onError(error);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <button
      onClick={handleCancel}
      disabled={isCancelling}
      className="w-full py-1 px-3 rounded text-sm text-red-600 hover:text-red-800 border border-red-300 hover:border-red-400 transition-colors"
    >
      {isCancelling ? 'Cancelling...' : 'Cancel Subscription'}
    </button>
  );
};

// Debug panel for development
const DebugPanel = () => {
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const runTest = async () => {
    setTesting(true);
    try {
      const result = await testPayPalConfiguration();
      setTestResult(result);
      console.log('🧪 PayPal config test:', result);
    } catch (error) {
      console.error('❌ Config test failed:', error);
      setTestResult({ error: error.message, success: false });
    } finally {
      setTesting(false);
    }
  };

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="mt-6 p-4 bg-gray-100 rounded-lg border">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">🔧 Developer Tools</h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-gray-600 hover:text-gray-800"
        >
          {isExpanded ? 'Hide' : 'Show'}
        </button>
      </div>
      
      {isExpanded && (
        <div className="mt-3 space-y-3">
          <button 
            onClick={runTest} 
            disabled={testing}
            className="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600 disabled:bg-gray-400"
          >
            {testing ? 'Testing PayPal Config...' : 'Test PayPal Configuration'}
          </button>
          
          {testResult && (
            <div className="bg-white p-3 rounded border text-xs">
              <div className="mb-2 font-semibold">
                {testResult.success ? '✅ Test Results' : '❌ Test Failed'}
              </div>
              <pre className="text-xs text-gray-700 overflow-auto max-h-40">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Main pricing component
const PayPalPricingPlans = ({ onPlanSelect, showCurrentPlan = true }) => {
  const queryClient = useQueryClient();

  const { data: subscription, isLoading, refetch, error } = useQuery({
    queryKey: ['subscription'],
    queryFn: getUserSubscription,
    retry: 3,
    refetchOnWindowFocus: false
  });

  // Handle success callback
  const handleSuccess = useCallback((result) => {
    console.log('💚 Subscription operation successful:', result);
    queryClient.invalidateQueries({ queryKey: ['subscription'] });
    refetch();
    if (onPlanSelect) onPlanSelect(result.plan || 'FREE');
    
    // Show success message
    if (result.message) {
      alert(result.message);
    }
  }, [queryClient, refetch, onPlanSelect]);

  // Handle error callback
  const handleError = useCallback((error) => {
    console.error('💔 Subscription operation error:', error);
    alert(`Operation failed: ${error.message}`);
  }, []);

  // Check if current plan
  const isCurrentPlan = useCallback((planKey) => {
    return subscription?.plan === planKey;
  }, [subscription?.plan]);

  // Check if user has active paid subscription
  const hasActivePaidSubscription = useCallback(() => {
    return subscription?.plan && 
           subscription.plan !== 'FREE' && 
           subscription.status === 'ACTIVE';
  }, [subscription]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading subscription data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-4">
          Failed to load subscription data: {error.message}
        </div>
        <button 
          onClick={() => refetch()} 
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Retry
        </button>
        <DebugPanel />
      </div>
    );
  }

  return (
    <div className="bg-gray-50 py-6">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Choose Your Plant Care Plan
          </h1>
          <p className="text-base text-gray-600">
            Get expert plant advice tailored to your needs
          </p>
          
          {/* Current subscription status */}
          {subscription && showCurrentPlan && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg inline-block">
              <p className="text-sm text-blue-800">
                Current Plan: <span className="font-semibold">{SUBSCRIPTION_PLANS[subscription.plan]?.name || subscription.plan}</span>
                {subscription.status && subscription.status !== 'ACTIVE' && (
                  <span className="ml-2 text-orange-600">({subscription.status})</span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(SUBSCRIPTION_PLANS).map(([planKey, plan]) => (
            <div
              key={planKey}
              className={`bg-white rounded-lg shadow-sm border p-4 h-fit ${
                plan.popular ? 'ring-2 ring-blue-500 shadow-md relative' : 'border-gray-200'
              } ${isCurrentPlan(planKey) ? 'bg-blue-50 border-blue-300' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                    Most Popular
                  </span>
                </div>
              )}

              {/* Plan header */}
              <div className="text-center mb-4 mt-2">
                <div className="text-3xl mb-2">{plan.icon}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{plan.name}</h3>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  ${plan.price}
                  <span className="text-base text-gray-600 font-normal">/month</span>
                </div>
                <p className="text-sm text-gray-600">
                  {plan.monthlyQuestions === -1 ? 'Unlimited' : plan.monthlyQuestions} questions per month
                </p>
              </div>

              {/* Features list */}
              <ul className="space-y-2 mb-6 min-h-[120px]">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start text-sm">
                    <span className="text-green-500 mr-2 mt-0.5 flex-shrink-0">✓</span>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Action button */}
              <div className="mt-auto space-y-2">
                {planKey === 'FREE' ? (
                  <button
                    onClick={() => onPlanSelect && onPlanSelect(planKey)}
                    disabled={isCurrentPlan(planKey)}
                    className={`w-full py-2 px-3 rounded-lg font-medium text-sm transition-colors ${
                      isCurrentPlan(planKey)
                        ? 'bg-gray-100 text-gray-500 cursor-default'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                    }`}
                  >
                    {isCurrentPlan(planKey) ? '✓ Current Plan' : 'Start Free'}
                  </button>
                ) : isCurrentPlan(planKey) ? (
                  <div className="space-y-2">
                    <div className="text-center py-2 text-sm text-blue-700 bg-blue-100 rounded-lg font-medium">
                      ✓ Your Current Plan
                    </div>
                    <CancelButton onSuccess={handleSuccess} onError={handleError} />
                  </div>
                ) : (
                  <PayPalButton
                    planKey={planKey}
                    plan={plan}
                    onSuccess={handleSuccess}
                    onError={handleError}
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 space-y-2">
          <p className="text-gray-500 text-sm">
            🔒 Secure payments powered by PayPal
          </p>
          <p className="text-gray-400 text-xs">
            Cancel anytime • No long-term commitments • Instant activation
          </p>
        </div>

        {/* Debug panel (development only) */}
        <DebugPanel />
      </div>
    </div>
  );
};

export default PayPalPricingPlans;
export { PayPalPricingPlans as PricingPage };