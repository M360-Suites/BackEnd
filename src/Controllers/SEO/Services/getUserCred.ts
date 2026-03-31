import { SeoCredModel } from "../../../Models/SEOModels";
import { decrypt } from "../../../Services/encryption";
import { SEOConfig } from "../../../Types/seo";

export const getUserCreds = async (
  userId: string,
  url: string,
): Promise<SEOConfig> => {
  try {
    const cred = await SeoCredModel.findOne({ userId, url });

    let rCred: SEOConfig = {
      pageSpeed: {
        apiKey: process.env.GOOGLE_API_KEY!,
      },
      serpTracking: {
        apiKey: process.env.SERP_KEY!,
      },
      googleAnalytics: {
        apiSecret: "",
        propertyId: "",
        measurementId: "",
      },
      microsoftClarity: {
        projectId: "",
        apiKey: "",
      },
    };

    if (cred) {
      rCred.googleAnalytics.apiSecret = cred.googleAnalytics?.apiSecret
        ? decrypt(cred.googleAnalytics?.apiSecret)
        : "";
      rCred.googleAnalytics.measurementId = cred.googleAnalytics?.measurementId;
      rCred.googleAnalytics.propertyId = cred.googleAnalytics?.propertyId;

      rCred.microsoftClarity.projectId = cred.microsoftClarity.projectId;
      rCred.microsoftClarity.apiKey = cred.googleAnalytics.apiSecret
        ? decrypt(cred.googleAnalytics?.apiSecret)
        : "";

      // let rCred: SEOConfig = {
      //   pageSpeed: {
      //     apiKey: process.env.GOOGLE_API_KEY!,
      //   },
      //   serpTracking: {
      //     apiKey: process.env.SERP_KEY!,
      //   },
      //   googleAnalytics: {
      //     apiSecret: cred.googleAnalytics?.apiSecret
      //       ? decrypt(cred.googleAnalytics?.apiSecret)
      //       : "",
      //     propertyId: cred.googleAnalytics?.propertyId!,
      //     measurementId: cred.googleAnalytics?.measurementId!,
      //   },
      //   microsoftClarity: {
      //     projectId: cred.microsoftClarity?.projectId!,
      //     apiKey: cred.microsoftClarity?.apiKey
      //       ? decrypt(cred.microsoftClarity?.apiKey)
      //       : "",
      //   },
      // };
    }
    return rCred;
  } catch (error) {
    throw error;
  }
};
