import cron from "node-cron";
import { BillingStatus } from "../Types/payment";
import { Organization } from "../Models/User";
import { billingService } from "../Services/BillingService";

export function startGraceExpiredJob(): void {
  // Run every hour
  cron.schedule("0 * * * *", async () => {
    console.log("Running grace period expiration job...");

    try {
      const now = new Date();

      // Find organizations with expired grace periods
      const expiredGrace = await Organization.find({
        billingStatus: BillingStatus.PAST_DUE,
        gracePeriodEndsAt: { $lt: now },
      });

      console.log(`Found ${expiredGrace.length} expired grace periods`);

      for (const org of expiredGrace) {
        try {
          await billingService.handleGraceExpiration(org._id as string);
          console.log(`Grace period expired for org: ${org._id}`);
        } catch (error) {
          console.error(
            `Failed to process grace expiration for org ${org._id}:`,
            error,
          );
        }
      }
    } catch (error) {
      console.error("Grace expiration job failed:", error);
    }
  });

  console.log("Grace period expiration job scheduled");
}
