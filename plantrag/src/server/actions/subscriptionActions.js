// src/server/actions/subscriptionActions.js
// FIXED: Added atomic operations and proper race condition handling

import { HttpError } from 'wasp/server';

// UNIFIED subscription plans configuration
const SUBSCRIPTION_PLANS = {
  FREE: {
    name: 'Green Thumb Starter',
    price: 0,
    monthlyQuestions: 5, // 5 questions per month for free users
    features: ['Basic plant identification', '5 questions per month']
  },
  BASIC: {
    name: 'Plant Enthusiast',
    price: 5,
    monthlyQuestions: 100, // 100 questions per month
    features: ['Enhanced plant identification', '100 questions per month', 'Care recommendations']
  },
  PREMIUM: {
    name: 'Garden Guru',
    price: 10,
    monthlyQuestions: 500, // 500 questions per month
    features: ['Everything in Basic', '500 questions per month', 'Garden planning tools', 'Priority support']
  },
  PROFESSIONAL: {
    name: 'Botanical Expert',
    price: 25,
    monthlyQuestions: -1, // -1 = unlimited
    features: ['Everything in Premium', 'Unlimited questions', 'Commercial license', 'API access']
  }
};

/**
 * Gets user subscription with ALL needed properties for client components
 */
export const getUserSubscription = async (args, context) => {
  console.log('🔍 [DEBUG] getUserSubscription called');
  console.log('🔍 [DEBUG] Context keys:', Object.keys(context || {}));
  console.log('🔍 [DEBUG] Context.entities available:', !!context?.entities);
  console.log('🔍 [DEBUG] Context.user available:', !!context?.user);
  
  if (context?.entities) {
    console.log('🔍 [DEBUG] Entities keys:', Object.keys(context.entities));
    console.log('🔍 [DEBUG] Subscription entity available:', !!context.entities.Subscription);
  } else {
    console.error('❌ [DEBUG] context.entities is undefined!');
    console.error('❌ [DEBUG] This means the operation in main.wasp is missing: entities: [User, Subscription]');
  }

  if (!context.user) {
    throw new HttpError(401, 'User must be authenticated');
  }

  const userId = context.user.id;
  console.log(`📋 Getting subscription for user ${userId}`);

  try {
    // SAFETY CHECK: Verify entities are available
    if (!context.entities || !context.entities.Subscription) {
      console.error('❌ [CRITICAL] Subscription entity not available in context');
      console.error('❌ [CRITICAL] Available context:', {
        hasEntities: !!context.entities,
        entityKeys: context.entities ? Object.keys(context.entities) : 'NONE',
        hasUser: !!context.user,
        userId: context.user?.id
      });
      throw new HttpError(500, 'Database configuration error: Subscription entity not available. Check main.wasp operations have entities: [User, Subscription]');
    }

    // Get or create subscription
    let subscription = await context.entities.Subscription.findUnique({
      where: { userId: userId }
    });

    if (!subscription) {
      console.log(`⚠️ No subscription found for user ${userId}, creating free subscription`);
      subscription = await context.entities.Subscription.create({
        data: {
          userId: userId,
          plan: 'FREE',
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          monthlyQuestions: 0,
          questionsResetAt: new Date()
        }
      });
    }

    // Check if we need to reset monthly count
    const now = new Date();
    const resetDate = new Date(subscription.questionsResetAt);
    const daysSinceReset = (now.getTime() - resetDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceReset >= 30) {
      console.log(`🔄 Resetting monthly question count for user ${userId}`);
      subscription = await context.entities.Subscription.update({
        where: { id: subscription.id },
        data: {
          monthlyQuestions: 0,
          questionsResetAt: now
        }
      });
    }

    const planDetails = SUBSCRIPTION_PLANS[subscription.plan];
    if (!planDetails) {
      console.error(`❌ Unknown plan: ${subscription.plan}`);
      throw new HttpError(500, `Unknown subscription plan: ${subscription.plan}`);
    }

    const questionsRemaining = planDetails.monthlyQuestions === -1 
      ? -1 // unlimited
      : Math.max(0, planDetails.monthlyQuestions - subscription.monthlyQuestions);
    
    const canAskQuestion = planDetails.monthlyQuestions === -1 || questionsRemaining > 0;

    console.log(`✅ Subscription data for user ${userId}:`, {
      plan: subscription.plan,
      monthlyQuestions: subscription.monthlyQuestions,
      maxQuestions: planDetails.monthlyQuestions,
      questionsRemaining,
      canAskQuestion
    });

    // Return data structure that matches client expectations
    return {
      plan: subscription.plan,
      status: subscription.status,
      planDetails: planDetails,
      monthlyQuestions: subscription.monthlyQuestions,
      questionsRemaining: questionsRemaining,
      canAskQuestion: canAskQuestion,
      subscription: subscription
    };

  } catch (error) {
    console.error(`❌ Error getting subscription for user ${userId}:`, error.message);
    console.error(`❌ Full error stack:`, error.stack);
    throw new HttpError(500, `Failed to get subscription: ${error.message}`);
  }
};

/**
 * ATOMIC INCREMENT: Increments question count and enforces limits in a single atomic operation
 * This prevents race conditions by using database-level atomic updates
 */
export const incrementQuestionCount = async (args, context) => {
  console.log('🔍 [DEBUG] incrementQuestionCount called');
  console.log('🔍 [DEBUG] Context available:', !!context);
  console.log('🔍 [DEBUG] Context.entities available:', !!context?.entities);
  console.log('🔍 [DEBUG] User ID:', context?.user?.id);
  
  if (!context.user) {
    throw new HttpError(401, 'User must be authenticated');
  }

  const userId = context.user.id;
  console.log(`📈 ATOMIC increment for user ${userId}`);

  try {
    // SAFETY CHECK: Verify entities are available
    if (!context.entities || !context.entities.Subscription) {
      console.error('❌ [CRITICAL] incrementQuestionCount: Subscription entity not available');
      throw new HttpError(500, 'Database configuration error: entities not available in incrementQuestionCount');
    }

    // STEP 1: Get current subscription to check plan limits
    let subscription = await context.entities.Subscription.findUnique({
      where: { userId: userId }
    });

    if (!subscription) {
      console.log(`⚠️ No subscription found for user ${userId}, creating free subscription`);
      subscription = await context.entities.Subscription.create({
        data: {
          userId: userId,
          plan: 'FREE',
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          monthlyQuestions: 0,
          questionsResetAt: new Date()
        }
      });
    }

    // STEP 2: Check if monthly reset is needed
    const now = new Date();
    const resetDate = new Date(subscription.questionsResetAt);
    const daysSinceReset = (now.getTime() - resetDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceReset >= 30) {
      console.log(`🔄 Resetting monthly question count for user ${userId}`);
      subscription = await context.entities.Subscription.update({
        where: { id: subscription.id },
        data: {
          monthlyQuestions: 0,
          questionsResetAt: now
        }
      });
    }

    // STEP 3: Get plan details and check current limits
    const planDetails = SUBSCRIPTION_PLANS[subscription.plan];
    if (!planDetails) {
      console.error(`❌ Unknown plan: ${subscription.plan}`);
      throw new HttpError(500, `Unknown subscription plan: ${subscription.plan}`);
    }

    // STEP 4: ATOMIC INCREMENT WITH LIMIT CHECK
    // This is the critical part - we do the increment AND limit check in one atomic operation
    const isUnlimited = planDetails.monthlyQuestions === -1;
    
    if (!isUnlimited) {
      // For limited plans, use atomic increment with a condition
      const currentCount = subscription.monthlyQuestions;
      const maxQuestions = planDetails.monthlyQuestions;
      
      console.log(`🔒 ATOMIC CHECK: User ${userId} current: ${currentCount}, max: ${maxQuestions}`);
      
      if (currentCount >= maxQuestions) {
        console.log(`❌ User ${userId} already at limit: ${currentCount}/${maxQuestions}`);
        throw new HttpError(400, `Question limit reached. You have used all ${maxQuestions} questions for this month. Upgrade your plan to continue!`);
      }

      // ATOMIC INCREMENT: Only increment if still under limit
      // This uses Prisma's atomic operations to prevent race conditions
      try {
        subscription = await context.entities.Subscription.update({
          where: { 
            id: subscription.id,
            monthlyQuestions: { lt: maxQuestions } // Only update if still under limit
          },
          data: {
            monthlyQuestions: { increment: 1 } // Atomic increment
          }
        });
        
        console.log(`🔒 ATOMIC SUCCESS: User ${userId} incremented to ${subscription.monthlyQuestions}`);
        
      } catch (updateError) {
        // If the update failed, it means the condition wasn't met (already at limit)
        console.log(`❌ ATOMIC FAILED: User ${userId} hit limit during increment attempt`);
        
        // Get the current state to provide accurate error message
        const currentSub = await context.entities.Subscription.findUnique({
          where: { userId: userId }
        });
        
        const currentQuestions = currentSub?.monthlyQuestions || 0;
        
        throw new HttpError(400, `Question limit reached. You have used all ${maxQuestions} questions for this month (current: ${currentQuestions}). Upgrade your plan to continue!`);
      }
    } else {
      // For unlimited plans, just increment normally
      subscription = await context.entities.Subscription.update({
        where: { id: subscription.id },
        data: {
          monthlyQuestions: { increment: 1 }
        }
      });
      
      console.log(`✅ UNLIMITED: User ${userId} incremented to ${subscription.monthlyQuestions}`);
    }

    // STEP 5: Calculate remaining questions
    const questionsRemaining = isUnlimited 
      ? -1 
      : Math.max(0, planDetails.monthlyQuestions - subscription.monthlyQuestions);
    
    const canAskQuestion = isUnlimited || questionsRemaining > 0;

    console.log(`✅ ATOMIC RESULT for user ${userId}:`, {
      plan: subscription.plan,
      monthlyQuestions: subscription.monthlyQuestions,
      maxQuestions: planDetails.monthlyQuestions,
      questionsRemaining,
      canAskQuestion,
      isUnlimited
    });

    return {
      subscription: subscription,
      questionCount: subscription.monthlyQuestions,
      questionsRemaining: questionsRemaining,
      canAskQuestion: canAskQuestion,
      planDetails: planDetails,
      withinLimit: true,
      isUnlimited: isUnlimited
    };

  } catch (error) {
    console.error(`❌ Error in atomic increment for user ${userId}:`, error.message);
    console.error(`❌ Full error stack:`, error.stack);
    if (error instanceof HttpError) {
      throw error;
    }
    throw new HttpError(500, `Failed to update question count: ${error.message}`);
  }
};

/**
 * Creates free subscription for new users
 */
export const createFreeSubscription = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'User must be authenticated');
  }

  const userId = context.user.id;
  console.log(`🆓 Creating free subscription for user ${userId}`);

  try {
    // SAFETY CHECK: Verify entities are available
    if (!context.entities || !context.entities.Subscription) {
      console.error('❌ [CRITICAL] createFreeSubscription: Subscription entity not available');
      throw new HttpError(500, 'Database configuration error: entities not available in createFreeSubscription');
    }

    // Check if user already has a subscription
    const existingSubscription = await context.entities.Subscription.findUnique({
      where: { userId: userId }
    });

    if (existingSubscription) {
      console.log(`⚠️ User ${userId} already has a subscription`);
      return getUserSubscription(args, context);
    }

    // Create the free subscription
    const now = new Date();
    const freeSubscription = await context.entities.Subscription.create({
      data: {
        userId: userId,
        plan: 'FREE',
        status: 'ACTIVE',
        currentPeriodStart: now,
        monthlyQuestions: 0,
        questionsResetAt: now,
        paypalSubscriptionId: null,
        paypalPlanId: null,
        paypalPayerId: null,
        currentPeriodEnd: null,
        nextBillingTime: null,
      }
    });

    console.log(`✅ Free subscription created for user ${userId}`);

    return {
      success: true,
      subscription: freeSubscription,
      planDetails: SUBSCRIPTION_PLANS.FREE,
      message: 'Free subscription created successfully'
    };

  } catch (error) {
    console.error(`❌ Error creating free subscription for user ${userId}:`, error.message);
    
    // Handle race condition
    if (error.code === 'P2002') {
      const existingSubscription = await context.entities.Subscription.findUnique({
        where: { userId: userId }
      });
      
      return {
        success: true,
        subscription: existingSubscription,
        planDetails: SUBSCRIPTION_PLANS[existingSubscription?.plan || 'FREE'],
        message: 'Subscription already exists',
        alreadyExists: true
      };
    }

    throw new HttpError(500, `Failed to create free subscription: ${error.message}`);
  }
};

/**
 * Gets subscription plans for frontend
 */
export const getSubscriptionPlans = async (args, context) => {
  console.log('📋 Getting subscription plans');
  
  return {
    success: true,
    plans: SUBSCRIPTION_PLANS
  };
};

/**
 * Checks if user can ask another question based on their plan limits
 */
export const checkQuestionLimit = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'User must be authenticated');
  }

  const userId = context.user.id;
  console.log(`🔍 Checking question limit for user ${userId}`);

  try {
    // Get current subscription data
    const subscriptionData = await getUserSubscription(args, context);
    
    console.log(`📊 Question limit check for user ${userId}:`, {
      plan: subscriptionData.plan,
      currentCount: subscriptionData.monthlyQuestions,
      questionsRemaining: subscriptionData.questionsRemaining,
      canAsk: subscriptionData.canAskQuestion
    });

    return {
      canAsk: subscriptionData.canAskQuestion,
      currentCount: subscriptionData.monthlyQuestions,
      questionsRemaining: subscriptionData.questionsRemaining,
      unlimited: subscriptionData.planDetails.monthlyQuestions === -1,
      plan: subscriptionData.plan,
      planDetails: subscriptionData.planDetails,
      subscription: subscriptionData.subscription
    };

  } catch (error) {
    console.error(`❌ Error checking question limit for user ${userId}:`, error.message);
    throw new HttpError(500, `Failed to check question limit: ${error.message}`);
  }
};

/**
 * Admin function to reset question count
 */
export const resetQuestionCount = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'User must be authenticated');
  }

  const { userId } = args;
  const targetUserId = userId || context.user.id;
  
  console.log(`🔄 Resetting question count for user ${targetUserId}`);

  try {
    // SAFETY CHECK: Verify entities are available
    if (!context.entities || !context.entities.Subscription) {
      console.error('❌ [CRITICAL] resetQuestionCount: Subscription entity not available');
      throw new HttpError(500, 'Database configuration error: entities not available in resetQuestionCount');
    }

    const subscription = await context.entities.Subscription.findUnique({
      where: { userId: targetUserId }
    });

    if (!subscription) {
      throw new HttpError(404, 'Subscription not found');
    }

    const updatedSubscription = await context.entities.Subscription.update({
      where: { id: subscription.id },
      data: {
        monthlyQuestions: 0,
        questionsResetAt: new Date()
      }
    });

    console.log(`✅ Question count reset for user ${targetUserId}`);

    return {
      success: true,
      subscription: updatedSubscription,
      message: 'Question count reset successfully'
    };

  } catch (error) {
    console.error(`❌ Error resetting question count for user ${targetUserId}:`, error.message);
    throw new HttpError(500, `Failed to reset question count: ${error.message}`);
  }
};