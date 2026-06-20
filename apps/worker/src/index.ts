import { Job, ExampleNotificationJob } from './jobQueue';

console.log('Worker skeleton started.');

// Mock processor
async function startWorker() {
  const handler = new ExampleNotificationJob();
  const dummyJob: Job = {
    id: 'job-123',
    type: 'notification',
    payload: { message: 'Hello from CoClerk foundational worker' },
    status: 'queued'
  };

  await handler.handle(dummyJob);
}

startWorker().catch(console.error);
