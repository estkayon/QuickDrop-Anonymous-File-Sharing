interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private limits = new Map<string, RateLimitEntry>();
  private cleanupInterval: number;

  private static readonly LIMITS: Record<string, { max: number; windowMs: number }> = {
    join: { max: 5, windowMs: 60_000 },
    create: { max: 10, windowMs: 60_000 },
  };

  constructor() {
    this.cleanupInterval = setInterval(() => this.cleanup(), 300_000);
  }

  checkLimit(ip: string, action: string): boolean {
    const config = RateLimiter.LIMITS[action];
    if (!config) return true;

    const key = `${ip}:${action}`;
    const now = Date.now();
    const entry = this.limits.get(key);

    if (!entry || now > entry.resetAt) {
      this.limits.set(key, { count: 1, resetAt: now + config.windowMs });
      return true;
    }

    if (entry.count >= config.max) {
      return false;
    }

    entry.count++;
    return true;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits) {
      if (now > entry.resetAt) {
        this.limits.delete(key);
      }
    }
  }
}