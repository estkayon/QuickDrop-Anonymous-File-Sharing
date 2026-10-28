interface RateEntry {
  count: number;
  resetAt: number;
}

const limits = new Map<string, RateEntry>();

const CONFIG = {
  joinAttempts: { max: 5, windowMs: 60_000 },
  roomCreation: { max: 10, windowMs: 60_000 },
};

export function checkRate(
  ip: string,
  action: "joinAttempts" | "roomCreation",
): boolean {
  const key = `${action}:${ip}`;
  const config = CONFIG[action];
  const now = Date.now();

  const entry = limits.get(key);

  if (!entry || now > entry.resetAt) {
    limits.set(key, { count: 1, resetAt: now + config.windowMs });
    return true;
  }

  if (entry.count >= config.max) {
    return false;
  }

  entry.count++;
  return true;
}

// cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of limits) {
    if (now > entry.resetAt) {
      limits.delete(key);
    }
  }
}, 300_000);