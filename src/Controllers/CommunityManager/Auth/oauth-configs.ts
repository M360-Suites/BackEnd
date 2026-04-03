import { ComOAuthConfig, ComPlatform } from '../../../Types/types';

let server =
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:5001/api'
    : 'https://m360-wn9s.onrender.com/api';
let clientUrl = process.env.CLIENT_URL!;
let liveClientUrl = process.env.LIVE_CLIENT_URL!;

export const COM_CONFIGS: Record<ComPlatform, ComOAuthConfig> = {
  [ComPlatform.FACEBOOK]: {
    clientId: process.env.FACEBOOK_CLIENT_ID!,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    redirectUri: `${clientUrl}/comm-auth/callback`,
    scopes: [
      // "groups_manage",
      'pages_manage_posts',
      'pages_read_engagement',
      // "groups_access_member_info",
      'publish_video',
      'pages_show_list',
    ],
    authUrl: 'https://www.facebook.com/v23.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v23.0/oauth/access_token',
    lastingTokenUrl: 'https://graph.facebook.com/v23.0/oauth/access_token',
    refreshUrl: 'https://graph.facebook.com/v23.0/oauth/access_token',
  },
  [ComPlatform.INSTAGRAM]: {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri: `${clientUrl}/comm-auth/callback`,
    scopes: ['https://www.googleapis.com/auth/adwords', 'profile'],
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    lastingTokenUrl: 'https://oauth2.googleapis.com/token',
    refreshUrl: 'https://oauth2.googleapis.com/token',
  },
  [ComPlatform.LINKEDIN]: {
    clientId: process.env.LINKEDIN_CLIENT_ID_2!,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET_2!,
    redirectUri: `${clientUrl}/comm-auth/callback`,
    scopes: ['rw_organization', 'profile', 'email', 'openid'],
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.lin  kedin.com/oauth/v2/accessToken',
    lastingTokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    refreshUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
  },
  [ComPlatform.WHATSAPP]: {
    clientId: process.env.META_WHATSAPP_CLIENT_ID!,
    clientSecret: process.env.META_WHATSAPP_CLIENT_SECRET!,
    redirectUri: `${clientUrl}/comm-auth/callback`,
    scopes: ['whatsapp_business_management', 'whatsapp_business_messaging', 'business_management'],
    authUrl: 'https://www.facebook.com/v23.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v23.0/oauth/access_token',
    lastingTokenUrl: 'https://graph.facebook.com/v23.0/oauth/access_token',
    refreshUrl: 'https://graph.facebook.com/v23.0/oauth/access_token',
  },
  [ComPlatform.TELEGRAM]: {
    clientId: process.env.TELEGRAM_BOT_TOKEN!, // Bot token acts as client ID
    clientSecret: '', // Telegram doesn't use client secret
    redirectUri: `${clientUrl}/comm-auth/callback`,
    scopes: [],
    authUrl: 'https://oauth.telegram.org/auth',
    tokenUrl: '', // Telegram uses bot tokens directly
    lastingTokenUrl: '',
    refreshUrl: '',
  },
  [ComPlatform.TWITTER]: {
    clientId: process.env.TELEGRAM_BOT_TOKEN!, // Bot token acts as client ID
    clientSecret: '', // Telegram doesn't use client secret
    redirectUri: `${clientUrl}/comm-auth/callback`,
    scopes: [],
    authUrl: 'https://oauth.telegram.org/auth',
    tokenUrl: '', // Telegram uses bot tokens directly
    lastingTokenUrl: '',
    refreshUrl: '',
  },
  [ComPlatform.DISCORD]: {
    clientId: process.env.DISCORD_CLIENT_ID!,
    clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    redirectUri: `${clientUrl}/comm-auth/callback`,
    scopes: ['identify', 'guilds', 'guilds.members.read', 'bot'],
    authUrl: 'https://discord.com/api/oauth2/authorize',
    tokenUrl: 'https://discord.com/api/oauth2/token',
    lastingTokenUrl: 'https://discord.com/api/oauth2/token',
    refreshUrl: 'https://discord.com/api/oauth2/token',
  },
  [ComPlatform.SLACK]: {
    clientId: process.env.SLACK_CLIENT_ID!,
    clientSecret: process.env.SLACK_CLIENT_SECRET!,
    redirectUri: `${clientUrl}/comm-auth/callback`,
    scopes: [
      'channels:read',
      'channels:write',
      'chat:write',
      'groups:read',
      'groups:write',
      'users:read',
      'users.profile:read',
    ],
    authUrl: 'https://slack.com/oauth/v2/authorize',
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    lastingTokenUrl: 'https://slack.com/api/oauth.v2.access',
    refreshUrl: 'https://slack.com/api/oauth.v2.access',
  },
};
