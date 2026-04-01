"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleAnalyticsProvider = void 0;
const googleapis_1 = require("googleapis");
const BaseProvider_1 = require("./BaseProvider");
class GoogleAnalyticsProvider extends BaseProvider_1.BaseSEOProvider {
    constructor(propertyId, credentials) {
        super("https://analyticsdata.googleapis.com/v1beta", "ga4");
        this.propertyId = propertyId;
        this.credentials = credentials;
        this.initialize(credentials);
    }
    initialize(credentials) {
        const auth = new googleapis_1.google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/analytics.readonly']
        });
        this.analytics = googleapis_1.google.analyticsdata({
            version: 'v1beta',
            auth
        });
    }
    async getTrafficData(startDate, endDate = new Date().toISOString().split("T")[0]) {
        const cacheKey = `ga:${this.propertyId}:traffic:${startDate}:${endDate}`;
        return this.getCachedOrFetch(cacheKey, async () => {
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
            }
            catch (error) {
                console.error('GA4 API error:', error.message);
                throw new Error('Failed to fetch analytics data');
            }
        }, 3600 // Cache for 1 hour
        );
    }
    async getRealtimeReport() {
        const cacheKey = `ga:${this.propertyId}:realtime`;
        return this.getCachedOrFetch(cacheKey, async () => {
            try {
                const response = await this.analytics.properties.runRealtimeReport({
                    property: `properties/${this.propertyId}`,
                    requestBody: {
                        dimensions: [{ name: 'country' }, { name: 'deviceCategory' }],
                        metrics: [{ name: 'activeUsers' }]
                    }
                });
                return this.parseResponse(response.data);
            }
            catch (error) {
                console.error('GA4 realtime error:', error.message);
                return { rows: [], totals: {}, rowCount: 0 };
            }
        }, 60 // Cache for 1 minute (realtime data)
        );
    }
    async getUserAcquisition(startDate, endDate) {
        const cacheKey = `ga:${this.propertyId}:acquisition:${startDate}:${endDate}`;
        return this.getCachedOrFetch(cacheKey, async () => {
            const response = await this.getTrafficReport(startDate, endDate, ['sessionSource', 'sessionMedium'], ['sessions', 'totalUsers', 'newUsers', 'engagedSessions']);
            return response;
        }, 3600);
    }
    async getPagePerformance(startDate, endDate, limit = 10) {
        const cacheKey = `ga:${this.propertyId}:pages:${startDate}:${endDate}:${limit}`;
        return this.getCachedOrFetch(cacheKey, async () => {
            const response = await this.getTrafficReport(startDate, endDate, ['pagePath', 'pageTitle'], ['screenPageViews', 'averageSessionDuration', 'bounceRate']);
            // Sort by pageviews and limit
            response.rows = response.rows
                .sort((a, b) => b.screenPageViews - a.screenPageViews)
                .slice(0, limit);
            return response;
        }, 3600);
    }
    async getTrafficReport(startDate, endDate, dimensions = [], metrics = ['sessions', 'totalUsers', 'screenPageViews'], limit) {
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
        }
        catch (error) {
            console.error('GA4 API error:', error.message);
            throw new Error('Failed to fetch analytics data');
        }
    }
    parseResponse(data) {
        if (!data.rows) {
            return { rows: [], totals: {}, rowCount: 0 };
        }
        const parsedRows = data.rows.map((row) => {
            const result = {};
            // Parse dimensions
            row.dimensionValues?.forEach((dim, i) => {
                const dimName = data.dimensionHeaders?.[i]?.name || `dimension${i}`;
                result[dimName] = dim.value;
            });
            // Parse metrics
            row.metricValues?.forEach((met, i) => {
                const metName = data.metricHeaders?.[i]?.name || `metric${i}`;
                result[metName] = parseFloat(met.value) || 0;
            });
            return result;
        });
        // Parse totals
        const totals = {};
        data.totals?.[0]?.metricValues?.forEach((met, i) => {
            const metName = data.metricHeaders?.[i]?.name || `metric${i}`;
            totals[metName] = parseFloat(met.value) || 0;
        });
        return {
            rows: parsedRows,
            totals,
            rowCount: data.rowCount || 0
        };
    }
    parseSources(rows) {
        const sources = {
            organic: 0,
            direct: 0,
            referral: 0,
            social: 0,
            email: 0,
            paid: 0,
        };
        rows.forEach((row) => {
            const source = row.sessionSource?.toLowerCase() || '';
            const sessions = row.sessions || 0;
            if (source.includes('google') || source.includes('bing') || source.includes('yahoo')) {
                sources.organic += sessions;
            }
            else if (source === '(direct)' || source === 'direct') {
                sources.direct += sessions;
            }
            else if (source.includes('facebook') || source.includes('twitter') ||
                source.includes('instagram') || source.includes('linkedin') ||
                source.includes('pinterest')) {
                sources.social += sessions;
            }
            else if (source.includes('email') || row.sessionMedium === 'email') {
                sources.email += sessions;
            }
            else if (row.sessionMedium?.includes('cpc') || row.sessionMedium?.includes('ppc')) {
                sources.paid += sessions;
            }
            else {
                sources.referral += sessions;
            }
        });
        return sources;
    }
    parseTopPages(rows) {
        return rows.map((row) => ({
            page: row.pagePath || '',
            views: row.screenPageViews || 0,
            avgTime: row.averageSessionDuration || 0
        }));
    }
    parseGeolocation(rows) {
        return rows.map((row) => ({
            country: row.country || '',
            sessions: row.sessions || 0
        }));
    }
    async checkQuota() {
        // GA4 doesn't have strict quotas for basic usage, but we can implement
        // rate limiting checks if needed
        return true;
    }
}
exports.GoogleAnalyticsProvider = GoogleAnalyticsProvider;
