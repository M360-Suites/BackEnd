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
const express_1 = __importDefault(require("express"));
const fs_1 = __importStar(require("fs"));
const path_1 = __importDefault(require("path"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = require("dotenv");
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const cors_2 = __importDefault(require("./config/cors"));
const db_1 = __importDefault(require("./config/db"));
const pino_http_1 = __importDefault(require("pino-http"));
const logger_1 = require("./logger/logger");
const monitoring_1 = require("./monitoring/monitoring");
const websocket_1 = require("./Services/websocket");
const passport_1 = __importDefault(require("passport"));
const responseService_1 = require("./Services/responseService");
const express_session_1 = __importDefault(require("express-session"));
const trialExpirationJob_1 = require("./jobs/trialExpirationJob");
const graceExpiredJob_1 = require("./jobs/graceExpiredJob");
require("./config/passport/google");
require("./config/passport/microsoft");
// Database Backup
require("./Services/dbBackup");
// Load environment variables
(0, dotenv_1.config)();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5001;
// Create http server from app
const server = http_1.default.createServer(app);
// Initialize Socket.io
(0, websocket_1.useSocket)(server);
// SpeedInsights();
const httpLogger = (0, pino_http_1.default)({
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
(0, monitoring_1.initMonitoring)(app);
// Middlewares
app.use((0, cors_1.default)(cors_2.default));
app.use((0, helmet_1.default)());
app.use((0, morgan_1.default)('dev'));
app.use(httpLogger);
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, express_session_1.default)({
    secret: process.env.SITE_KEY,
    resave: false,
    saveUninitialized: true,
}));
app.use(passport_1.default.initialize());
app.use(passport_1.default.session());
// Health check route
app.get('/health', (req, res) => {
    let timestamp = new Date().toISOString();
    (0, responseService_1.resSender)(res, 200, 'success', 'Health check route is working!', null, timestamp);
});
// Test route
app.get('/', (req, res) => {
    return (0, responseService_1.resSender)(res, 200, 'success', 'Root Test route is working!');
});
app.get('/tiktok5JMKIPJ6j5e7Tqgw3TmMrG0vPL8Uz4mP.txt', (req, res) => {
    const filePath = path_1.default.join(__dirname, 'public/tiktok5JMKIPJ6j5e7Tqgw3TmMrG0vPL8Uz4mP.txt');
    res.sendFile(filePath);
});
app.get('/api/test', (req, res) => {
    return (0, responseService_1.resSender)(res, 200, 'success', 'Test route is working!');
});
// Api Routes
// console.log('Looking for routes in:', path.join(__dirname, 'Routes'));
// console.log('Found files:', readdirSync(path.join(__dirname, 'Routes')));
// Register routes dynamically from the 'Routes' directory
const routeFiles = (0, fs_1.readdirSync)(path_1.default.join(__dirname, 'Routes'));
for (const file of routeFiles) {
    if (file.endsWith('.js') || (process.env.NODE_ENV === 'development' && file.endsWith('.ts'))) {
        const routePath = path_1.default.join(__dirname, 'Routes', file);
        /* eslint-disable @typescript-eslint/no-var-requires */
        const route = require(routePath).default;
        // console.log('Route 2: ', route);
        if (route) {
            app.use('/api', route);
            // console.log(`Registered routes from ${file}`);
        }
        // Log the routes that were registered
        if (route && route.stack) {
            logger_1.logger.info(`Routes in ${file}:`, route.stack.map((r) => r.route?.path).filter(Boolean));
        }
    }
}
// Catch unhandled routes
app.use((req, res, next) => {
    return (0, responseService_1.resSender)(res, 404, 'error', 'Route not found!');
});
// Error handling middleware
app.use((err, req, res) => {
    console.error(err.stack);
    console.error({ error: err }, 'Unhandled error');
    res.status(500).json({
        error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
    });
    return (0, responseService_1.resSender)(res, 500, 'error', `${process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message}`);
});
// Ensure the temp directory exists
const tempDir = path_1.default.join(__dirname, '../temp');
if (!fs_1.default.existsSync(tempDir)) {
    fs_1.default.mkdirSync(tempDir, { recursive: true });
}
// Connect to DB & Start server
(0, db_1.default)()
    .then(() => {
    // Start cron jobs
    (0, trialExpirationJob_1.startTrialExpirationJob)();
    (0, graceExpiredJob_1.startGraceExpiredJob)();
    server.listen(PORT, () => {
        logger_1.logger.info(`Server running on port ${PORT}`);
    });
})
    .catch((err) => {
    console.error('Error connecting to DB: ', err);
});
server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
        console.error('Address in use, retrying...');
        setTimeout(() => {
            server.close();
            server.listen(PORT);
        }, 2000);
    }
    if (e.code === 'EADDRINUSE') {
        console.error('Address in use, retrying...');
        setTimeout(() => {
            server.close();
            server.listen(PORT);
        }, 2000);
    }
});
// 07018608174
exports.default = app;
