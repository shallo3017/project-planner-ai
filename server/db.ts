import dns from 'node:dns';
import mongoose from 'mongoose';
import { env } from './env';

let lookupPatched = false;

/**
 * Route DNS for Atlas hosts through the configured public resolvers.
 *
 * `dns.setServers()` alone is not enough: it only affects `dns.resolve*()` (the
 * SRV lookup a `mongodb+srv://` URI does). The driver's actual socket connections
 * go through `dns.lookup()` → getaddrinfo → the **OS** resolver, which ignores
 * setServers(). So on a network whose DNS can't resolve `*.mongodb.net` (some
 * ISP/router resolvers fail on Atlas's CNAME chain) you still get ENOTFOUND.
 *
 * We therefore also override `lookup()` — but only for `*.mongodb.net`, falling
 * back to the OS resolver for that host on failure and for every other hostname,
 * so nothing else in the process is affected.
 */
function applyDnsOverride(): void {
  const servers = env.DNS_SERVERS.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (servers.length === 0) return;

  dns.setServers(servers);

  if (lookupPatched) return;
  lookupPatched = true;

  const resolver = new dns.Resolver();
  resolver.setServers(servers);
  const osLookup = dns.lookup as unknown as LookupFn;

  const lookup: LookupFn = (hostname, options, callback) => {
    const cb = (typeof options === 'function' ? options : callback) as LookupCallback;
    const opts = (typeof options === 'function' ? {} : options) as dns.LookupOptions;

    if (!/\.mongodb\.net$/i.test(hostname)) return osLookup(hostname, opts, cb);

    resolver.resolve4(hostname, (err, addresses) => {
      if (err || addresses.length === 0) return osLookup(hostname, opts, cb);
      if (opts?.all) cb(null, addresses.map((address) => ({ address, family: 4 })));
      else cb(null, addresses[0], 4);
    });
  };

  (dns as unknown as { lookup: LookupFn }).lookup = lookup;
}

type LookupCallback = (
  err: NodeJS.ErrnoException | null,
  address?: string | dns.LookupAddress[],
  family?: number,
) => void;
type LookupFn = (
  hostname: string,
  options: dns.LookupOptions | LookupCallback,
  callback?: LookupCallback,
) => void;

/**
 * Serverless-safe Mongoose connection. Each warm function instance reuses one
 * connection across invocations (cached on the global object) instead of
 * opening a new one per request — which would exhaust the DB's connection pool.
 */
type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };

const globalForMongoose = globalThis as unknown as { _mongoose?: Cache };
const cache: Cache = globalForMongoose._mongoose ?? { conn: null, promise: null };
globalForMongoose._mongoose = cache;

let seeded = false;

export async function connectDB(): Promise<typeof mongoose> {
  if (!env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not set — cannot connect to MongoDB');
  }
  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    applyDnsOverride();
    mongoose.set('strictQuery', true);
    // Clear the cached promise on failure so the next request can retry
    // (otherwise a single failed connect would poison all future requests).
    cache.promise = mongoose.connect(env.MONGODB_URI, { bufferCommands: false }).catch((err) => {
      cache.promise = null;
      throw err;
    });
  }
  cache.conn = await cache.promise;

  // Optionally seed demo data once per cold start (dev only).
  if (!seeded && env.NODE_ENV !== 'production' && env.SEED_DEMO === 'true') {
    seeded = true;
    try {
      const { seedDemoData } = await import('./services/seed.service');
      await seedDemoData();
    } catch (err) {
      console.error('⚠️  Demo seed failed:', err);
    }
  }

  return cache.conn;
}
