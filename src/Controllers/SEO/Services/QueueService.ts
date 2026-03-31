import Queue from 'bull';
import Redis from 'ioredis';

export class QueueService {
  private redis: Redis;
  private queues: Map<string, Queue.Queue> = new Map();

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.initializeQueues();
  }

  private initializeQueues() {
    // Define different queues for different job types
    const queueConfigs = [
      { name: 'seo-audit', concurrency: 3 },
      { name: 'backlink-scan', concurrency: 2 },
      { name: 'keyword-tracking', concurrency: 5 },
      { name: 'traffic-sync', concurrency: 2 },
      { name: 'report-generation', concurrency: 1 }
    ];

    queueConfigs.forEach(config => {
      const queue = new Queue(config.name, {
        redis: process.env.REDIS_URL || 'redis://localhost:6379',
        defaultJobOptions: {
          removeOnComplete: 50, // Keep last 50 completed jobs
          removeOnFail: 100,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000
          }
        }
      });

      this.queues.set(config.name, queue);
    });
  }

  async addJob(
    queueName: string,
    jobData: any,
    options: Queue.JobOptions = {}
  ): Promise<Queue.Job> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    return queue.add(jobData, options);
  }

  async getJobStatus(queueName: string, jobId: string): Promise<any> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      return { status: 'not_found' };
    }

    const state = await job.getState();
    const progress = job.progress();
    
    return {
      id: job.id,
      status: state,
      progress,
      data: job.data,
      failedReason: job.failedReason,
      stacktrace: job.stacktrace,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn
    };
  }

  async cancelJob(queueName: string, jobId: string): Promise<boolean> {
    const queue = this.queues.get(queueName);
    if (!queue) return false;

    const job = await queue.getJob(jobId);
    if (job) {
      await job.remove();
      return true;
    }
    return false;
  }

  async cleanupQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) return;

    // Clean old jobs
    await queue.clean(1000, 'completed');
    await queue.clean(1000, 'failed');
  }

  // Worker setup methods
  setupAuditWorker(processor: (job: Queue.Job) => Promise<any>) {
    const queue = this.queues.get('seo-audit');
    if (queue) {
      queue.process(3, processor); // 3 concurrent audits
    }
  }

  setupBacklinkWorker(processor: (job: Queue.Job) => Promise<any>) {
    const queue = this.queues.get('backlink-scan');
    if (queue) {
      queue.process(2, processor); // 2 concurrent backlink scans
    }
  }

  setupKeywordWorker(processor: (job: Queue.Job) => Promise<any>) {
    const queue = this.queues.get('keyword-tracking');
    if (queue) {
      queue.process(5, processor); // 5 concurrent keyword checks
    }
  }

  async getQueueStats(): Promise<any> {
    const stats: any = {};
    
    for (const [name, queue] of this.queues) {
      const counts = await queue.getJobCounts();
      stats[name] = counts;
    }
    
    return stats;
  }
}