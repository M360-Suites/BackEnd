// src/services/TrafficService.ts
import { GoogleAnalyticsProvider } from "../Providers";
import { Domain, TrafficData } from '../../../Models/SEOModels';

export class TrafficService {
  private gaProvider: GoogleAnalyticsProvider | null = null;

  constructor(gaCredentials?: any, propertyId?: string) {
    if (gaCredentials && propertyId) {
      this.gaProvider = new GoogleAnalyticsProvider(gaCredentials, propertyId);
    }
  }

  async syncTrafficData(
    domainId: string,
    organizationId: string,
    days: number = 30,
  ): Promise<any> {
    const domain = await Domain.findOne({
      _id: domainId,
      organizationId,
    });

    if (!domain) {
      throw new Error("Domain not found");
    }

    if (!this.gaProvider) {
      throw new Error("Google Analytics not configured");
    }

    const endDate = new Date().toISOString().split("T")[0];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    // Fetch traffic data
    const [overview, sources, pages, countries] = await Promise.all([
      this.gaProvider.getTrafficReport(
        startDate,
        endDate,
        [],
        ["sessions", "users", "pageviews", "bounceRate", "avgSessionDuration"],
      ),
      this.gaProvider.getTrafficReport(
        startDate,
        endDate,
        ["sessionSource"],
        ["sessions"],
      ),
      this.gaProvider.getPagePerformance(startDate, endDate, 20),
      this.gaProvider.getTrafficReport(
        startDate,
        endDate,
        ["country"],
        ["sessions"],
      ),
    ]);

    // Process and save data
    const trafficData = await this.processAndSaveTrafficData(
      organizationId,
      domainId,
      overview,
      sources,
      pages,
      countries,
    );

    // Update domain metrics
    await this.updateDomainMetrics(domainId, trafficData);

    return {
      success: true,
      days,
      summary: {
        totalSessions: overview.totals?.sessions || 0,
        totalUsers: overview.totals?.users || 0,
        avgBounceRate: overview.totals?.bounceRate || 0,
        avgSessionDuration: overview.totals?.avgSessionDuration || 0,
      },
      lastSync: new Date(),
    };
  }

  async getTrafficOverview(
    domainId: string,
    organizationId: string,
    days: number = 7,
  ): Promise<any> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const trafficData = await TrafficData.find({
      domainId,
      organizationId,
      date: { $gte: startDate },
    }).sort({ date: 1 });

    if (trafficData.length === 0) {
      return { error: "No traffic data found" };
    }

    // Calculate trends
    const trends = this.calculateTrends(trafficData);

    // Get top sources
    const sources = await this.getTopSources(domainId, days);

    // Get top pages
    const pages = await this.getTopPages(domainId, days);

    return {
      period: { start: startDate, end: new Date() },
      summary: {
        totalSessions: trafficData.reduce((sum, day) => sum + day.sessions, 0),
        totalUsers: trafficData.reduce((sum, day) => sum + day.users, 0),
        avgBounceRate:
          trafficData.reduce((sum, day) => sum + day.bounceRate, 0) /
          trafficData.length,
        avgSessionDuration:
          trafficData.reduce((sum, day) => sum + day.avgSessionDuration, 0) /
          trafficData.length,
      },
      trends,
      sources,
      pages,
      dailyData: trafficData.map((day) => ({
        date: day.date,
        sessions: day.sessions,
        users: day.users,
        bounceRate: day.bounceRate,
      })),
    };
  }

  async getRealtimeTraffic(domainId: string): Promise<any> {
    if (!this.gaProvider) {
      return { error: "Google Analytics not configured" };
    }

    try {
      const realtimeData = await this.gaProvider.getRealtimeReport();

      return {
        activeUsers: realtimeData.totals?.activeUsers || 0,
        topCountries: realtimeData.rows
          .filter((row: any) => row.country !== "(not set)")
          .slice(0, 5),
        devices: realtimeData.rows.reduce((acc: any, row: any) => {
          const device = row.deviceCategory || "unknown";
          acc[device] = (acc[device] || 0) + (row.activeUsers || 0);
          return acc;
        }, {}),
        timestamp: new Date(),
      };
    } catch (error) {
      console.error("Realtime traffic error:", error);
      return { error: "Failed to fetch realtime data" };
    }
  }

  async getTrafficSources(
    domainId: string,
    organizationId: string,
    days: number = 30,
  ): Promise<any> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const trafficData = await TrafficData.find({
      domainId,
      organizationId,
      date: { $gte: startDate },
    });

    // Aggregate by source
    const sources = {
      organic: trafficData.reduce((sum, day) => sum + day.organic, 0),
      direct: trafficData.reduce((sum, day) => sum + day.direct, 0),
      referral: trafficData.reduce((sum, day) => sum + day.referral, 0),
      social: trafficData.reduce((sum, day) => sum + day.social, 0),
      email: trafficData.reduce((sum, day) => sum + day.email, 0),
      paid: trafficData.reduce((sum, day) => sum + day.paid, 0),
    };

    const total = Object.values(sources).reduce(
      (a: number, b: number) => a + b,
      0,
    );

    return {
      sources: Object.entries(sources).map(([name, value]) => ({
        name,
        value,
        percentage:
          total > 0 ? Math.round(((value as number) / total) * 100) : 0,
      })),
      total,
    };
  }

  async getUserAcquisition(domainId: string, days: number = 30): Promise<any> {
    if (!this.gaProvider) {
      return { error: "Google Analytics not configured" };
    }

    const endDate = new Date().toISOString().split("T")[0];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    try {
      const acquisitionData = await this.gaProvider.getUserAcquisition(
        startDate,
        endDate,
      );

      return this.processAcquisitionData(acquisitionData);
    } catch (error) {
      console.error("User acquisition error:", error);
      return { error: "Failed to fetch acquisition data" };
    }
  }

  private async processAndSaveTrafficData(
    organizationId: string,
    domainId: string,
    overview: any,
    sources: any,
    pages: any,
    countries: any,
  ): Promise<any> {
    const date = new Date();
    date.setHours(0, 0, 0, 0);

    // Categorize traffic sources
    const sourceCategories = this.categorizeSources(sources.rows || []);

    // Prepare traffic data
    const trafficData = {
      organizationId,
      domainId,
      date,
      sessions: overview.totals?.sessions || 0,
      users: overview.totals?.users || 0,
      pageviews: overview.totals?.pageviews || 0,
      bounceRate: overview.totals?.bounceRate || 0,
      avgSessionDuration: overview.totals?.avgSessionDuration || 0,
      ...sourceCategories,
      topCountries: this.processCountries(countries.rows || []),
      topPages: this.processPages(pages.rows || []),
      devices: { desktop: 0, mobile: 0, tablet: 0 }, // Would need device data
    };

    // Save or update
    await TrafficData.findOneAndUpdate(
      { organizationId, domainId, date },
      { $set: trafficData },
      { upsert: true, new: true },
    );

    return trafficData;
  }

  private categorizeSources(sourceRows: any[]): any {
    const categories = {
      organic: 0,
      direct: 0,
      referral: 0,
      social: 0,
      email: 0,
      paid: 0,
    };

    sourceRows.forEach((row: any) => {
      const source = row.sessionSource || "";
      const sessions = row.sessions || 0;

      if (source.includes("google") || source.includes("bing")) {
        categories.organic += sessions;
      } else if (source === "(direct)") {
        categories.direct += sessions;
      } else if (
        source.includes("facebook") ||
        source.includes("twitter") ||
        source.includes("linkedin") ||
        source.includes("instagram")
      ) {
        categories.social += sessions;
      } else if (source.includes("mail") || source.includes("email")) {
        categories.email += sessions;
      } else if (source.includes("cpc") || source.includes("ppc")) {
        categories.paid += sessions;
      } else {
        categories.referral += sessions;
      }
    });

    return categories;
  }

  private processCountries(countryRows: any[]): any[] {
    return countryRows
      .filter((row: any) => row.country && row.country !== "(not set)")
      .map((row: any) => ({
        country: row.country,
        sessions: row.sessions || 0,
        percent: 0, // Will calculate later
      }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 10);
  }

  private processPages(pageRows: any[]): any[] {
    return pageRows
      .map((row: any) => ({
        page: row.pagePath || "",
        pageviews: row.screenPageViews || 0,
        avgTime: row.averageSessionDuration || 0,
      }))
      .sort((a, b) => b.pageviews - a.pageviews)
      .slice(0, 20);
  }

  private calculateTrends(trafficData: any[]): any {
    if (trafficData.length < 2) return {};

    const current = trafficData[trafficData.length - 1];
    const previous = trafficData[trafficData.length - 2];

    const calculateChange = (currentVal: number, previousVal: number) => {
      if (previousVal === 0) return 100;
      return ((currentVal - previousVal) / previousVal) * 100;
    };

    return {
      sessions: calculateChange(current.sessions, previous.sessions),
      users: calculateChange(current.users, previous.users),
      pageviews: calculateChange(current.pageviews, previous.pageviews),
      bounceRate: calculateChange(current.bounceRate, previous.bounceRate) * -1, // Negative is good
      sessionDuration: calculateChange(
        current.avgSessionDuration,
        previous.avgSessionDuration,
      ),
    };
  }

  private async getTopSources(domainId: string, days: number): Promise<any[]> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const pipeline = [
      { $match: { domainId, date: { $gte: startDate } } },
      {
        $group: {
          _id: null,
          organic: { $sum: "$organic" },
          direct: { $sum: "$direct" },
          referral: { $sum: "$referral" },
          social: { $sum: "$social" },
          email: { $sum: "$email" },
          paid: { $sum: "$paid" },
        },
      },
    ];

    const result = await TrafficData.aggregate(pipeline);
    if (result.length === 0) return [];

    const sources = result[0];
    const total = 0
      // Object.values(sources).reduce((a: number, b: number) => a + b, 0) -
      // (sources._id ? 1 : 0);

    return [
      {
        name: "Organic",
        value: sources.organic,
        percentage: Math.round((sources.organic / total) * 100),
      },
      {
        name: "Direct",
        value: sources.direct,
        percentage: Math.round((sources.direct / total) * 100),
      },
      {
        name: "Referral",
        value: sources.referral,
        percentage: Math.round((sources.referral / total) * 100),
      },
      {
        name: "Social",
        value: sources.social,
        percentage: Math.round((sources.social / total) * 100),
      },
      {
        name: "Email",
        value: sources.email,
        percentage: Math.round((sources.email / total) * 100),
      },
      {
        name: "Paid",
        value: sources.paid,
        percentage: Math.round((sources.paid / total) * 100),
      },
    ];
  }

  private async getTopPages(domainId: string, days: number): Promise<any[]> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const trafficData = await TrafficData.find({
      domainId,
      date: { $gte: startDate },
    });

    const pageMap = new Map<string, { pageviews: number; avgTime: number }>();

    trafficData.forEach((day) => {
      day.topPages.forEach((page: any) => {
        const existing = pageMap.get(page.page) || { pageviews: 0, avgTime: 0 };
        pageMap.set(page.page, {
          pageviews: existing.pageviews + page.pageviews,
          avgTime: (existing.avgTime + page.avgTime) / 2,
        });
      });
    });

    return Array.from(pageMap.entries())
      .map(([page, data]) => ({
        page,
        pageviews: data.pageviews,
        avgTime: data.avgTime,
      }))
      .sort((a, b) => b.pageviews - a.pageviews)
      .slice(0, 10);
  }

  private async updateDomainMetrics(
    domainId: string,
    trafficData: any,
  ): Promise<void> {
    await Domain.findByIdAndUpdate(domainId, {
      "metrics.organicTraffic": trafficData.organic,
    });
  }

  private processAcquisitionData(data: any): any {
    // Process acquisition data from GA4
    return {
      channels:
        data.rows?.map((row: any) => ({
          channel: row.sessionMedium || "direct",
          sessions: row.sessions || 0,
          users: row.users || 0,
          newUsers: row.newUsers || 0,
          engagedSessions: row.engagedSessions || 0,
        })) || [],
    };
  }
}
