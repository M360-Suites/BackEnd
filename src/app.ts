import express, { Request, Response } from 'express';
import fs, { readdirSync } from 'fs';
import path from 'path';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from 'dotenv';
import http from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import corsOptions from './config/cors';
import connectToDatabase from './config/db';
import pinoHttp from 'pino-http';
import { logger } from './logger/logger';
import { initMonitoring } from './monitoring/monitoring';
import { useSocket } from './Services/websocket';
import passport from 'passport';
import rateLimit from 'express-rate-limit';
import { resSender } from './Services/responseService';
import { startTrialExpirationJob } from './jobs/trialExpirationJob';
import { startGraceExpiredJob } from './jobs/graceExpiredJob';
import './config/passport/google';
import './config/passport/microsoft';

// Database Backup
import './Services/dbBackup';
import helmetConfig from './config/helmet';

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 5001;

// Create http server from app
const server = http.createServer(app);

// Initialize Socket.io
useSocket(server);
// SpeedInsights();

const httpLogger = pinoHttp({
  // logger: logger,
  autoLogging: true,
  serializers: {
    req: (req) => ({
      // method: req.method,
      // url: req.url,
      // headers: req.headers
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
});

// Initialize Sentry
initMonitoring(app);

// Middlewares
app.use(cors(corsOptions));
app.use(helmet(helmetConfig));
app.use(morgan('dev'));
app.use(httpLogger);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  session({
    secret: process.env.SITE_KEY!,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  }),
);
app.use(passport.initialize());
app.use(passport.session());

// Health check route
app.get('/api/health', (req, res) => {
  let timestamp = new Date().toISOString();
  resSender(res, 200, 'success', 'Health check route is working!', null, timestamp);
});

// Test route
app.get('/api', (req, res) => {
  return resSender(res, 200, 'success', 'Root Test route is working!');
});
app.get('/tiktok5JMKIPJ6j5e7Tqgw3TmMrG0vPL8Uz4mP.txt', (req, res) => {
  const filePath = path.join(__dirname, 'public/tiktok5JMKIPJ6j5e7Tqgw3TmMrG0vPL8Uz4mP.txt');
  res.sendFile(filePath);
});
app.get('/api/test', (req, res) => {
  return resSender(res, 200, 'success', 'Test route is working!');
});

app.get('/api/v1/docs', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'docs.html');
  res.sendFile(filePath);
});

// Api Routes

// console.log('Looking for routes in:', path.join(__dirname, 'Routes'));
// console.log('Found files:', readdirSync(path.join(__dirname, 'Routes')));
// Register routes dynamically from the 'Routes' directory
const routeFiles = readdirSync(path.join(__dirname, 'Routes'));
for (const file of routeFiles) {
  if (file.endsWith('.js') || (process.env.NODE_ENV === 'development' && file.endsWith('.ts'))) {
    const routePath = path.join(__dirname, 'Routes', file);
    /* eslint-disable @typescript-eslint/no-var-requires */
    const route = require(routePath).default;
    // console.log('Route 2: ', route);

    if (route) {
      app.use('/api', route);
      // console.log(`Registered routes from ${file}`);
    }

    // Log the routes that were registered
    if (route && route.stack) {
      // logger.info(`Routes in ${file}:`, route.stack.map((r: any) => r.route?.path).filter(Boolean));
    }
  }
}

// Catch unhandled routes
app.use((req, res, next) => {
  return resSender(res, 404, 'error', 'Route not found!');
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response) => {
  console.error(err.stack);
  console.error({ error: err }, 'Unhandled error');
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
  });
  return resSender(
    res,
    500,
    'error',
    `${process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message}`,
  );
});

// Ensure the temp directory exists
const tempDir = path.join(__dirname, '../temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Connect to DB & Start server
connectToDatabase()
  .then(() => {
    // Start cron jobs
    startTrialExpirationJob();
    startGraceExpiredJob();

    server.listen(PORT, () => {
      logger.info(`⚡️[server]: Server running on port http://localhost:${PORT}`);
      logger.info(`📚 API Docs available at http://localhost:${PORT}/api/v1/docs`);
    });
  })
  .catch((err) => {
    console.error('Error connecting to DB: ', err);
  });

server.on('error', (e: any) => {
  if (e.code === 'EADDRINUSE') {
    console.error('Address in use, retrying...');
    setTimeout(() => {
      server.close();
      server.listen(PORT);
    }, 2000);
  }
  // if (e.code === 'EADDRINUSE') {
  //   console.error('Address in use, retrying...');
  //   setTimeout(() => {
  //     server.close();
  //     server.listen(PORT);
  //   }, 2000);
  // }
});

// 07018608174

export default app;
