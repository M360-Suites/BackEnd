import cron from "node-cron";
import { BillingStatus } from "../Types/payment";
import { Organization } from "../Models/User";
import { billingService } from "../Services/BillingService";


export function startTrialExpirationJob(): void {
  // Run every hour
  cron.schedule("0 * * * *", async () => {
    console.log("Running trial expiration job...");

    try {
      const now = new Date();

      // Find organizations with expired trials
      const expiredTrials = await Organization.find({
        billingStatus: BillingStatus.TRIAL,
        trialEndsAt: { $lt: now },
      });

      console.log(`Found ${expiredTrials.length} expired trials`);

      for (const org of expiredTrials) {
        try {
          // Check if they have a saved payment method
          if (org.paystackAuthorizationCode && org.paystackCustomerCode) {
            // Auto-convert to paid subscription with their current features
            await billingService.convertTrialToSubscription(
              org._id as string,
              org.activeFeatures,
            );
            console.log(`Converted trial to subscription for org: ${org._id}`);
          } else {
            // No payment method - just mark trial as expired
            // Access will be blocked by middleware
            console.log(`Trial expired without payment method: ${org._id}`);
          }
        } catch (error) {
          console.error(`Failed to process trial for org ${org._id}:`, error);
        }
      }
    } catch (error) {
      console.error("Trial expiration job failed:", error);
    }
  });

  console.log("Trial expiration job scheduled");
}
