import { google } from 'googleapis';
import { BaseSEOProvider } from "./BaseProvider";

export interface TrafficData {
  sessions: number;
  users: number;
  pageviews: number;
  bounceRate: number;
  avgSessionDuration: number;
  sources: {
    organic: number;
    direct: number;
    referral: number;
    social: number;
    email: number;
    paid: number;
  };
  topPages: Array<{
    page: string;
    views: number;
    avgTime: number;
  }>;
  geolocation: Array<{
    country: string;
    sessions: number;
  }>;
}

interface AcquisitionData {
  rows: Array<{
    sessionSource?: string;
    sessionMedium?: string;
    sessions: number;
    users: number;
    newUsers: number;
    engagedSessions: number;
  }>;
  totals: Record<string, number>;
  rowCount: number;
}

interface RealtimeData {
  rows: Array<{
    country?: string;
    deviceCategory?: string;
    activeUsers: number;
  }>;
  totals: Record<string, number>;
  rowCount: number;
}

interface PagePerformanceData {
  rows: Array<{
    pagePath?: string;
    pageTitle?: string;
    screenPageViews: number;
    averageSessionDuration: number;
    bounceRate: number;
  }>;
  totals: Record<string, number>;
  rowCount: number;
}

export class GoogleAnalyticsProvider extends BaseSEOProvider {
  private analytics: any;
  private propertyId: string;
  private credentials: any;

  constructor(propertyId: string, credentials: any) {
    super("https://analyticsdata.googleapis.com/v1beta", "ga4");
    this.propertyId = propertyId;
    this.credentials = credentials;
    this.initialize(credentials);
  }

  private initialize(credentials: any): void {
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/analytics.readonly']
    });

    this.analytics = google.analyticsdata({
      version: 'v1beta',
      auth
    });
  }

  async getTrafficData(
    startDate: string,
    endDate: string = new Date().toISOString().split("T")[0],
  ): Promise<TrafficData> {
    const cacheKey = `ga:${this.propertyId}:traffic:${startDate}:${endDate}`;

    return this.getCachedOrFetch(
      cacheKey,
      async () => {
        try {
          const [overallReport, sourcesReport, pagesReport, geoReport] = await Promise.all([
            this.getTrafficReport(startDate, endDate, [], ['sessions', 'totalUsers', 'screenPageViews', 'bounceRate', 'averageSessionDuration']),
            this.getTrafficReport(startDate, endDate, ['sessionSource'], ['sessions']),
            this.getTrafficReport(startDate, endDate, ['pagePath'], ['screenPageViews', 'averageSessionDuration'], 10),
            this.getTrafficReport(startDate, endDate, ['country'], ['sessions'], 10)
          ]);

          const sources = this.parseSources(sourcesReport.rows);
          const topPages = this.parseTopPages(pagesReport.rows);
          const geolocation = this.parseGeolocation(geoReport.rows);

          return {
            sessions: overallReport.totals.sessions || 0,
            users: overallReport.totals.totalUsers || 0,
            pageviews: overallReport.totals.screenPageViews || 0,
            bounceRate: overallReport.totals.bounceRate || 0,
            avgSessionDuration: overallReport.totals.averageSessionDuration || 0,
            sources,
            topPages,
            geolocation
          };
        } catch (error: any) {
          console.error('GA4 API error:', error.message);
          throw new Error('Failed to fetch analytics data');
        }
      },
      3600 // Cache for 1 hour
    );
  }

  async getRealtimeReport(): Promise<RealtimeData> {
    const cacheKey = `ga:${this.propertyId}:realtime`;
    
    return this.getCachedOrFetch(
      cacheKey,
      async () => {
        try {
          const response = await this.analytics.properties.runRealtimeReport({
            property: `properties/${this.propertyId}`,
            requestBody: {
              dimensions: [{ name: 'country' }, { name: 'deviceCategory' }],
              metrics: [{ name: 'activeUsers' }]
            }
          });

          return this.parseResponse(response.data);
        } catch (error: any) {
          console.error('GA4 realtime error:', error.message);
          return { rows: [], totals: {}, rowCount: 0 };
        }
      },
      60 // Cache for 1 minute (realtime data)
    );
  }

  async getUserAcquisition(
    startDate: string,
    endDate: string
  ): Promise<AcquisitionData> {
    const cacheKey = `ga:${this.propertyId}:acquisition:${startDate}:${endDate}`;

    return this.getCachedOrFetch(
      cacheKey,
      async () => {
        const response = await this.getTrafficReport(
          startDate,
          endDate,
          ['sessionSource', 'sessionMedium'],
          ['sessions', 'totalUsers', 'newUsers', 'engagedSessions']
        );
        return response;
      },
      3600
    );
  }

  async getPagePerformance(
    startDate: string,
    endDate: string,
    limit: number = 10
  ): Promise<PagePerformanceData> {
    const cacheKey = `ga:${this.propertyId}:pages:${startDate}:${endDate}:${limit}`;

    return this.getCachedOrFetch(
      cacheKey,
      async () => {
        const response = await this.getTrafficReport(
          startDate,
          endDate,
          ['pagePath', 'pageTitle'],
          ['screenPageViews', 'averageSessionDuration', 'bounceRate']
        );

        // Sort by pageviews and limit
        response.rows = response.rows
          .sort((a: any, b: any) => b.screenPageViews - a.screenPageViews)
          .slice(0, limit);

        return response;
      },
      3600
    );
  }

  async getTrafficReport(
    startDate: string,
    endDate: string,
    dimensions: string[] = [],
    metrics: string[] = ['sessions', 'totalUsers', 'screenPageViews'],
    limit?: number
  ): Promise<any> {
    try {
      const response = await this.analytics.properties.runReport({
        property: `properties/${this.propertyId}`,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          dimensions: dimensions.map(name => ({ name })),
          metrics: metrics.map(name => ({ name })),
          keepEmptyRows: false,
          ...(limit && { limit: limit.toString() })
        }
      });

      return this.parseResponse(response.data);
    } catch (error: any) {
      console.error('GA4 API error:', error.message);
      throw new Error('Failed to fetch analytics data');
    }
  }

  private parseResponse(data: any): any {
    if (!data.rows) {
      return { rows: [], totals: {}, rowCount: 0 };
    }

    const parsedRows = data.rows.map((row: any) => {
      const result: any = {};
      
      // Parse dimensions
      row.dimensionValues?.forEach((dim: any, i: number) => {
        const dimName = data.dimensionHeaders?.[i]?.name || `dimension${i}`;
        result[dimName] = dim.value;
      });
      
      // Parse metrics
      row.metricValues?.forEach((met: any, i: number) => {
        const metName = data.metricHeaders?.[i]?.name || `metric${i}`;
        result[metName] = parseFloat(met.value) || 0;
      });
      
      return result;
    });

    // Parse totals
    const totals: any = {};
    data.totals?.[0]?.metricValues?.forEach((met: any, i: number) => {
      const metName = data.metricHeaders?.[i]?.name || `metric${i}`;
      totals[metName] = parseFloat(met.value) || 0;
    });

    return {
      rows: parsedRows,
      totals,
      rowCount: data.rowCount || 0
    };
  }

  private parseSources(rows: Array<any>): TrafficData['sources'] {
    const sources = {
      organic: 0,
      direct: 0,
      referral: 0,
      social: 0,
      email: 0,
      paid: 0,
    };

    rows.forEach((row: any) => {
      const source = row.sessionSource?.toLowerCase() || '';
      const sessions = row.sessions || 0;

      if (source.includes('google') || source.includes('bing') || source.includes('yahoo')) {
        sources.organic += sessions;
      } else if (source === '(direct)' || source === 'direct') {
        sources.direct += sessions;
      } else if (source.includes('facebook') || source.includes('twitter') || 
                 source.includes('instagram') || source.includes('linkedin') ||
                 source.includes('pinterest')) {
        sources.social += sessions;
      } else if (source.includes('email') || row.sessionMedium === 'email') {
        sources.email += sessions;
      } else if (row.sessionMedium?.includes('cpc') || row.sessionMedium?.includes('ppc')) {
        sources.paid += sessions;
      } else {
        sources.referral += sessions;
      }
    });

    return sources;
  }

  private parseTopPages(rows: Array<any>): TrafficData['topPages'] {
    return rows.map((row: any) => ({
      page: row.pagePath || '',
      views: row.screenPageViews || 0,
      avgTime: row.averageSessionDuration || 0
    }));
  }

  private parseGeolocation(rows: Array<any>): TrafficData['geolocation'] {
    return rows.map((row: any) => ({
      country: row.country || '',
      sessions: row.sessions || 0
    }));
  }

  async checkQuota(): Promise<boolean> {
    // GA4 doesn't have strict quotas for basic usage, but we can implement
    // rate limiting checks if needed
    return true;
  }
}