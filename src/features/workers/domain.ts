export class DuplicateWorkerError extends Error {
  constructor() {
    super("Worker username or email already exists.");
    this.name = "DuplicateWorkerError";
  }
}

export class WorkerNotFoundError extends Error {
  constructor() {
    super("Worker not found.");
    this.name = "WorkerNotFoundError";
  }
}
