"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleAdsService = void 0;
// google-ads-service.ts
const axios_1 = __importDefault(require("axios"));
const PythonGoogleAdsService_1 = require("./PythonGoogleAdsService");
class GoogleAdsService {
    constructor(accessToken) {
        this.usePythonService = false;
        this.accessToken = accessToken;
        this.developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
        this.pythonService = new PythonGoogleAdsService_1.PythonGoogleAdsService();
        // Check if we should use Python service (you can make this configurable)
        this.initializeService();
    }
    async initializeService() {
        try {
            this.usePythonService =
                await this.pythonService.checkServiceAvailability();
            console.log(`Using ${this.usePythonService ? "Python" : "Direct"} Google Ads service`);
        }
        catch (error) {
            console.warn("Failed to initialize Python service, using direct API", error);
            this.usePythonService = false;
        }
    }
    /**
     * Get list of accessible Google Ads accounts
     */
    async getAccessibleAccounts() {
        try {
            const response = await axios_1.default.get("https://googleads.googleapis.com/v21/customers:listAccessibleCustomers", {
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                    "Developer-Token": this.developerToken,
                    "Content-Type": "application/json",
                },
            });
            console.log("Accessible acc res: ", response.data);
            return response.data.resourceNames.map((resourceName) => {
                const customerId = resourceName.split("/")[1];
                return {
                    resourceName,
                    customerId,
                    // You might want to fetch more details about each customer
                };
            });
        }
        catch (error) {
            console.error("Error fetching accessible accounts:", error.response?.data || error.message);
            throw new Error(`Failed to get accessible accounts: ${error.message}`);
        }
    }
    /**
     * Get details for a specific customer
     */
    async getCustomerDetails(customerId) {
        try {
            // The Google Ads API query language is used here
            const query = `
        SELECT 
          customer.id, 
          customer.descriptive_name, 
          customer.currency_code,
          customer.time_zone,
          customer.manager,
          customer.test_account
        FROM customer
        WHERE customer.id = '${customerId}'
      `;
            const response = await axios_1.default.post(`https://googleads.googleapis.com/v21/customers/${customerId}/googleAds:search`, {
                query,
                // pageSize: 1,
            }, {
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                    "Developer-Token": this.developerToken,
                    "Content-Type": "application/json",
                },
            });
            console.log("Customer det res: ", response.data);
            if (response.data.results && response.data.results.length > 0) {
                return response.data.results[0].customer;
            }
            return null;
        }
        catch (error) {
            console.error("Error fetching customer details:", error.response?.data || error.message);
            console.log("Whole error details: ", JSON.stringify(error.response?.data?.error?.details));
            throw new Error(`Failed to get customer details: ${error.message}`);
        }
    }
    /**
     * Get all accessible accounts with details
     */
    async getAccessibleAccountsWithDetails() {
        const accessibleAccounts = await this.getAccessibleAccounts();
        const accountsWithDetails = [];
        for (const account of accessibleAccounts) {
            try {
                const details = await this.getCustomerDetails(account.customerId);
                accountsWithDetails.push({
                    ...account,
                    ...details,
                });
            }
            catch (error) {
                console.error(`Failed to get details for account ${account.customerId}:`, error);
                accountsWithDetails.push(account);
            }
        }
        return accountsWithDetails;
    }
    /**
     * Create a campaign budget
     */
    async createCampaignBudget(customerId, budgetName, dailyBudgetMicros) {
        try {
            return "customers/9864538341/campaignBudgets/14910158581";
            const response = await axios_1.default.post(`https://googleads.googleapis.com/v21/customers/${customerId}/campaignBudgets:mutate`, {
                operations: [
                    {
                        create: {
                            name: budgetName,
                            amountMicros: dailyBudgetMicros,
                        },
                    },
                ],
            }, {
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                    "Developer-Token": this.developerToken,
                    "Content-Type": "application/json",
                    "Login-Customer-Id": customerId,
                },
                timeout: 30000,
            });
            console.log("Budget creation response:", response.data);
            // Extract the budget resource name from the response
            if (response.data.results && response.data.results.length > 0) {
                return response.data.results[0].resourceName;
            }
            throw new Error("No budget resource name returned");
        }
        catch (error) {
            console.error("Error creating campaign budget:", error.response?.data || error.message);
            throw new Error(`Failed to create campaign budget: ${error.message}`);
        }
    }
    /**
     * Create a campaign in Google Ads with proper error handling
     */
    async createCampaignDirect(customerId, campaignData) {
        try {
            // Step 1: Create the campaign budget first
            const budgetName = `${campaignData.name} Budget`;
            const dailyBudgetMicros = (campaignData.daily_budget || 10000) * 1000000;
            const budgetResourceName = await this.createCampaignBudget(customerId, budgetName, dailyBudgetMicros);
            console.log("Created budget with resource name:", budgetResourceName);
            // Step 2: Create the campaign using the budget
            const campaignOperation = {
                create: {
                    status: campaignData.status !== "ACTIVE" ? "ENABLED" : "PAUSED",
                    advertisingChannelType: campaignData.advertising_channel_type || "SEARCH",
                    geoTargetTypeSetting: {
                    // positiveGeoTargetType: "PRESENCE_OR_INTEREST",
                    // negativeGeoTargetType: "PRESENCE_OR_INTEREST",
                    },
                    name: campaignData.name,
                    campaignBudget: budgetResourceName,
                    "manualCpc": {},
                    "networkSettings": {
                        "targetGoogleSearch": true,
                        "targetSearchNetwork": true,
                        "targetContentNetwork": true,
                        "targetPartnerSearchNetwork": false
                    },
                    containsEuPoliticalAdvertising: "DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING",
                },
            };
            // Add start date if provided
            if (campaignData.start_time) {
                const startDate = new Date(campaignData.start_time)
                    .toISOString()
                    .split("T")[0]
                    .replace(/-/g, "");
                campaignOperation.create.startDate = startDate;
            }
            const response = await axios_1.default.post(`https://googleads.googleapis.com/v21/customers/${customerId}/campaigns:mutate`, {
                operations: [campaignOperation],
                partialFailure: false,
                validateOnly: false,
            }, {
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                    "Developer-Token": this.developerToken,
                    "Content-Type": "application/json",
                    "Login-Customer-Id": customerId,
                },
                timeout: 30000,
            });
            console.log("Campaign creation response:", response.data);
            return response.data;
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error) && error.response) {
                const googleError = error.response.data.error;
                console.error("Full Google Ads error:", JSON.stringify(googleError, null, 2));
                if (googleError.details && googleError.details.length > 0) {
                    const errorMessages = [];
                    googleError.details.forEach((detail) => {
                        if (detail["@type"] ===
                            "type.googleapis.com/google.ads.googleads.v21.errors.GoogleAdsFailure") {
                            detail.errors?.forEach((err) => {
                                const fieldPath = err.location?.fieldPathElements
                                    ?.map((elem) => elem.fieldName)
                                    .join(".");
                                errorMessages.push(`${fieldPath || "unknown field"}: ${err.message}`);
                            });
                        }
                    });
                    if (errorMessages.length > 0) {
                        throw new Error(`Google Ads API validation errors: ${errorMessages.join("; ")}`);
                    }
                }
                throw new Error(`Google Ads API error: ${googleError.message} (code: ${googleError.code})`);
            }
            throw new Error(`Failed to create campaign: ${error.message}`);
        }
    }
    /**
     * Create campaign using Python service
     */
    async createCampaignWithPython(customerId, campaignData) {
        try {
            const result = await this.pythonService.createCampaign(customerId, campaignData);
            console.log('Result: ', result);
            if (result.success) {
                return {
                    results: [
                        {
                            resourceName: result.resource_name,
                            campaign: {
                                id: result.campaign_id,
                                resourceName: result.resource_name,
                            },
                        },
                    ],
                };
            }
            else {
                throw new Error(`Python Google Ads Error: ${result.error_type} - ${result.error_message}` +
                    (result.error_details
                        ? ` Details: ${JSON.stringify(result.error_details)}`
                        : ""));
            }
        }
        catch (error) {
            console.error("Python service campaign creation failed:", error);
            // throw error;
            // Fall back to direct API if Python service fails
            return this.createCampaignDirect(customerId, campaignData);
        }
    }
    /**
     * Create a campaign - now uses Python service if available
     */
    async createCampaign(customerId, campaignData) {
        if (this.usePythonService) {
            return this.createCampaignWithPython(customerId, campaignData);
        }
        else {
            return this.createCampaignDirect(customerId, campaignData);
        }
    }
    async getGoogleCampaigns(customerId) {
        try {
            const result = await this.pythonService.getCampaigns(customerId);
            return result;
        }
        catch (error) {
            console.error("Python service campaign fetching failed:", error);
            throw error;
        }
    }
}
exports.GoogleAdsService = GoogleAdsService;
