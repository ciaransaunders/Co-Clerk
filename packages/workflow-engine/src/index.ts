export interface WorkflowContext {
  matterId?: string;
  userId: string;
}

export interface WorkflowEngine {
  startWorkflow(key: string, context: WorkflowContext): Promise<string>;
  resumeWorkflow(runId: string, stepKey: string, output: any): Promise<void>;
}

export class BasicWorkflowEngine implements WorkflowEngine {
  async startWorkflow(key: string, context: WorkflowContext): Promise<string> {
    const runId = crypto.randomUUID();
    console.log(`[WorkflowEngine] Started ${key} workflow with run ID ${runId}`);
    return runId;
  }

  async resumeWorkflow(runId: string, stepKey: string, output: any): Promise<void> {
    console.log(`[WorkflowEngine] Resumed run ${runId} at step ${stepKey}`);
  }
}
