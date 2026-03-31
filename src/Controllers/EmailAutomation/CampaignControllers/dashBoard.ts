import { Request, Response } from "express";
import { logger } from "../../../logger/logger";
import { resSender } from "../../../Services/responseService";
import { Campaign, Subscriber } from "../../../Models/Campaign";
import { asyncHandler } from "../../../helpers/utils";
import { CustomRequest } from "../../../Types/CustomRequest";

/**
 * Get dashboard data
 */
export const getDashboardData = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    try {
      const orgId = req.organizationId?._id;

      // Fetch total emails sent, delivered, and opened in the last 7 days
      const last7Days = new Date();
      last7Days.setDate(last7Days.getDate() - 7);

      const emailStats = await Campaign.aggregate([
        { $match: { org: orgId, createdAt: { $gte: last7Days } } },
        {
          $group: {
            _id: null,
            totalSent: { $sum: "$totalSent" },
            totalDelivered: { $sum: "$totalDelivered" },
            totalOpened: { $sum: "$totalOpened" },
          },
        },
      ]);

      const {
        totalSent = 0,
        totalDelivered = 0,
        totalOpened = 0,
      } = emailStats[0] || {};

      // Fetch campaign reports
      const campaignReports = await Campaign.find({ org: orgId })
        .select("name totalSent totalDelivered status")
        .lean();

      const campaignReportData = campaignReports.map((campaign) => ({
        name: campaign.name,
        totalSent: campaign.totalSent,
        delivered: campaign.totalDelivered,
        rate: campaign.totalSent
          ? Math.round((campaign.totalDelivered / campaign.totalSent) * 100)
          : 0,
        status: campaign.status,
      }));

      // Fetch audience insights
      const totalSubscribers = await Subscriber.countDocuments({
        subscribee: orgId,
      });
      const activeSubscribers = await Subscriber.countDocuments({
        subscribee: orgId,
        status: "Active",
      });
      const inactiveSubscribers = totalSubscribers - activeSubscribers;

      const audienceInsights = {
        totalSubscribers,
        activeSubscribers,
        inactiveSubscribers,
      };

      // Fetch bar chart data for email performance
      const emailPerformance = await Campaign.aggregate([
        { $match: { org: orgId } },
        {
          $group: {
            _id: { month: { $month: "$createdAt" }, type: "$type" },
            totalSent: { $sum: "$totalSent" },
          },
        },
        {
          $group: {
            _id: "$_id.month",
            data: {
              $push: {
                type: "$_id.type",
                totalSent: "$totalSent",
              },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      const barChartData = emailPerformance.map((item) => ({
        month: item._id,
        data: item.data.reduce(
          (acc: any, curr: any) => {
            acc[curr.type === "One_Time" ? "oneTime" : "automated"] =
              curr.totalSent;
            return acc;
          },
          { oneTime: 0, automated: 0 }
        ),
      }));

      // Combine all data into a single response
      const dashboardData = {
        emailStats: {
          totalSent,
          totalDelivered,
          totalOpened,
        },
        campaignReports: campaignReportData,
        audienceInsights,
        barChartData,
      };

      return resSender(
        res,
        200,
        "success",
        "Dashboard data fetched successfully",
        null,
        dashboardData
      );
    } catch (error: any) {
      logger.error("Error fetching dashboard data:", error);
      return resSender(
        res,
        500,
        "error",
        error.message || "Error fetching dashboard data"
      );
    }
  }
);
