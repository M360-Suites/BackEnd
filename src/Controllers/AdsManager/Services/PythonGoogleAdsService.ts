// services/PythonGoogleAdsService.ts
import { spawn } from "child_process";
import * as path from "path";

export interface PythonServiceResult {
  success: boolean;
  campaign_id?: string;
  resource_name?: string;
  budget_resource_name?: string;
  error?: string;
  error_type?: string;
  error_message?: string;
  error_details?: any[];
  request_id?: string;
}

export class PythonGoogleAdsService {
  private pythonPath: string;

  constructor() {
    // Use 'python3' on Unix/Linux/Mac, 'python' on Windows
    this.pythonPath = process.platform === "win32" ? "python" : "python3";
    console.log(path.join(__dirname));
  }

  /**
   * Execute Python script and return parsed result
   */
  private async executePythonScript(
    scriptPath: string,
    args: string[]
  ): Promise<PythonServiceResult> {
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn(this.pythonPath, [scriptPath, ...args]);

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
          } catch (parseError) {
            reject(
              new Error(
                `Failed to parse Python output: ${stdout}. Error: ${parseError}`
              )
            );
          }
        } else {
          reject(
            new Error(
              `Python script failed with code ${code}. Stderr: ${stderr}. Stdout: ${stdout}`
            )
          );
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
  async createCampaign(
    customerId: string,
    campaignData: any
  ): Promise<PythonServiceResult> {
    try {
      console.log("Creating woth campaign");
      let scriptPath = path.join(
        __dirname,
        "python_scripts",
        "google_ads_python_service.py"
      );
      const campaignDataJson = JSON.stringify(campaignData);
      return await this.executePythonScript(scriptPath, [
        customerId,
        campaignDataJson,
      ]);
    } catch (error) {
      console.error("Error executing Python script:", error);
      throw error;
    }
  }

  async getCampaigns(customerId: string): Promise<PythonServiceResult> {
    try {
      console.log("Fetching campaigns");
      let scriptPath = path.join(
        __dirname,
        "python_scripts",
        "google_ads_python_service.py"
      );
      console.log("Script path: ", scriptPath);
      return await this.executePythonScript(scriptPath, [customerId]);
    } catch (error) {
      console.error("Error getting campaigns: ", error);
      throw error;
    }
  }

  /**
   * Check if Python service is available
   */
  async checkServiceAvailability(
    script: string = "google_ads_python_service.py"
  ): Promise<boolean> {
    try {
      // Test with empty data to see if Python script runs
      let scriptPath = path.join(__dirname, "python_scripts", script);
      const result = await this.executePythonScript(scriptPath, ["test", "{}"]);
      return true;
    } catch (error) {
      console.warn("Python service not available:", error);
      return false;
    }
  }
}
