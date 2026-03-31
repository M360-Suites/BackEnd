import Bull from "bull";
import { PostContent, SocialPlatform } from "../../Types/types";
import { post } from "./Posting/postService";

interface PostJob {
  userId: string;
  platform: SocialPlatform;
  content: PostContent;
}

let postQueue: Bull.Queue;

const getPostQueue = () => {
  if (!postQueue) {
    postQueue = new Bull("post_queue", {
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
    const { userId, platform, content }: PostJob = job.data;

    try {
      const result = await post(userId, platform, content);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result;
    } catch (error) {
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

export const addPostJob = (
  userId: string,
  platform: SocialPlatform,
  content: PostContent,
  delay = 0
): Promise<Bull.Job> => {
  let queue = getPostQueue();
  return queue.add(
    "post",
    { userId, platform, content },
    {
      delay,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
    }
  );
};

export const addBatchPostJobs = (
  userId: string,
  platforms: SocialPlatform[],
  content: PostContent,
  delay = 0
): Promise<Bull.Job[]> => {
  const queue = getPostQueue();
  return Promise.all(
    platforms.map((platform) =>
      queue.add(
        "post",
        { userId, platform, content },
        {
          delay,
          attempts: 3,
          backoff: { type: "exponential", delay: 2000 },
        }
      )
    )
  );
};

export const schedulePost = (
  userId: string,
  platform: SocialPlatform,
  content: PostContent,
  scheduledAt: Date
): Promise<Bull.Job> => {
  const delay = scheduledAt.getTime() - Date.now();

  if (delay <= 0) {
    throw new Error("Scheduled time must be in the future");
  }

  return addPostJob(userId, platform, content, delay);
};

export const getJobStatus = async (jobId: string): Promise<any> => {
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
  } catch (error: any) {
    throw new Error(error.message || "");
  }
};
