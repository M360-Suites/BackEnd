"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PythonGoogleAdsService = void 0;
// services/PythonGoogleAdsService.ts
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
class PythonGoogleAdsService {
    constructor() {
        // Use 'python3' on Unix/Linux/Mac, 'python' on Windows
        this.pythonPath = process.platform === "win32" ? "python" : "python3";
        console.log(path.join(__dirname));
    }
    /**
     * Execute Python script and return parsed result
     */
    async executePythonScript(scriptPath, args) {
        return new Promise((resolve, reject) => {
            const pythonProcess = (0, child_process_1.spawn)(this.pythonPath, [scriptPath, ...args]);
            let stdout = "";
            let stderr = "";
            pythonProcess.stdout.on("data", (data) => {
                stdout += data.toString();
            });
            pythonProcess.stderr.on("data", (data) => {
                stderr += data.toString();
            });
            pythonProcess.on("close", (code) => {
                if (code === 0) {
                    try {
                        const result = JSON.parse(stdout);
                        resolve(result);
                    }
                    catch (parseError) {
                        reject(new Error(`Failed to parse Python output: ${stdout}. Error: ${parseError}`));
                    }
                }
                else {
                    reject(new Error(`Python script failed with code ${code}. Stderr: ${stderr}. Stdout: ${stdout}`));
                }
            });
            pythonProcess.on("error", (error) => {
                reject(new Error(`Failed to start Python process: ${error.message}`));
            });
        });
    }
    /**
     * Create a campaign using Python service
     */
    async createCampaign(customerId, campaignData) {
        try {
            console.log("Creating woth campaign");
            let scriptPath = path.join(__dirname, "python_scripts", "google_ads_python_service.py");
            const campaignDataJson = JSON.stringify(campaignData);
            return await this.executePythonScript(scriptPath, [
                customerId,
                campaignDataJson,
            ]);
        }
        catch (error) {
            console.error("Error executing Python script:", error);
            throw error;
        }
    }
    async getCampaigns(customerId) {
        try {
            console.log("Fetching campaigns");
            let scriptPath = path.join(__dirname, "python_scripts", "google_ads_python_service.py");
            console.log("Script path: ", scriptPath);
            return await this.executePythonScript(scriptPath, [customerId]);
        }
        catch (error) {
            console.error("Error getting campaigns: ", error);
            throw error;
        }
    }
    /**
     * Check if Python service is available
     */
    async checkServiceAvailability(script = "google_ads_python_service.py") {
        try {
            // Test with empty data to see if Python script runs
            let scriptPath = path.join(__dirname, "python_scripts", script);
            const result = await this.executePythonScript(scriptPath, ["test", "{}"]);
            return true;
        }
        catch (error) {
            console.warn("Python service not available:", error);
            return false;
        }
    }
}
exports.PythonGoogleAdsService = PythonGoogleAdsService;
