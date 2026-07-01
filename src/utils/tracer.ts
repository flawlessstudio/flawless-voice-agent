/**
 * tracer.ts — Structured observability for every LLM call and tool call
 *
 * Adapter pattern: wraps Langfuse when configured, falls back to console.
 * Zero breaking change — if LANGFUSE_SECRET_KEY is not set, all calls are no-ops.
 *
 * Usage:
 *   import { tracer } from '../utils/tracer.js';
 *   const span = tracer.startSpan({ name: 'openai-session', sessionId });
 *   span.end({ output: result, usage: { input: 120, output: 80 } });
 *
 * Langfuse docs: https://langfuse.com/docs/sdk/typescript/guide
 */

import { logger } from '../analytics/logger.js';

export interface SpanInput {
  name:        string;
  sessionId?:  string;
  userId?:     string;
  input?:      unknown;
  metadata?:   Record<string, unknown>;
  model?:      string;
}

export interface SpanOutput {
  output?:  unknown;
  level?:   'DEFAULT' | 'DEBUG' | 'WARNING' | 'ERROR';
  usage?: {
    input?:  number;
    output?: number;
    total?:  number;
  };
}

export interface Span {
  end(output?: SpanOutput): void;
  error(err: Error): void;
}

// ── Langfuse client (lazy init) ─────────────────────────────────────────────
interface LangfuseClient {
  trace: (params: Record<string, unknown>) => {
    generation: (params: Record<string, unknown>) => {
      end: (params: Record<string, unknown>) => void;
    };
    span: (params: Record<string, unknown>) => {
      end: (params: Record<string, unknown>) => void;
    };
  };
  score: (params: Record<string, unknown>) => void;
  flushAsync?: () => Promise<void>;
}

let _langfuse: LangfuseClient | null = null;

function getLangfuse(): LangfuseClient | null {
  if (_langfuse) return _langfuse;
  if (!process.env.LANGFUSE_SECRET_KEY) return null;

  try {
    // Dynamic import so Langfuse is optional dep — never crashes if not installed
    const { Langfuse } = require('langfuse');
    _langfuse = new Langfuse({
      secretKey:  process.env.LANGFUSE_SECRET_KEY,
      publicKey:  process.env.LANGFUSE_PUBLIC_KEY ?? '',
      baseUrl:    process.env.LANGFUSE_HOST ?? 'https://cloud.langfuse.com',
    });
    logger.info('[tracer] Langfuse connected');
  } catch {
    logger.warn('[tracer] langfuse package not installed — using console fallback');
  }
  return _langfuse;
}

// ── No-op span (fallback) ──────────────────────────────────────────────────
function noopSpan(name: string): Span {
  return {
    end: (out?) => { if (out?.level === 'ERROR') logger.error({ output: out.output }, `[span:${name}]`); },
    error: (err) => logger.error({ err }, `[span:${name}] ERROR`),
  };
}

// ── Tracer API ─────────────────────────────────────────────────────────────
export const tracer = {
  /**
   * Start a generation span (LLM call)
   * Use for: OpenAI Realtime session, post-call analyzer, tool calls
   */
  startGeneration(input: SpanInput): Span {
    const lf = getLangfuse();
    if (!lf) return noopSpan(input.name);

    const trace = lf.trace({
      name:      input.name,
      sessionId: input.sessionId,
      userId:    input.userId,
      metadata:  input.metadata,
    });

    const generation = trace.generation({
      name:  input.name,
      model: input.model,
      input: input.input,
    });

    return {
      end: (out?) => generation.end({
        output:      out?.output,
        level:       out?.level,
        usage:       out?.usage,
      }),
      error: (err) => generation.end({
        output: err.message,
        level:  'ERROR',
      }),
    };
  },

  /**
   * Start a span (non-LLM, e.g. CRM sync, tool execution)
   */
  startSpan(input: SpanInput): Span {
    const lf = getLangfuse();
    if (!lf) return noopSpan(input.name);

    const trace = lf.trace({
      name:      input.name,
      sessionId: input.sessionId,
      userId:    input.userId,
    });

    const span = trace.span({
      name:  input.name,
      input: input.input,
    });

    return {
      end:   (out?) => span.end({ output: out?.output }),
      error: (err)  => span.end({ output: err.message, level: 'ERROR' }),
    };
  },

  /**
   * Score a completed session (intent accuracy, summary quality)
   * Called from eval/llm-quality.ts
   */
  score(params: { traceId: string; name: string; value: number; comment?: string }) {
    const lf = getLangfuse();
    if (!lf) return;
    lf.score(params);
  },

  /** Flush before process exit */
  async flush() {
    const lf = getLangfuse();
    if (lf?.flushAsync) await lf.flushAsync();
  },
};
