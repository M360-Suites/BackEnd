import { Audit } from "../../../Models/SEOModels";

import { PageSpeedProvider, ScraperProvider, SerpAPIProvider } from "../Providers";
import { QueueService } from "./QueueService";

export interface SiteAuditResult {
  technical: {
    performance: any;
    accessibility: any;
    bestPractices: any;
    seo: any;
  };
  onPage: {
    title: { value: string; issues: string[] };
    metaDescription: { value: string; issues: string[] };
    headings: { h1: number; h2: number; h3: number; issues: string[] };
    images: { total: number; altMissing: number; issues: string[] };
    links: { total: number; broken: number; issues: string[] };
    canonical: { present: boolean; correct: boolean; issues: string[] };
  };
  // security: {
  //   https: boolean;
  //   hsts: boolean;
  //   xssProtection: boolean;
  //   contentSecurityPolicy: boolean;
  //   issues: string[];
  // };
  // mobile: {
  //   viewport: boolean;
  //   touchFriendly: boolean;
  //   fontSizes: boolean;
  //   tapTargets: boolean;
  //   issues: string[];
  // };
  // schema: {
  //   present: boolean;
  //   types: string[];
  //   issues: string[];
  // };
}

export class SiteAuditService {
  private pageSpeedProvider: PageSpeedProvider;
  private serpProvider: SerpAPIProvider;
  private scraper: ScraperProvider;
  private queueService: QueueService;

  constructor(
    pageSpeedKey: string,
    serpApiKey: string,
    queueService: QueueService,
  ) {
    this.pageSpeedProvider = new PageSpeedProvider(pageSpeedKey);
    this.serpProvider = new SerpAPIProvider(serpApiKey);
    this.scraper = new ScraperProvider();
    this.queueService = queueService;
  }

  async runAudit(url: string, organizationId: string): Promise<string> {
    // Create audit record
    const audit = await Audit.create({
      organizationId,
      url,
      status: "queued",
      startedAt: new Date(),
    });

    // Queue the audit job
    await this.queueService.addJob("site-audit", {
      auditId: audit._id,
      url,
      organizationId,
    });

    return audit._id as string;
  }

  async processAudit(auditId: string, url: string): Promise<void> {
    const audit = await Audit.findById(auditId);
    if (!audit) throw new Error("Audit not found");

    try {
      audit.status = "processing";
      audit.progress = 10;
      await audit.save();

      // 1. Technical audit (PageSpeed)
      const [mobileMetrics, desktopMetrics] = await Promise.all([
        this.pageSpeedProvider.analyzeUrl(url, "mobile"),
        this.pageSpeedProvider.analyzeUrl(url, "desktop"),
      ]);

      audit.progress = 30;
      await audit.save();

      // 2. On-page SEO audit (Scraper)
      const onPageData = await this.scraper.analyzeSEO(url);

      audit.progress = 60;
      await audit.save();

      // 3. Security check
      // const securityData = await this.scraper.checkSecurity(url);

      audit.progress = 80;
      await audit.save();

      // 4. Mobile friendly check
      // const mobileData = await this.scraper.checkMobile(url);

      audit.progress = 90;
      await audit.save();

      // Compile results
      const result: SiteAuditResult = {
        technical: {
          performance: { mobile: mobileMetrics, desktop: desktopMetrics },
          accessibility: { score: mobileMetrics.accessibility },
          bestPractices: { score: mobileMetrics.bestPractices },
          seo: { score: mobileMetrics.seo },
        },
        onPage: onPageData,
        // security: securityData,
        // mobile: mobileData,
        // schema: await this.scraper.checkSchema(url),
      };

      // Save results
      audit.result = result;
      audit.status = "completed";
      audit.completedAt = new Date();
      audit.progress = 100;
      await audit.save();
    } catch (error: any) {
      audit.status = "failed";
      audit.error = error.message;
      await audit.save();
      throw error;
    }
  }

  async getAuditResults(auditId: string, organizationId: string): Promise<any> {
    const audit = await Audit.findOne({
      _id: auditId,
      organizationId,
    });

    if (!audit) throw new Error("Audit not found or access denied");
    return audit;
  }

  async getAuditHistory(
    organizationId: string,
    limit: number = 10,
  ): Promise<any[]> {
    return Audit.find({ organizationId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("url status startedAt completedAt");
  }
}
