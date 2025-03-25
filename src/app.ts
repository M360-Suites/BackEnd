import express, {Request, Response} from 'express';
import { readdirSync } from 'fs';
import path from 'path';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from 'dotenv';
import http from 'http';
import cors from 'cors';
import corsOptions from './config/cors';
import connectToDatabase from './config/db';

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 6000;
const server = http.createServer(app);

// Middleware
app.use(cors(corsOptions));
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString() 
  });
});

// Test route
app.get('/api/test', (req, res) => {
  res.status(200).json({ message: 'Test route is working!' });
});

// Api Routes
(async (): Promise<void> => {
  const routeFiles = readdirSync(path.join(__dirname, 'Routes'));
  for (const file of routeFiles) {
    if (file.endsWith('.js') || (process.env.NODE_ENV === 'development' && file.endsWith('.ts'))) {
      const route = await import(`./Routes/${file}`);
      app.use('/api', route.default || route);
    }
  }
})();

// Error handling middleware
app.use((err: Error, req: Request, res: Response) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
  });
});

// Connect to DB & Start server
connectToDatabase().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch((err) => {
  console.log('Error connecting to DB: ', err);
})


export default app;