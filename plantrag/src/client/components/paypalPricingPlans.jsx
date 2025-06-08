// src/client/components/PayPalPricingPlans.jsx

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getUserSubscription, 
  createPayPalSubscription, 
  activatePayPalSubscription,
  cancelPayPalSubscription 
} from 'wasp/client/operations';

const SUBSCRIPTION_PLANS = {
  FREE: {
    name: 'Free',
    price: 0,
    monthlyQuestions: 10,
    features: ['10 plant questions per month', 'Basic plant care tips', 'Community support'],
    icon: '🌱',
    popular: false,
  },
  BASIC: {
    name: 'Plant Enthusiast',
    price: 9.99,
    monthlyQuestions: 100,
    features: ['100 plant questions per month', 'Advanced plant identification', 'Care reminders', 'Priority support'],
    icon: '🌿',
    popular: true,
  },
  PREMIUM: {
    name: 'Green Thumb Pro',
    price: 19.99,
    monthlyQuestions: 500,
    features: ['500 plant questions per month', 'Expert consultation', 'Disease diagnosis', 'Custom care plans', 'Plant journal'],
    icon: '🌳',
    popular: false,
  },
  PROFESSIONAL: {
    name: 'Botanical Expert',
    price: 49.99,
    monthlyQuestions: -1,
    features: ['Unlimited questions', 'Priority expert support', 'Commercial use license', 'API access', 'White-label features'],
    icon: '🏛️',
    popular: false,
  },
};

// PayPal Subscription Button Component
const PayPalSubscriptionButton = ({ plan, planKey, onSuccess, onError, disabled }) => {
  const [paypalLoaded, setPaypalLoaded] = useState(false);
  const [paypalError, setPaypalError] = useState(null);

  useEffect(() => {
    // Load PayPal SDK
    const loadPayPalScript = () => {
      if (window.paypal) {
        setPaypalLoaded(true);
        return;
      }

      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=${process.env.REACT_APP_PAYPAL_CLIENT_ID}&vault=true&intent=subscription`;
      script.async = true;
      script.onload = () => setPaypalLoaded(true);
      script.onerror = () => setPaypalError('Failed to load PayPal SDK');
      document.body.appendChild(script);
    };

    loadPayPalScript();
  }, []);

  useEffect(() => {
    if (paypalLoaded && window.paypal && !disabled) {
      const container = `#paypal-button-${planKey}`;
      
      // Clear existing buttons
      const existingContainer = document.querySelector(container);
      if (existingContainer) {
        existingContainer.innerHTML = '';
      }

      window.paypal.Buttons({
        style: {
          shape: 'rect',
          color: 'blue',
          layout: 'vertical',
          label: 'subscribe',
          height: 40,
        },
        createSubscription: async (data, actions) => {
          try {
            const response = await createPayPalSubscription({ plan: planKey });
            return response.subscriptionId;
          } catch (error) {
            console.error('Subscription creation error:', error);
            onError(error);
            throw error;
          }
        },
        onApprove: async (data, actions) => {
          try {
            const result = await activatePayPalSubscription({ 
              subscriptionId: data.subscriptionID 
            });
            onSuccess(result);
          } catch (error) {
            console.error('Subscription approval error:', error);
            onError(error);
          }
        },
        onError: (err) => {
          console.error('PayPal button error:', err);
          onError(err);
        },
        onCancel: (data) => {
          console.log('PayPal subscription cancelled:', data);
        }
      }).render(container);
    }
  }, [paypalLoaded, planKey, disabled, onSuccess, onError]);

  if (paypalError) {
    return (
      <div className="text-accent-berry text-sm text-center">
        {paypalError}
      </div>
    );
  }

  if (!paypalLoaded) {
    return (
      <div className="flex justify-center py-2">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-plant-primary"></div>
      </div>
    );
  }

  return <div id={`paypal-button-${planKey}`} className="paypal-button-container"></div>;
};

export const PayPalPricingPlans = ({ onPlanSelect, showCurrentPlan = true }) => {
  const [cancellingSubscription, setCancellingSubscription] = useState(false);
  const queryClient = useQueryClient();

  // Get current subscription
  const { data: subscription, isLoading, refetch } = useQuery({
    queryKey: ['subscription'],
    queryFn: getUserSubscription,
  });

  // Cancel subscription mutation
  const cancelSubscriptionMutation = useMutation({
    mutationFn: cancelPayPalSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries(['subscription']);
      alert('Subscription cancelled successfully');
    },
    onError: (error) => {
      console.error('Cancellation error:', error);
      alert('Failed to cancel subscription. Please try again.');
    },
    onSettled: () => {
      setCancellingSubscription(false);
    },
  });

  const handleSubscriptionSuccess = (result) => {
    console.log('Subscription successful:', result);
    queryClient.invalidateQueries(['subscription']);
    refetch();
    if (onPlanSelect) onPlanSelect(result.plan);
    alert('Subscription activated successfully! 🌱');
  };

  const handleSubscriptionError = (error) => {
    console.error('Subscription error:', error);
    alert('Subscription failed. Please try again.');
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will lose access to premium features.')) {
      return;
    }

    setCancellingSubscription(true);
    try {
      await cancelSubscriptionMutation.mutateAsync({
        reason: 'User requested cancellation'
      });
    } catch (error) {
      console.error('Cancel subscription error:', error);
    }
  };

  const isCurrentPlan = (planKey) => {
    return subscription?.plan === planKey;
  };

  const isUpgrade = (planKey) => {
    if (!subscription) return false;
    const planOrder = ['FREE', 'BASIC', 'PREMIUM', 'PROFESSIONAL'];
    const currentIndex = planOrder.indexOf(subscription.plan);
    const targetIndex = planOrder.indexOf(planKey);
    return targetIndex > currentIndex;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-plant-primary"></div>
      </div>
    );
  }

  return (
    <div className="bg-background-primary py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-text-primary mb-4">
            Choose Your Plant Journey 🌱
          </h2>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            From curious beginner to botanical expert, find the perfect plan to grow your plant knowledge.
          </p>
        </div>

        {/* Current Plan Banner */}
        {showCurrentPlan && subscription && (
          <div className="mb-8 p-4 bg-plant-primary/10 border border-plant-primary/20 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-text-primary">
                  <span className="font-semibold">Current Plan:</span> {SUBSCRIPTION_PLANS[subscription.plan]?.name}
                  {subscription.questionsRemaining !== -1 && (
                    <span className="ml-2 text-text-secondary">
                      ({subscription.questionsRemaining} questions remaining this month)
                    </span>
                  )}
                </p>
                {subscription.nextBillingTime && (
                  <p className="text-text-tertiary text-sm">
                    Next billing: {new Date(subscription.nextBillingTime).toLocaleDateString()}
                  </p>
                )}
              </div>
              
              {subscription.plan !== 'FREE' && (
                <button
                  onClick={handleCancelSubscription}
                  disabled={cancellingSubscription}
                  className="bg-accent-berry hover:bg-accent-berry/80 text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                  {cancellingSubscription ? 'Cancelling...' : 'Cancel Subscription'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {Object.entries(SUBSCRIPTION_PLANS).map(([planKey, plan]) => (
            <div
              key={planKey}
              className={`relative bg-background-secondary border rounded-xl p-6 shadow-subtle hover:shadow-lifted transition-all duration-300 ${
                plan.popular 
                  ? 'border-plant-primary ring-2 ring-plant-primary/20 scale-105' 
                  : 'border-border-primary hover:border-plant-primary/50'
              } ${
                isCurrentPlan(planKey) 
                  ? 'bg-plant-primary/5 border-plant-primary' 
                  : ''
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-plant-primary text-text-inverse px-3 py-1 rounded-full text-xs font-semibold">
                    Most Popular
                  </span>
                </div>
              )}

              {/* Current Plan Badge */}
              {isCurrentPlan(planKey) && (
                <div className="absolute -top-3 right-4">
                  <span className="bg-accent-sun text-neutral-dark px-3 py-1 rounded-full text-xs font-semibold">
                    Current Plan
                  </span>
                </div>
              )}

              {/* Plan Header */}
              <div className="text-center mb-6">
                <div className="text-4xl mb-3">{plan.icon}</div>
                <h3 className="text-xl font-bold text-text-primary mb-2">{plan.name}</h3>
                <div className="text-3xl font-bold text-text-primary">
                  ${plan.price}
                  <span className="text-sm font-normal text-text-secondary">/month</span>
                </div>
                <p className="text-text-secondary text-sm mt-2">
                  {plan.monthlyQuestions === -1 ? 'Unlimited' : plan.monthlyQuestions} questions/month
                </p>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start text-sm">
                    <span className="text-plant-primary mr-2">✓</span>
                    <span className="text-text-secondary">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Action Button */}
              <div className="mt-auto">
                {planKey === 'FREE' ? (
                  <button
                    onClick={() => onPlanSelect && onPlanSelect(planKey)}
                    disabled={isCurrentPlan(planKey)}
                    className="w-full py-3 px-4 bg-neutral-light text-text-primary rounded-lg font-medium transition-colors border border-border-primary disabled:opacity-50"
                  >
                    {isCurrentPlan(planKey) ? 'Current Plan' : 'Select Free Plan'}
                  </button>
                ) : isCurrentPlan(planKey) ? (
                  <div className="text-center py-3 text-text-secondary">
                    ✓ Your Current Plan
                  </div>
                ) : (
                  <PayPalSubscriptionButton
                    plan={plan}
                    planKey={planKey}
                    onSuccess={handleSubscriptionSuccess}
                    onError={handleSubscriptionError}
                    disabled={!isUpgrade(planKey) && subscription?.plan !== 'FREE'}
                  />
                )}
                
                {!isUpgrade(planKey) && subscription?.plan !== 'FREE' && planKey !== 'FREE' && !isCurrentPlan(planKey) && (
                  <p className="text-xs text-text-tertiary text-center mt-2">
                    Contact support to downgrade
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* PayPal Trust Badge */}
        <div className="text-center mt-12">
          <p className="text-text-tertiary text-sm mb-4">
            Secure payments powered by PayPal
          </p>
          <div className="flex justify-center items-center space-x-4 text-text-tertiary">
            <span>🔒 SSL Secured</span>
            <span>•</span>
            <span>💳 PayPal Protected</span>
            <span>•</span>
            <span>🌍 Global Access</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayPalPricingPlans;