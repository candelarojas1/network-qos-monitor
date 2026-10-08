import { computeStats, type PingStats } from './stats';
import { probeTcp } from './tcp-probe';

export const PROBES_PER_HOST = 10;

export type HostResult = { host: string; stats: PingStats };

// Sondas de a una (no en paralelo) para que no compitan entre sí ni con la UI.
export async function pingHost(host: string, port = 443, count = PROBES_PER_HOST): Promise<HostResult> {
  const samples: (number | null)[] = [];
  for (let i = 0; i < count; i++) {
    samples.push(await probeTcp(host, port));
  }
  return { host, stats: computeStats(samples) };
}

export async function pingHosts(hosts: string[]): Promise<HostResult[]> {
  const results: HostResult[] = [];
  for (const host of hosts) {
    results.push(await pingHost(host));
  }
  return results;
}
