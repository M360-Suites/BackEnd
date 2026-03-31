import { OAuthConfig, SocialPlatform } from '../../../Types/types';

let server =
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:5001/api'
    : 'https://m360-wn9s.onrender.com/api';

let clientUrl = process.env.CLIENT_URL!;

export const OAUTH_CONFIGS: Record<SocialPlatform, OAuthConfig> = {
  [SocialPlatform.FACEBOOK]: {
    clientId: process.env.FACEBOOK_CLIENT_ID!,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    redirectUri: `${clientUrl}/auth/callback`,
    scopes: [
      'pages_manage_posts',
      'pages_read_engagement',
      // "instagram_basic",
      // "instagram_content_publish",
      'pages_show_list',
    ],
    authUrl: 'https://www.facebook.com/v23.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v23.0/oauth/access_token',
    lastingTokenUrl: 'https://graph.instagram.com/access_token',
    refreshUrl: 'https://graph.instagram.com/refresh_access_token ',
  },
  [SocialPlatform.INSTAGRAM]: {
    clientId: process.env.INSTAGRAM_CLIENT_ID!,
    clientSecret: process.env.INSTAGRAM_CLIENT_SECRET!,
    redirectUri: `${clientUrl}/auth/callback`,
    scopes: ['instagram_business_basic', 'instagram_business_content_publish'],
    authUrl: 'https://www.instagram.com/oauth/authorize',
    tokenUrl: 'https://api.instagram.com/oauth/access_token',
    lastingTokenUrl: 'https://graph.instagram.com/access_token',
    refreshUrl: 'https://graph.instagram.com/refresh_access_token ',
  },
  [SocialPlatform.TWITTER]: {
    clientId: process.env.TWITTER_CLIENT_ID!,
    clientSecret: process.env.TWITTER_CLIENT_SECRET!,
    redirectUri: `${clientUrl}/auth/callback`,
    scopes: ['tweet.write', 'tweet.read', 'users.read', 'offline.access', 'media.write'],
    authUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    lastingTokenUrl: 'https://graph.instagram.com/access_token',
    refreshUrl: 'https://graph.instagram.com/refresh_access_token ',
  },
  [SocialPlatform.YOUTUBE]: {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri: `${clientUrl}/auth/callback`,
    scopes: [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.force-ssl',
      'profile',
      'email',
    ],
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    lastingTokenUrl: 'https://graph.instagram.com/access_token',
    refreshUrl: 'https://graph.instagram.com/refresh_access_token ',
  },
  [SocialPlatform.LINKEDIN]: {
    clientId: process.env.LINKEDIN_CLIENT_ID!,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
    redirectUri: `https://m360-wn9s.onrender.com/api/auth/callback`,
    scopes: ['w_member_social', 'email', 'profile', 'openid'],
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    lastingTokenUrl: 'https://graph.instagram.com/access_token',
    refreshUrl: 'https://graph.instagram.com/refresh_access_token ',
  },
  [SocialPlatform.TIKTOK]: {
    clientId: process.env.TIKTOK_CLIENT_ID!,
    clientSecret: process.env.TIKTOK_CLIENT_SECRET!,
    redirectUri: `${server}/oauth/callback`,
    scopes: ['user.info.basic', 'user.info.profile', 'video.upload', 'video.publish'],
    authUrl: 'https://www.tiktok.com/v2/auth/authorize/',
    tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
    lastingTokenUrl: 'https://graph.instagram.com/access_token',
    refreshUrl: 'https://graph.instagram.com/refresh_access_token ',
  },
  [SocialPlatform.PINTEREST]: {
    clientId: process.env.PINTEREST_CLIENT_ID!,
    clientSecret: process.env.PINTEREST_CLIENT_SECRET!,
    redirectUri: `https://m360-wn9s.onrender.com/api/auth/callback`,
    scopes: ['boards:write', 'pins:write', 'user_accounts:read'],
    authUrl: 'https://www.pinterest.com/oauth/',
    tokenUrl: 'https://api.pinterest.com/v5/oauth/token',
    lastingTokenUrl: 'https://graph.instagram.com/access_token',
    refreshUrl: 'https://graph.instagram.com/refresh_access_token ',
  },
};
