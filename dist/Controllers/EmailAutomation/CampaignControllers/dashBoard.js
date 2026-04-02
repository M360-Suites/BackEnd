"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardData = void 0;
const responseService_1 = require("../../../Services/responseService");
const Campaign_1 = require("../../../Models/Campaign");
const utils_1 = require("../../../helpers/utils");
/**
 * Get dashboard data
 */
exports.getDashboardData = (0, utils_1.asyncHandler)(async (req, res) => {
    try {
        const orgId = req.organizationId?._id;
        // Fetch total emails sent, delivered, and opened in the last 7 days
        const last7Days = new Date();
        last7Days.setDate(last7Days.getDate() - 7);
        const emailStats = await Campaign_1.Campaign.aggregate([
            { $match: { org: orgId, createdAt: { $gte: last7Days } } },
            {
                $group: {
                    _id: null,
                    totalSent: { $sum: '$totalSent' },
                    totalDelivered: { $sum: '$totalDelivered' },
                    totalOpened: { $sum: '$totalOpened' },
                },
            },
        ]);
        const { totalSent = 0, totalDelivered = 0, totalOpened = 0 } = emailStats[0] || {};
        // Fetch campaign reports
        const campaignReports = await Campaign_1.Campaign.find({ org: orgId })
            .select('name totalSent totalDelivered status')
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
        const totalSubscribers = await Campaign_1.Subscriber.countDocuments({
            subscribee: orgId,
        });
        const activeSubscribers = await Campaign_1.Subscriber.countDocuments({
            subscribee: orgId,
            status: 'Active',
        });
        const inactiveSubscribers = totalSubscribers - activeSubscribers;
        const audienceInsights = {
            totalSubscribers,
            activeSubscribers,
            inactiveSubscribers,
        };
        // Fetch bar chart data for email performance
        const emailPerformance = await Campaign_1.Campaign.aggregate([
            { $match: { org: orgId } },
            {
                $group: {
                    _id: { month: { $month: '$createdAt' }, type: '$type' },
                    totalSent: { $sum: '$totalSent' },
                },
            },
            {
                $group: {
                    _id: '$_id.month',
                    data: {
                        $push: {
                            type: '$_id.type',
                            totalSent: '$totalSent',
                        },
                    },
                },
            },
            { $sort: { _id: 1 } },
        ]);
        const barChartData = emailPerformance.map((item) => ({
            month: item._id,
            data: item.data.reduce((acc, curr) => {
                acc[curr.type === 'One_Time' ? 'oneTime' : 'automated'] = curr.totalSent;
                return acc;
            }, { oneTime: 0, automated: 0 }),
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
        return (0, responseService_1.resSender)(res, 200, 'success', 'Dashboard data fetched successfully', null, dashboardData);
    }
    catch (error) {
        console.error('Error fetching dashboard data:', error);
        return (0, responseService_1.resSender)(res, 500, 'error', error.message || 'Error fetching dashboard data');
    }
});
