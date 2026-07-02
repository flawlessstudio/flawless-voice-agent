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
  };
}

function runGh(args: string[]): { ok: boolean; stdout: string; stderr: string } {
  const cmd = spawnSync('gh', args, { encoding: 'utf8' });
  return {
    ok: cmd.status === 0,
    stdout: cmd.stdout ?? '',
    stderr: cmd.stderr ?? '',
  };
}

function runGhJson(args: string[]): unknown {
  const result = runGh(args);
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

  const data = runGhJson(['api', '--paginate', endpoint, '--slurp']);
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
): Evaluation {
  const subject = thread.subject ?? {};
  const subjectType = subject.type ?? '';
  const subjectUrl = subject.url ?? null;

  if (subjectType === 'CheckSuite') {
    if (!subjectUrl) return classifyCheckSuite(thread);
    const cacheKey = `${subjectType}|${subjectUrl}`;
    if (!subjectCache.has(cacheKey)) {
      const data = runGhJson(['api', subjectUrl]) as Record<string, unknown>;
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
    const data = runGhJson(['api', subjectUrl]) as Record<string, unknown>;
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

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  fs.mkdirSync(args.outDir, { recursive: true });

  const threads = listNotifications(args);
  const subjectCache = new Map<string, Record<string, unknown>>();
  const rows: OutputRow[] = [];

  for (const thread of threads) {
    const evaluation = evaluateThread(thread, subjectCache);
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
  if (args.apply) {
    for (const row of rows) {
      if (row.decision !== 'mark_done') continue;
      const result = runGh(['api', '-X', 'DELETE', `/notifications/threads/${row.thread_id}`, '--silent']);
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

  const summary = {
    scope: args.scope,
    repo: args.repo ?? null,
    include_read: args.includeRead,
    apply: args.apply,
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
    marked_done_count: markedDone.length,
    mark_errors_count: markErrors.length,
  };

  const report = {
    summary,
    marked_done_thread_ids: markedDone,
    mark_errors: markErrors,
    notifications: rows,
    open_or_unverifiable: rows.filter((r) => r.decision === 'keep'),
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
}

main();
