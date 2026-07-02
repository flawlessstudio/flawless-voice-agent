import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';

type Scope = 'global' | 'repo';
type Decision = 'mark_done' | 'keep';
type Classification = 'verified_resolved' | 'verified_open' | 'unverifiable';

type Args = {
  scope: Scope;
  repo?: string;
  outDir: string;
  includeRead: boolean;
  apply: boolean;
  allowedOrg?: string;
  allowUnverifiableApply: boolean;
  maxRetries: number;
  retryDelayMs: number;
};

type RetryConfig = {
  maxRetries: number;
  retryDelayMs: number;
};

type NotificationSubject = {
  type?: string;
  title?: string;
  url?: string | null;
};

type NotificationThread = {
  id: string;
  unread: boolean;
  reason?: string;
  updated_at?: string;
  url?: string;
  repository?: { full_name?: string };
  subject?: NotificationSubject;
};

type Evaluation = {
  classification: Classification;
  decision: Decision;
  evidence: string;
  rawState?: string;
  rawStatus?: string;
};

type OutputRow = {
  thread_id: string;
  repository: string;
  unread: boolean;
  reason: string;
  updated_at: string;
  subject_type: string;
  subject_title: string;
  subject_url: string;
  classification: Classification;
  decision: Decision;
  evidence: string;
  raw_state: string;
  raw_status: string;
};

function parseArgs(argv: string[]): Args {
  let scope: Scope = 'global';
  let repo: string | undefined;
  let outDir: string | undefined;
  let includeRead = false;
  let apply = false;
  let allowedOrg: string | undefined;
  let allowUnverifiableApply = false;
  let maxRetries = 2;
  let retryDelayMs = 500;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--scope') {
      const value = argv[i + 1];
      if (!value || (value !== 'global' && value !== 'repo')) {
        throw new Error('Invalid --scope. Use global or repo.');
      }
      scope = value;
      i += 1;
      continue;
    }
    if (arg === '--repo') {
      repo = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === '--out-dir') {
      outDir = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === '--include-read') {
      includeRead = true;
      continue;
    }
    if (arg === '--apply') {
      apply = true;
      continue;
    }
    if (arg === '--allowed-org') {
      allowedOrg = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === '--allow-unverifiable-apply') {
      allowUnverifiableApply = true;
      continue;
    }
    if (arg === '--max-retries') {
      const value = Number(argv[i + 1]);
      if (!Number.isInteger(value) || value < 0) {
        throw new Error('Invalid --max-retries. Use integer >= 0.');
      }
      maxRetries = value;
      i += 1;
      continue;
    }
    if (arg === '--retry-delay-ms') {
      const value = Number(argv[i + 1]);
      if (!Number.isInteger(value) || value < 0) {
        throw new Error('Invalid --retry-delay-ms. Use integer >= 0.');
      }
      retryDelayMs = value;
      i += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (scope === 'repo' && !repo) {
    throw new Error('--repo is required when --scope repo is used.');
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const defaultOutDir = path.resolve('eval', 'notifications', stamp);

  return {
    scope,
    repo,
    outDir: path.resolve(outDir ?? defaultOutDir),
    includeRead,
    apply,
    allowedOrg,
    allowUnverifiableApply,
    maxRetries,
    retryDelayMs,
  };
}

function sleepMs(ms: number): void {
  if (ms <= 0) return;
  const sab = new SharedArrayBuffer(4);
  const arr = new Int32Array(sab);
  Atomics.wait(arr, 0, 0, ms);
}

function runGh(args: string[], retry?: RetryConfig): { ok: boolean; stdout: string; stderr: string } {
  const retries = retry?.maxRetries ?? 0;
  const retryDelay = retry?.retryDelayMs ?? 0;

  let lastStdout = '';
  let lastStderr = '';
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const cmd = spawnSync('gh', args, { encoding: 'utf8' });
    const ok = cmd.status === 0;
    const stdout = cmd.stdout ?? '';
    const stderr = cmd.stderr ?? '';
    if (ok) {
      return { ok: true, stdout, stderr };
    }
    lastStdout = stdout;
    lastStderr = stderr;
    if (attempt < retries) {
      sleepMs(retryDelay * Math.max(1, 2 ** attempt));
    }
  }

  return {
    ok: false,
    stdout: lastStdout,
    stderr: lastStderr,
  };
}

function runGhJson(args: string[], retry?: RetryConfig): unknown {
  const result = runGh(args, retry);
  if (!result.ok) {
    throw new Error(`gh ${args.join(' ')} failed: ${result.stderr || result.stdout}`);
  }
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(`Invalid JSON from gh ${args.join(' ')}: ${(error as Error).message}`);
  }
}

function listNotifications(args: Args): NotificationThread[] {
  const endpoint = args.scope === 'repo'
    ? `/repos/${args.repo}/notifications?all=${args.includeRead ? 'true' : 'false'}&per_page=50`
    : `/notifications?all=${args.includeRead ? 'true' : 'false'}&participating=false&per_page=50`;

  const retry = { maxRetries: args.maxRetries, retryDelayMs: args.retryDelayMs };
  const data = runGhJson(['api', '--paginate', endpoint, '--slurp'], retry);
  if (!Array.isArray(data)) {
    throw new Error('Unexpected notifications payload from GitHub API.');
  }

  const out: NotificationThread[] = [];
  for (const page of data) {
    if (!Array.isArray(page)) continue;
    for (const item of page) {
      out.push(item as NotificationThread);
    }
  }
  if (args.allowedOrg && args.scope === 'global') {
    return out.filter((item) => (item.repository?.full_name ?? '').startsWith(`${args.allowedOrg}/`));
  }
  return out;
}

function classifyCheckSuite(thread: NotificationThread, subjectData?: Record<string, unknown>): Evaluation {
  const reason = thread.reason ?? '';
  const rawStatus = String(subjectData?.status ?? '').toLowerCase();
  const rawConclusion = String(subjectData?.conclusion ?? '').toLowerCase();

  if (rawStatus === 'completed') {
    return {
      classification: 'verified_resolved',
      decision: 'mark_done',
      evidence: `checksuite:status=completed${rawConclusion ? `,conclusion=${rawConclusion}` : ''}`,
      rawStatus,
      rawState: rawConclusion,
    };
  }

  if (rawStatus === 'queued' || rawStatus === 'in_progress' || rawStatus === 'requested' || rawStatus === 'waiting') {
    return {
      classification: 'verified_open',
      decision: 'keep',
      evidence: `checksuite:status=${rawStatus}`,
      rawStatus,
    };
  }

  // GitHub docs define ci_activity as a completed workflow run notification.
  if (reason === 'ci_activity') {
    return {
      classification: 'verified_resolved',
      decision: 'mark_done',
      evidence: 'reason=ci_activity (GitHub docs: completed workflow run)',
      rawStatus,
      rawState: rawConclusion,
    };
  }

  return {
    classification: 'unverifiable',
    decision: 'keep',
    evidence: 'checksuite without conclusive terminal status',
    rawStatus,
    rawState: rawConclusion,
  };
}

function classifyGenericState(
  state: string,
  typeLabel: string,
  status?: string,
): Evaluation {
  const normalizedState = state.toLowerCase();
  const normalizedStatus = (status ?? '').toLowerCase();

  if (normalizedState === 'closed' || normalizedState === 'merged' || normalizedState === 'resolved') {
    return {
      classification: 'verified_resolved',
      decision: 'mark_done',
      evidence: `${typeLabel}:state=${normalizedState}`,
      rawState: normalizedState,
      rawStatus: normalizedStatus,
    };
  }

  if (normalizedState === 'open' || normalizedState === 'active' || normalizedState === 'pending') {
    return {
      classification: 'verified_open',
      decision: 'keep',
      evidence: `${typeLabel}:state=${normalizedState}`,
      rawState: normalizedState,
      rawStatus: normalizedStatus,
    };
  }

  if (normalizedStatus === 'completed' || normalizedStatus === 'success' || normalizedStatus === 'failure' || normalizedStatus === 'cancelled') {
    return {
      classification: 'verified_resolved',
      decision: 'mark_done',
      evidence: `${typeLabel}:status=${normalizedStatus}`,
      rawState: normalizedState,
      rawStatus: normalizedStatus,
    };
  }

  if (normalizedStatus === 'queued' || normalizedStatus === 'in_progress' || normalizedStatus === 'running') {
    return {
      classification: 'verified_open',
      decision: 'keep',
      evidence: `${typeLabel}:status=${normalizedStatus}`,
      rawState: normalizedState,
      rawStatus: normalizedStatus,
    };
  }

  return {
    classification: 'unverifiable',
    decision: 'keep',
    evidence: `${typeLabel}:state/status inconclusive`,
    rawState: normalizedState,
    rawStatus: normalizedStatus,
  };
}

function evaluateThread(
  thread: NotificationThread,
  subjectCache: Map<string, Record<string, unknown>>,
  retry: RetryConfig,
): Evaluation {
  const subject = thread.subject ?? {};
  const subjectType = subject.type ?? '';
  const subjectUrl = subject.url ?? null;

  if (subjectType === 'CheckSuite') {
    if (!subjectUrl) return classifyCheckSuite(thread);
    const cacheKey = `${subjectType}|${subjectUrl}`;
    if (!subjectCache.has(cacheKey)) {
      const data = runGhJson(['api', subjectUrl], retry) as Record<string, unknown>;
      subjectCache.set(cacheKey, data);
    }
    return classifyCheckSuite(thread, subjectCache.get(cacheKey));
  }

  if (!subjectUrl) {
    if (thread.reason === 'ci_activity') {
      return {
        classification: 'verified_resolved',
        decision: 'mark_done',
        evidence: 'reason=ci_activity (GitHub docs: completed workflow run)',
      };
    }
    return {
      classification: 'unverifiable',
      decision: 'keep',
      evidence: 'missing subject.url',
    };
  }

  const cacheKey = `${subjectType}|${subjectUrl}`;
  if (!subjectCache.has(cacheKey)) {
    const data = runGhJson(['api', subjectUrl], retry) as Record<string, unknown>;
    subjectCache.set(cacheKey, data);
  }
  const data = subjectCache.get(cacheKey) ?? {};

  if (subjectType === 'PullRequest') {
    const mergedAt = String(data.merged_at ?? '');
    if (mergedAt) {
      return {
        classification: 'verified_resolved',
        decision: 'mark_done',
        evidence: 'pr:merged_at present',
        rawState: 'merged',
      };
    }
  }

  const state = String(data.state ?? '');
  const status = String(data.status ?? '');
  return classifyGenericState(state, subjectType || 'subject', status);
}

function csvEscape(value: string): string {
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function writeCsv(filePath: string, rows: OutputRow[], columns: Array<keyof OutputRow>): void {
  const lines = [columns.join(',')];
  for (const row of rows) {
    const line = columns.map((column) => csvEscape(String(row[column] ?? ''))).join(',');
    lines.push(line);
  }
  fs.writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8');
}

function ageBucket(updatedAt: string): '0-2d' | '3-7d' | '8-30d' | '>30d' {
  const ts = Date.parse(updatedAt);
  if (Number.isNaN(ts)) return '>30d';
  const ageDays = (Date.now() - ts) / (1000 * 60 * 60 * 24);
  if (ageDays <= 2) return '0-2d';
  if (ageDays <= 7) return '3-7d';
  if (ageDays <= 30) return '8-30d';
  return '>30d';
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  fs.mkdirSync(args.outDir, { recursive: true });
  const retry = { maxRetries: args.maxRetries, retryDelayMs: args.retryDelayMs };

  const threads = listNotifications(args);
  const subjectCache = new Map<string, Record<string, unknown>>();
  const rows: OutputRow[] = [];

  for (const thread of threads) {
    const evaluation = evaluateThread(thread, subjectCache, retry);
    rows.push({
      thread_id: String(thread.id),
      repository: thread.repository?.full_name ?? '',
      unread: Boolean(thread.unread),
      reason: thread.reason ?? '',
      updated_at: thread.updated_at ?? '',
      subject_type: thread.subject?.type ?? '',
      subject_title: thread.subject?.title ?? '',
      subject_url: String(thread.subject?.url ?? ''),
      classification: evaluation.classification,
      decision: evaluation.decision,
      evidence: evaluation.evidence,
      raw_state: evaluation.rawState ?? '',
      raw_status: evaluation.rawStatus ?? '',
    });
  }

  const markedDone: string[] = [];
  const markErrors: Array<{ thread_id: string; error: string }> = [];
  const applyBlockedReason: string[] = [];
  const unverifiableCount = rows.filter((r) => r.classification === 'unverifiable').length;
  if (args.apply && !args.allowUnverifiableApply && unverifiableCount > 0) {
    applyBlockedReason.push(
      `apply blocked: ${unverifiableCount} unverifiable notifications detected; rerun with --allow-unverifiable-apply to override`,
    );
  }
  if (args.apply) {
    if (applyBlockedReason.length === 0) {
      for (const row of rows) {
        if (row.decision !== 'mark_done') continue;
        const result = runGh(['api', '-X', 'DELETE', `/notifications/threads/${row.thread_id}`, '--silent'], retry);
        if (result.ok) {
          markedDone.push(row.thread_id);
        } else {
          markErrors.push({
            thread_id: row.thread_id,
            error: (result.stderr || result.stdout).trim(),
          });
        }
      }
    }
  }

  const openOrUnverifiable = rows.filter((r) => r.decision === 'keep');
  const openByAge = openOrUnverifiable.reduce<Record<string, number>>((acc, row) => {
    const bucket = ageBucket(row.updated_at);
    acc[bucket] = (acc[bucket] ?? 0) + 1;
    return acc;
  }, {});
  const openByRepo = openOrUnverifiable.reduce<Record<string, number>>((acc, row) => {
    const repo = row.repository || '(unknown)';
    acc[repo] = (acc[repo] ?? 0) + 1;
    return acc;
  }, {});

  const summary = {
    scope: args.scope,
    repo: args.repo ?? null,
    include_read: args.includeRead,
    apply: args.apply,
    allowed_org: args.allowedOrg ?? null,
    retry: retry,
    allow_unverifiable_apply: args.allowUnverifiableApply,
    total_notifications: rows.length,
    unread_notifications: rows.filter((r) => r.unread).length,
    by_decision: {
      mark_done: rows.filter((r) => r.decision === 'mark_done').length,
      keep: rows.filter((r) => r.decision === 'keep').length,
    },
    by_classification: {
      verified_resolved: rows.filter((r) => r.classification === 'verified_resolved').length,
      verified_open: rows.filter((r) => r.classification === 'verified_open').length,
      unverifiable: rows.filter((r) => r.classification === 'unverifiable').length,
    },
    by_reason: rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.reason] = (acc[row.reason] ?? 0) + 1;
      return acc;
    }, {}),
    open_risk: {
      by_age_bucket: openByAge,
      by_repository: openByRepo,
    },
    apply_blocked: applyBlockedReason.length > 0,
    apply_blocked_reasons: applyBlockedReason,
    marked_done_count: markedDone.length,
    mark_errors_count: markErrors.length,
  };

  const report = {
    summary,
    marked_done_thread_ids: markedDone,
    mark_errors: markErrors,
    notifications: rows,
    open_or_unverifiable: openOrUnverifiable,
    done_candidates: rows.filter((r) => r.decision === 'mark_done'),
  };

  fs.writeFileSync(path.join(args.outDir, 'notifications_report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  writeCsv(
    path.join(args.outDir, 'open_or_unverifiable.csv'),
    report.open_or_unverifiable,
    [
      'thread_id',
      'repository',
      'unread',
      'reason',
      'updated_at',
      'subject_type',
      'subject_title',
      'subject_url',
      'classification',
      'decision',
      'evidence',
      'raw_state',
      'raw_status',
    ],
  );
  writeCsv(
    path.join(args.outDir, 'done_candidates.csv'),
    report.done_candidates,
    [
      'thread_id',
      'repository',
      'unread',
      'reason',
      'updated_at',
      'subject_type',
      'subject_title',
      'subject_url',
      'classification',
      'decision',
      'evidence',
      'raw_state',
      'raw_status',
    ],
  );

  console.info(JSON.stringify(summary, null, 2));
  console.info(`Report written to: ${args.outDir}`);
  if (applyBlockedReason.length > 0) {
    console.error(applyBlockedReason.join('\n'));
    process.exitCode = 2;
  }
}

main();
