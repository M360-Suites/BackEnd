"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFeaturesForPlan = exports.inferTierFromPlan = exports.planMappings = void 0;
// config/planMappings.ts
const payment_1 = require("../Types/payment");
exports.planMappings = {
    // Free tier plans
    free_plan: {
        tier: payment_1.SubscriptionTier.FREE,
        features: {
            maxProjects: 1,
            maxTeamMembers: 0,
            storageGB: 0,
            advancedAnalytics: false,
            apiAccess: false,
            customDomains: false,
            prioritySupport: false,
            apiCallsPerMonth: 5,
            exportsPerMonth: 4,
            templatesAccess: 2,
        },
    },
    // Launch tier plans
    launch_monthly: {
        tier: payment_1.SubscriptionTier.LAUNCH,
        features: {
            maxProjects: 5,
            maxTeamMembers: 5,
            storageGB: 10,
            advancedAnalytics: true,
            apiAccess: true,
            customDomains: false,
            prioritySupport: false,
            apiCallsPerMonth: 1000,
            exportsPerMonth: 50,
            templatesAccess: 20,
        },
    },
    launch_yearly: {
        tier: payment_1.SubscriptionTier.LAUNCH,
        features: {
            maxProjects: 5,
            maxTeamMembers: 5,
            storageGB: 10,
            advancedAnalytics: true,
            apiAccess: true,
            customDomains: false,
            prioritySupport: false,
            apiCallsPerMonth: 1000,
            exportsPerMonth: 50,
            templatesAccess: 20,
        },
    },
    // Scale tier plans
    scale_monthly: {
        tier: payment_1.SubscriptionTier.SCALE,
        features: {
            maxProjects: 20,
            maxTeamMembers: 15,
            storageGB: 100,
            advancedAnalytics: true,
            apiAccess: true,
            customDomains: true,
            prioritySupport: false,
            apiCallsPerMonth: 10000,
            exportsPerMonth: 200,
            templatesAccess: 50,
        },
    },
    scale_quarterly: {
        tier: payment_1.SubscriptionTier.SCALE,
        features: {
            maxProjects: 20,
            maxTeamMembers: 15,
            storageGB: 100,
            advancedAnalytics: true,
            apiAccess: true,
            customDomains: true,
            prioritySupport: false,
            apiCallsPerMonth: 10000,
            exportsPerMonth: 200,
            templatesAccess: 50,
        },
    },
    // Enterprise tier plans
    enterprise_yearly: {
        tier: payment_1.SubscriptionTier.ENTERPRISE,
        features: {
            maxProjects: 100,
            maxTeamMembers: 50,
            storageGB: 500,
            advancedAnalytics: true,
            apiAccess: true,
            customDomains: true,
            prioritySupport: true,
            apiCallsPerMonth: 100000,
            exportsPerMonth: 1000,
            templatesAccess: 200,
        },
    },
};
// Helper function to infer tier from plan name/description
const inferTierFromPlan = (plan) => {
    const name = plan.name?.toLowerCase() || "";
    const description = plan.description?.toLowerCase() || "";
    if (name.includes("enterprise") || description.includes("enterprise")) {
        return payment_1.SubscriptionTier.ENTERPRISE;
    }
    if (name.includes("scale") || description.includes("scale")) {
        return payment_1.SubscriptionTier.SCALE;
    }
    if (name.includes("launch") || description.includes("launch")) {
        return payment_1.SubscriptionTier.LAUNCH;
    }
    if (name.includes("free") ||
        description.includes("free") ||
        plan.amount === 0) {
        return payment_1.SubscriptionTier.FREE;
    }
    // Default based on amount ranges (as fallback)
    if (plan.amount >= 50000)
        return payment_1.SubscriptionTier.ENTERPRISE;
    if (plan.amount >= 15000)
        return payment_1.SubscriptionTier.SCALE;
    if (plan.amount > 0)
        return payment_1.SubscriptionTier.LAUNCH;
    return payment_1.SubscriptionTier.FREE;
};
exports.inferTierFromPlan = inferTierFromPlan;
// Helper function to get features for a plan
const getFeaturesForPlan = (plan) => {
    const mapping = exports.planMappings[plan.plan_code];
    if (mapping) {
        return mapping.features;
    }
    // If no direct mapping, infer from tier and provide default features
    const tier = (0, exports.inferTierFromPlan)(plan);
    const defaultFeatures = {
        [payment_1.SubscriptionTier.FREE]: exports.planMappings["free_plan"].features,
        [payment_1.SubscriptionTier.LAUNCH]: exports.planMappings["launch_monthly"].features,
        [payment_1.SubscriptionTier.SCALE]: exports.planMappings["scale_monthly"].features,
        [payment_1.SubscriptionTier.ENTERPRISE]: exports.planMappings["enterprise_yearly"].features,
    };
    return defaultFeatures[tier];
};
exports.getFeaturesForPlan = getFeaturesForPlan;
