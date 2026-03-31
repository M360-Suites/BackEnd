import rateLimit from "express-rate-limit";

export const createRateLimiter = (windowMs: number, max: number) => {
  return rateLimit({
    windowMs,
    max,
    message: "Too many requests from this IP, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Rate limiters for different endpoints
export const authRateLimit = createRateLimiter(15 * 60 * 1000, 10); // 10 requests per 15 minutes
export const postRateLimit = createRateLimiter(60 * 1000, 30); // 30 requests per minute
