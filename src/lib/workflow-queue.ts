import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";

const REDIS_URL = process.env.UPSTASH_REDIS_URL ?? "redis://localhost:6379";

let connection: IORedis | null = null;

function getConnection(): IORedis {
  if (!connection) {
    connection = new IORedis(REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }
  return connection;
}

let workflowQueue: Queue | null = null;

export function getQueue(): Queue {
  if (!workflowQueue) {
    workflowQueue = new Queue("workflows", {
      connection: getConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    });
  }
  return workflowQueue;
}

export async function scheduleWorkflowJob(params: {
  workflowId: string;
  workspaceId: string;
  trigger: string;
  cron?: string;
}) {
  const queue = getQueue();
  if (params.cron) {
    await queue.upsertJobScheduler(
      `wf-${params.workflowId}`,
      { pattern: params.cron },
      {
        name: "run-workflow",
        data: { ...params },
        opts: { removeOnComplete: 10 },
      }
    );
  } else {
    await queue.add("run-workflow", params);
  }
}

export async function createWorker() {
  const worker = new Worker(
    "workflows",
    async (job) => {
      const { workflowId, workspaceId, trigger } = job.data as {
        workflowId: string;
        workspaceId: string;
        trigger: string;
      };

      const { executeWorkflow } = await import("@/lib/workflow-engine");
      const result = await executeWorkflow({
        workflowId,
        workspaceId,
        trigger: trigger ?? "schedule",
      });
      return result;
    },
    {
      connection: getConnection(),
      concurrency: 3,
    }
  );

  worker.on("completed", (job) => {
    console.log(`[workflow-queue] Job ${job.id} completed`);
  });
  worker.on("failed", (job, err) => {
    console.error(`[workflow-queue] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}