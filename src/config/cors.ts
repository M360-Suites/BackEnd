import { CorsOptions } from 'cors';

const allowedOrigins: any = [];

const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
        if(!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    
}

export default corsOptions;