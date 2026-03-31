// config/planMappings.ts
import { SubscriptionTier, SubscriptionFeatures } from "../Types/payment";

export interface PlanMapping {
  tier: SubscriptionTier;
  features: SubscriptionFeatures;
}

export const planMappings: Record<string, PlanMapping> = {
  // Free tier plans
  free_plan: {
    tier: SubscriptionTier.FREE,
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
    tier: SubscriptionTier.LAUNCH,
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
    tier: SubscriptionTier.LAUNCH,
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
    tier: SubscriptionTier.SCALE,
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
    tier: SubscriptionTier.SCALE,
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
    tier: SubscriptionTier.ENTERPRISE,
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
export const inferTierFromPlan = (plan: any): SubscriptionTier => {
  const name = plan.name?.toLowerCase() || "";
  const description = plan.description?.toLowerCase() || "";

  if (name.includes("enterprise") || description.includes("enterprise")) {
    return SubscriptionTier.ENTERPRISE;
  }
  if (name.includes("scale") || description.includes("scale")) {
    return SubscriptionTier.SCALE;
  }
  if (name.includes("launch") || description.includes("launch")) {
    return SubscriptionTier.LAUNCH;
  }
  if (
    name.includes("free") ||
    description.includes("free") ||
    plan.amount === 0
  ) {
    return SubscriptionTier.FREE;
  }

  // Default based on amount ranges (as fallback)
  if (plan.amount >= 50000) return SubscriptionTier.ENTERPRISE;
  if (plan.amount >= 15000) return SubscriptionTier.SCALE;
  if (plan.amount > 0) return SubscriptionTier.LAUNCH;

  return SubscriptionTier.FREE;
};

// Helper function to get features for a plan
export const getFeaturesForPlan = (plan: any): SubscriptionFeatures => {
  const mapping = planMappings[plan.plan_code];

  if (mapping) {
    return mapping.features;
  }

  // If no direct mapping, infer from tier and provide default features
  const tier = inferTierFromPlan(plan);

  const defaultFeatures: Record<SubscriptionTier, SubscriptionFeatures> = {
    [SubscriptionTier.FREE]: planMappings["free_plan"].features,
    [SubscriptionTier.LAUNCH]: planMappings["launch_monthly"].features,
    [SubscriptionTier.SCALE]: planMappings["scale_monthly"].features,
    [SubscriptionTier.ENTERPRISE]: planMappings["enterprise_yearly"].features,
  };

  return defaultFeatures[tier];
};
