import { HttpClient } from "../http/HttpClient";
import { ClarityData, ClarityDimensions } from "../../../../Types/seo";
import axios from "axios";

export class MicrosoftClarityService {
  private httpClient: HttpClient;
  private projectId: string;
  private apiKey: string;

  constructor(projectId: string, apiKey: string) {
    this.projectId = projectId;
    this.apiKey = apiKey;

    // Initialize HttpClient with Microsoft Clarity headers
    const clarityHeaders = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };

    this.httpClient = new HttpClient(
      "https://clarity.microsoft.com",
      10000,
      clarityHeaders
    );
  }

  /**
   * Send custom event to Microsoft Clarity
   */
  async trackEvent(
    eventName: string,
    eventData: Record<string, any> = {}
  ): Promise<void> {
    try {
      const clarityData: ClarityData = {
        projectId: this.projectId,
        pageData: {
          event: eventName,
          ...eventData,
          timestamp: new Date().toISOString(),
        },
      };

      // Note: Microsoft Clarity primarily works through frontend JavaScript
      // For backend tracking, you might need to use their API if available
      // or implement custom endpoint calls
      console.log("Clarity Event:", clarityData);

      // In a real implementation, you would make API calls to Clarity's backend
      // await this.httpClient.post('/track', clarityData);
    } catch (error) {
      console.error("Microsoft Clarity tracking error:", error);
    }
  }

  /**
   * Get Clarity project data (if API available)
   */
  async getProjectData(): Promise<any> {
    try {
      // This is a placeholder - check Microsoft Clarity API documentation
      // for actual endpoints and methods
      const data = await this.httpClient.get(`/projects/${this.projectId}`);
      return data;
    } catch (error) {
      console.error("Error fetching Clarity project data:", error);
      throw error;
    }
  }

  async getSiteData(
    days: number,
    dimensions: ClarityDimensions[]
  ): Promise<any> {
    try {
      const dimensionParam = dimensions
        .map((dimension, i) => `dimension${i + 1}=${dimension}`)
        .join("&");

      console.log("Dimension Param: ", dimensionParam);

      // return

      // const clarityData = await this.httpClient.get(
      //   `/export-data/api/v1/project-live-insights?numOfDays=${days}&${dimensionParam}`
      // );

      // console.log("Clarity data: ", clarityData);

      const clarityData2 = await axios.get(
        "https://www.clarity.ms/export-data/api/v1/project-live-insights",{
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`
          },
          params: {
            dimensionParam,
            numOfDays: days
          }
        }
      );

      console.log('Data 2: ', clarityData2.data);

      return clarityData2.data;
    } catch (error) {
      console.error("Error getting site data: ", error);
      throw error;
    }
  }
}
