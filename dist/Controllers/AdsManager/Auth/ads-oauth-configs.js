"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ADS_CONFIGS = void 0;
const ads_1 = require("../../../Types/ads");
let server = process.env.NODE_ENV === 'development'
    ? 'http://localhost:5001/api'
    : 'https://m360-wn9s.onrender.com/api';
let clientUrl = process.env.CLIENT_URL;
exports.ADS_CONFIGS = {
    [ads_1.AdsPlatform.META]: {
        clientId: process.env.FACEBOOK_CLIENT_ID,
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
        redirectUri: `${clientUrl}/ads-auth/callback`,
        scopes: ['ads_management', 'ads_read', 'pages_read_engagement', 'pages_show_list'],
        authUrl: 'https://www.facebook.com/v23.0/dialog/oauth',
        tokenUrl: 'https://graph.facebook.com/v23.0/oauth/access_token',
        refreshUrl: 'https://graph.facebook.com/v23.0/oauth/access_token',
    },
    [ads_1.AdsPlatform.TWITTER]: {
        clientId: process.env.TWITTER_CLIENT_ID,
        clientSecret: process.env.TWITTER_CLIENT_SECRET,
        redirectUri: `${clientUrl}/ads-auth/callback`,
        scopes: ['tweet.write', 'tweet.read', 'users.read', 'offline.access', 'media.write'],
        authUrl: 'https://twitter.com/i/oauth2/authorize',
        tokenUrl: 'https://api.twitter.com/2/oauth2/token',
        refreshUrl: 'https://api.twitter.com/2/oauth2/token',
    },
    [ads_1.AdsPlatform.GOOGLE]: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        redirectUri: `${clientUrl}/ads-auth/callback`,
        scopes: ['https://www.googleapis.com/auth/adwords', 'profile', 'email'],
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        refreshUrl: 'https://oauth2.googleapis.com/token',
    },
    [ads_1.AdsPlatform.LINKEDIN]: {
        clientId: process.env.LINKEDIN_CLIENT_ID,
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
        redirectUri: `${clientUrl}/ads-auth/callback`,
        scopes: [
            'r_ads',
            'r_ads_reporting',
            'w_member_social',
            'r_organization_social',
            'email',
            'profile',
            'openid',
        ],
        authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
        tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
        refreshUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    },
    [ads_1.AdsPlatform.TIKTOK]: {
        clientId: process.env.TIKTOK_CLIENT_ID,
        clientSecret: process.env.TIKTOK_CLIENT_SECRET,
        redirectUri: `${clientUrl}/ads-auth/callback`,
        scopes: ['user.info.basic', 'user.info.profile', 'video.upload', 'video.publish'],
        authUrl: 'https://www.tiktok.com/v2/auth/authorize/',
        tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
        refreshUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
    },
    [ads_1.AdsPlatform.SNAPCHAT]: {
        clientId: process.env.PINTEREST_CLIENT_ID,
        clientSecret: process.env.PINTEREST_CLIENT_SECRET,
        redirectUri: `${clientUrl}/ads-auth/callback`,
        scopes: ['boards:write', 'pins:write', 'user_accounts:read'],
        authUrl: 'https://www.pinterest.com/oauth/',
        tokenUrl: 'https://api.pinterest.com/v5/oauth/token',
        refreshUrl: 'https://graph.instagram.com/refresh_access_token ',
    },
};
