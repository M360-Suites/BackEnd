"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getJobStatus = exports.schedulePost = exports.addBatchPostJobs = exports.addPostJob = void 0;
const bull_1 = __importDefault(require("bull"));
const postService_1 = require("./Posting/postService");
let postQueue;
const getPostQueue = () => {
    if (!postQueue) {
        postQueue = new bull_1.default("post_queue", {
            redis: {
                host: process.env.REDIS_HOST || "localhost",
                port: parseInt(process.env.REDIS_PORT || "6379"),
            },
        });
        setupJobProcessors();
    }
    return postQueue;
};
const setupJobProcessors = () => {
    let queue = getPostQueue();
    queue.process("post", async (job) => {
        const { userId, platform, content } = job.data;
        try {
            const result = await (0, postService_1.post)(userId, platform, content);
            if (!result.success) {
                throw new Error(result.error);
            }
            return result;
        }
        catch (error) {
            console.error(`Failed to post to ${platform} for user ${userId}:`, error);
            throw error;
        }
    });
    // Monitoring job queues
    queue.on("waiting", (jobId) => {
        console.log(`Job ${jobId} is waiting`);
    });
    queue.on("active", (job) => {
        console.log(`Job ${job.id} is now active`);
    });
    // Handle failed jobs
    queue.on("failed", (job, err) => {
        console.error(`Job ${job.id} failed:`, err);
    });
    // Handle completed jobs
    queue.on("completed", (job, result) => {
        console.log(`Job ${job.id} completed successfully:`, result);
    });
};
const addPostJob = (userId, platform, content, delay = 0) => {
    let queue = getPostQueue();
    return queue.add("post", { userId, platform, content }, {
        delay,
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 2000,
        },
    });
};
exports.addPostJob = addPostJob;
const addBatchPostJobs = (userId, platforms, content, delay = 0) => {
    const queue = getPostQueue();
    return Promise.all(platforms.map((platform) => queue.add("post", { userId, platform, content }, {
        delay,
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
    })));
};
exports.addBatchPostJobs = addBatchPostJobs;
const schedulePost = (userId, platform, content, scheduledAt) => {
    const delay = scheduledAt.getTime() - Date.now();
    if (delay <= 0) {
        throw new Error("Scheduled time must be in the future");
    }
    return (0, exports.addPostJob)(userId, platform, content, delay);
};
exports.schedulePost = schedulePost;
const getJobStatus = async (jobId) => {
    try {
        let queue = getPostQueue();
        const job = await queue.getJob(jobId);
        if (!job) {
            return null;
        }
        return {
            id: job.id,
            data: job.data,
            progress: job.progress(),
            failedReason: job.failedReason,
            finishedOn: job.finishedOn,
            processedOn: job.processedOn,
        };
    }
    catch (error) {
        throw new Error(error.message || "");
    }
};
exports.getJobStatus = getJobStatus;
