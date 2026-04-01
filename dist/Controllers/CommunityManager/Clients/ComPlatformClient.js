"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComPlatformClient = void 0;
const encryption_1 = require("../../../Services/encryption");
const axios_1 = __importDefault(require("axios"));
class ComPlatformClient {
    constructor(platform) {
        this.platform = platform;
    }
    getAccessToken(connection) {
        return (0, encryption_1.decrypt)(connection.accessToken);
    }
    async makeApiRequest(config, retries = 3) {
        try {
            const response = await (0, axios_1.default)(config);
            return response.data;
        }
        catch (error) {
            if (retries > 0 && error.response?.status === 429) {
                // Rate limited, wait and retry
                const delay = Math.pow(2, 3 - retries) * 1000; // Exponential backoff
                await new Promise((resolve) => setTimeout(resolve, delay));
                return this.makeApiRequest(config, retries - 1);
            }
            throw error;
        }
    }
    handlePlatformError(error, platform) {
        console.error(`Platform ${platform} API error:`, {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message,
        });
        throw new Error(`Platform ${platform} API error: ${error.message}`);
    }
}
exports.ComPlatformClient = ComPlatformClient;
