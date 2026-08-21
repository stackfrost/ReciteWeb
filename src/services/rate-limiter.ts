export class ProviderRateLimiter {
  private readonly maxRPM: number;
  private readonly maxTPM: number;
  private requestTimestamps: number[] = [];
  private requestTokens: { time: number; tokens: number }[] = [];
  private currentTokensInWindow: number = 0;
  private lockQueue: Promise<void> = Promise.resolve();
  private readonly windowMs: number = 60_000;

  constructor(maxRPM: number, maxTPM: number) {
    this.maxRPM = maxRPM;
    this.maxTPM = maxTPM;
  }

  private cleanWindow(now: number) {
    const cutoff = now - this.windowMs;

    while (this.requestTimestamps.length > 0 && this.requestTimestamps[0] <= cutoff) {
      this.requestTimestamps.shift();
    }

    while (this.requestTokens.length > 0 && this.requestTokens[0].time <= cutoff) {
      const removed = this.requestTokens.shift();
      if (removed) {
        this.currentTokensInWindow -= removed.tokens;
      }
    }
  }

  private async wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Acquires capacity for a request with `estimatedTokens`.
   * Enqueues the request strictly to prevent race conditions.
   * Awaits until the RPM or TPM sliding window has enough capacity.
   */
  public async acquire(estimatedTokens: number): Promise<void> {
    const acquirePromise = this.lockQueue.then(async () => {
      let now = Date.now();
      this.cleanWindow(now);

      while (
        this.requestTimestamps.length >= this.maxRPM ||
        this.currentTokensInWindow + estimatedTokens > this.maxTPM
      ) {
        const nextRpmClear =
          this.requestTimestamps.length >= this.maxRPM
            ? this.requestTimestamps[0] + this.windowMs - now
            : Infinity;

        let nextTpmClear = Infinity;
        if (this.currentTokensInWindow + estimatedTokens > this.maxTPM) {
          const tokensToClear = this.currentTokensInWindow + estimatedTokens - this.maxTPM;
          let tempTokens = 0;
          for (const rt of this.requestTokens) {
            tempTokens += rt.tokens;
            if (tempTokens >= tokensToClear) {
              nextTpmClear = rt.time + this.windowMs - now;
              break;
            }
          }
        }

        const waitMs = Math.max(0, Math.min(nextRpmClear, nextTpmClear));
        if (waitMs === Infinity) {
          await this.wait(1000);
        } else {
          await this.wait(waitMs + 10); // add 10ms buffer to ensure timestamp clears
        }

        now = Date.now();
        this.cleanWindow(now);
      }

      this.requestTimestamps.push(now);
      this.requestTokens.push({ time: now, tokens: estimatedTokens });
      this.currentTokensInWindow += estimatedTokens;
    });

    this.lockQueue = acquirePromise;
    return acquirePromise;
  }

  public getCurrentTokens(): number {
    this.cleanWindow(Date.now());
    return this.currentTokensInWindow;
  }
}
