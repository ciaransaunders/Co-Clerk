export interface Job {
  id: string;
  type: string;
  payload: any;
  status: 'queued' | 'processing' | 'completed' | 'failed';
}

export abstract class JobHandler {
  abstract handle(job: Job): Promise<void>;
}

export class ExampleNotificationJob extends JobHandler {
  async handle(job: Job): Promise<void> {
    console.log(`[Worker] Processing notification job ${job.id}`, job.payload);
    // Real implementation would send a WhatsApp/Email here
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log(`[Worker] Finished notification job ${job.id}`);
  }
}
