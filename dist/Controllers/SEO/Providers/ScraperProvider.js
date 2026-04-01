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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScraperProvider = void 0;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const limiter_1 = require("limiter");
class ScraperProvider {
    constructor() {
        // Limit to 5 requests per second
        this.limiter = new limiter_1.RateLimiter({ tokensPerInterval: 5, interval: 'second' });
        this.userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
        ];
    }
    async scrape(url) {
        await this.limiter.removeTokens(1);
        try {
            const response = await axios_1.default.get(url, {
                headers: {
                    'User-Agent': this.userAgents[Math.floor(Math.random() * this.userAgents.length)],
                    'Accept': 'text/html,application/xhtml+xml,application/xml',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Connection': 'keep-alive'
                },
                timeout: 10000,
                maxRedirects: 5
            });
            const $ = cheerio.load(response.data);
            return {
                url,
                status: response.status,
                title: $('title').text().trim(),
                metaDescription: $('meta[name="description"]').attr('content') || '',
                canonical: $('link[rel="canonical"]').attr('href') || '',
                robots: $('meta[name="robots"]').attr('content') || '',
                // Headers
                h1: $('h1').map((i, el) => $(el).text().trim()).get(),
                h2: $('h2').map((i, el) => $(el).text().trim()).get(),
                h3: $('h3').map((i, el) => $(el).text().trim()).get(),
                // Images
                images: $('img').map((i, el) => ({
                    src: $(el).attr('src'),
                    alt: $(el).attr('alt') || '',
                    title: $(el).attr('title') || ''
                })).get(),
                // Links
                links: $('a').map((i, el) => ({
                    href: $(el).attr('href'),
                    text: $(el).text().trim(),
                    title: $(el).attr('title') || '',
                    rel: $(el).attr('rel') || ''
                })).get(),
                // Schema
                schema: $('script[type="application/ld+json"]').map((i, el) => {
                    try {
                        return JSON.parse($(el).html() || '');
                    }
                    catch {
                        return null;
                    }
                }).get().filter(Boolean),
                // Meta tags
                meta: {
                    viewport: $('meta[name="viewport"]').attr('content') || '',
                    charset: $('meta[charset]').attr('charset') || $('meta[http-equiv="Content-Type"]').attr('content') || '',
                    ogTitle: $('meta[property="og:title"]').attr('content') || '',
                    ogDescription: $('meta[property="og:description"]').attr('content') || '',
                    ogImage: $('meta[property="og:image"]').attr('content') || '',
                    twitterCard: $('meta[name="twitter:card"]').attr('content') || ''
                },
                // Technical
                htmlSize: response.data.length,
                gzip: response.headers['content-encoding'] === 'gzip',
                contentType: response.headers['content-type'],
                responseTime: response.headers['date']
            };
        }
        catch (error) {
            return {
                url,
                error: error.message,
                status: error.response?.status || 0
            };
        }
    }
    async analyzeSEO(url) {
        const data = await this.scrape(url);
        if (data.error) {
            return { error: data.error };
        }
        // Analyze SEO factors
        const issues = [];
        const recommendations = [];
        // Title check
        if (!data.title) {
            issues.push('Missing title tag');
            recommendations.push('Add a descriptive title tag (50-60 characters)');
        }
        else if (data.title.length > 60) {
            issues.push('Title too long');
            recommendations.push('Shorten title to under 60 characters');
        }
        // Meta description check
        if (!data.metaDescription) {
            issues.push('Missing meta description');
            recommendations.push('Add a compelling meta description (120-155 characters)');
        }
        else if (data.metaDescription.length > 155) {
            issues.push('Meta description too long');
            recommendations.push('Shorten meta description to 155 characters');
        }
        // H1 check
        if (data.h1.length === 0) {
            issues.push('Missing H1 tag');
            recommendations.push('Add a single H1 tag with primary keyword');
        }
        else if (data.h1.length > 1) {
            issues.push('Multiple H1 tags');
            recommendations.push('Use only one H1 tag per page');
        }
        // Images without alt
        const imagesWithoutAlt = data.images.filter((img) => !img.alt);
        if (imagesWithoutAlt.length > 0) {
            issues.push(`${imagesWithoutAlt.length} images without alt text`);
            recommendations.push(`Add alt text to ${imagesWithoutAlt.length} images`);
        }
        // Canonical check
        if (!data.canonical) {
            issues.push('Missing canonical tag');
            recommendations.push('Add canonical tag to avoid duplicate content');
        }
        // Schema check
        if (data.schema.length === 0) {
            recommendations.push('Add structured data (Schema.org)');
        }
        return {
            url,
            basicInfo: {
                title: data.title,
                metaDescription: data.metaDescription,
                h1Count: data.h1.length,
                imageCount: data.images.length,
                linkCount: data.links.length,
                hasCanonical: !!data.canonical,
                hasSchema: data.schema.length > 0
            },
            issues,
            recommendations,
            score: Math.max(0, 100 - (issues.length * 10))
        };
    }
    async extractBacklinks(domain, pageUrl) {
        // This would crawl a page and extract outbound links
        // For now, return mock data
        return [
            {
                source: pageUrl,
                target: `https://${domain}/`,
                anchor: 'homepage',
                follow: 'dofollow'
            }
        ];
    }
}
exports.ScraperProvider = ScraperProvider;
