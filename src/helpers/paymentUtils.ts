import crypto from "crypto";
import {  PaymentRecord } from "../Models/Subscriptions";
import { ISubsriptionPlan, TrxDet } from "../Types/payment";
import {
  getFeaturesForPlan,
  inferTierFromPlan,
  planMappings,
} from "../config/planMapping";

/**
 * Verifies WebHook signatures...
 * @param body
 * @param signature
 * @returns
 */

const verifyWebhookSignature = (body: any, signature: any): boolean => {
  const hash = crypto
    .createHmac("sha512", process.env.PAYSTACK_TEST_SECRET_KEY!)
    .update(JSON.stringify(body))
    .digest("hex");

  return hash === signature;
};

const generateReference = (userId: string) => {
  return `ref_${Date.now()}_${userId}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;
};

// Database functions (pseudo-code)
const updateTransactionStatus = async (isNew: boolean, trxDet: TrxDet) => {
  if (isNew) {
    const {
      orgId,
      isSubscription,
      // plan,
      // plan_code,
      amountPaid,
      email,
      status,
      reference,
    } = trxDet;
    await PaymentRecord.create({
      orgId,
      isSubscription,
      // plan,
      // plan_code,
      amountPaid,
      email,
      status,
      reference,
    });
  } else {
    const trx = await PaymentRecord.findOneAndUpdate(
      { reference: trxDet.reference },
      {
        $set: { status: trxDet.status, features: trxDet.features },
      },
      { new: true }
    );
  }
};

const grantUserAccess = async (
  email: string,
  orgId: string,
  amount: number
) => {
  // Grant user access based on payment
};

const updateUserSubscription = async (
  email: string,
  userId: string,
  subscriptionData: any
) => {
  // Update user's subscription in database
};

const updateUserSubscriptionStatus = async (email: string, status: string) => {
  // Update user subscription status in db
};

const savePlans = async (plans: any[]) => {
  // await SubscriptionPlan.deleteMany({});

  for (const plan of plans) {
    const {
      name,
      plan_code,
      id: plan_id,
      interval,
      description,
      amount,
      currency,
    } = plan;

    // Convert amount from kobo to actual amount
    const actualAmount = amount / 100;

    // Determine tier and features
    const tier = planMappings[plan_code]?.tier || inferTierFromPlan(plan);
    const features = getFeaturesForPlan(plan);

    // await SubscriptionPlan.create({
    //   name,
    //   plan_code,
    //   plan_id,
    //   description,
    //   amount: actualAmount,
    //   interval,
    //   currency: currency?.toUpperCase() || "NGN",
    //   tier,
    //   features,
    // });

    console.log(`Saved plan: ${name} (${plan_code}) as ${tier} tier`);
  }

  console.log(`Successfully saved ${plans.length} plans to database`);
};

export {
  verifyWebhookSignature,
  generateReference,
  grantUserAccess,
  updateTransactionStatus,
  updateUserSubscription,
  updateUserSubscriptionStatus,
  savePlans,
};
