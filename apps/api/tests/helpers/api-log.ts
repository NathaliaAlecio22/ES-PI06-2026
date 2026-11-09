/**
 * Drop-in supertest wrapper that leaves behind a transcript of the test run.
 *
 * Import `request` from this module instead of `supertest` and nothing else in the
 * tests changes: `request(app).post("/api/workflows").send({ ... })` still resolves
 * to the real supertest response — but every call is also recorded in
 * `logs/api-run.log` (relative to the directory vitest runs in) with the request
 * body and the exact response the API returned (status + body), grouped by test.
 * That makes visible what the API actually said, beyond the vitest pass/fail lines.
 *
 * - The log is recreated on every run and each entry is flushed the moment its
 *   response arrives, so the file survives even a run that crashes midway.
 * - Every request also prints a one-line summary to the console of its test.
 * - `logs/` and `*.log` are already covered by the repo's .gitignore.
 */

import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import type { Express } from "express";
import supertest from "supertest";
import type { Agent, Response, Test } from "supertest";
import { afterAll, afterEach, beforeEach } from "vitest";

const LOG_DIRECTORY = resolve(process.cwd(), "logs");
const LOG_PATH = resolve(LOG_DIRECTORY, "api-run.log");
const LINE_WIDTH = 78;

// Agent methods that start a request and return a Test (the ones worth instrumenting).
const HTTP_VERBS = new Set(["get", "post", "put", "patch", "delete", "del", "head", "options"]);

interface ApiCallRecord {
  at: Date;
  test: string;
  method: string;
  url: string;
  requestBody: unknown;
  response?: Response;
  error?: unknown;
  durationMs: number;
}

/** Minimal shape of a vitest task: enough to rebuild "suite > suite > test". */
interface TaskLike {
  name: string;
  suite?: TaskLike | undefined;
}

let currentTest = "(fora de um teste)";
let lastSection: string | null = null;
let initialized = false;
let requestCount = 0;
let errorCount = 0;
let totalDurationMs = 0;
const statusCounts = new Map<number, number>();

// Registered when the test file imports this module: they label each entry with the
// running test, flag failed tests in the log, and close the file with a summary.
beforeEach((context) => {
  currentTest = fullNameOf(context.task);
  context.onTestFailed(({ task }) => {
    if (!initialized) return; // nothing recorded this run — leave the previous log alone.
    appendToLog("");
    appendToLog(`  ✗✗✗ ESTE TESTE FALHOU (${task.name}) — detalhes no relatório do Vitest ✗✗✗`);
  });
});

afterEach(() => {
  currentTest = "(fora de um teste)";
});

afterAll(() => {
  if (!initialized) return; // nothing recorded this run — keep the previous log intact.
  appendToLog("");
  appendToLog("═".repeat(LINE_WIDTH));
  appendToLog(
    [
      `Resumo: ${requestCount} requisições`,
      ...Array.from(statusCounts.keys())
        .sort((a, b) => a - b)
        .map((status) => `${status}×${statusCounts.get(status)}`),
      `erros×${errorCount}`,
      `${(totalDurationMs / 1_000).toFixed(1)}s no total`,
    ].join(" · "),
  );
  appendToLog(`Finalizado em ${new Date().toISOString()}`);
  appendToLog("═".repeat(LINE_WIDTH));
  console.log(`\n📋 Log da execução da API (${requestCount} requisições): ${LOG_PATH}`);
});

/** Same signature as `supertest(app)`, but every verb call is instrumented. */
export function request(app: Express): Agent {
  const agent = supertest(app);
  return new Proxy(agent, {
    get(target, property) {
      const value = Reflect.get(target, property, target);
      if (typeof property !== "string" || typeof value !== "function") return value;
      if (!HTTP_VERBS.has(property)) return value.bind(target);
      const verb = value as (url: string) => Test;
      return (url: string): Test => instrumentTest(verb.call(target, url), property.toUpperCase(), url);
    },
  }) as Agent;
}

/**
 * Wraps a supertest `Test` so `await` still resolves the original response, while the
 * first settlement is recorded in the log. Chained calls that return the Test itself
 * (`.send`, `.set`, `.query`, `.expect`, ...) keep returning the instrumented proxy.
 */
function instrumentTest(test: Test, method: string, url: string): Test {
  const startedAt = Date.now();
  let requestBody: unknown;
  let settled: Promise<Response> | undefined;

  const proxy: Test = new Proxy(test, {
    get(target, property) {
      if (property === "send") {
        return (body?: unknown): Test => {
          requestBody = body;
          const result: unknown = target.send(body as never);
          return result === target ? proxy : (result as Test);
        };
      }
      if (property === "then") {
        return (onFulfilled?: (response: Response) => unknown, onRejected?: (reason: unknown) => unknown) =>
          settle().then(onFulfilled, onRejected);
      }
      if (property === "catch") {
        return (onRejected?: (reason: unknown) => unknown) => settle().catch(onRejected);
      }
      if (property === "finally") {
        return (onFinally?: () => void) => settle().finally(onFinally);
      }
      const value = Reflect.get(target, property, target);
      if (typeof value !== "function") return value;
      return (...args: unknown[]): unknown => {
        const result: unknown = value.apply(target, args);
        return result === target ? proxy : result;
      };
    },
  });

  /** Runs the request exactly once; the first `await` triggers the log entry. */
  function settle(): Promise<Response> {
    settled ??= Promise.resolve(test as unknown as Promise<Response>).then(
      (response) => {
        record({
          at: new Date(),
          test: currentTest,
          method,
          url,
          requestBody,
          response,
          durationMs: Date.now() - startedAt,
        });
        return response;
      },
      (error: unknown) => {
        record({
          at: new Date(),
          test: currentTest,
          method,
          url,
          requestBody,
          error,
          durationMs: Date.now() - startedAt,
        });
        throw error;
      },
    );
    return settled;
  }

  return proxy;
}

function record(entry: ApiCallRecord): void {
  if (!initialized) {
    mkdirSync(LOG_DIRECTORY, { recursive: true });
    // The BOM keeps Windows PowerShell 5.1 / legacy tools reading the accents correctly.
    writeFileSync(
      LOG_PATH,
      `\uFEFF${[
        "═".repeat(LINE_WIDTH),
        "PROVENANCE API — LOG DA EXECUÇÃO DOS TESTES",
        `Executado em ${new Date().toISOString()}`,
        "Cada bloco mostra o corpo enviado e a resposta real da API, agrupados por teste.",
        "═".repeat(LINE_WIDTH),
        "",
      ].join("\n")}`,
      "utf8",
    );
    initialized = true;
  }

  requestCount += 1;
  totalDurationMs += entry.durationMs;
  if (entry.error !== undefined) {
    errorCount += 1;
  } else {
    const status = entry.response?.status ?? 0;
    statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);
  }

  if (entry.test !== lastSection) {
    lastSection = entry.test;
    const title = `▶ ${entry.test} `;
    appendToLog("");
    appendToLog(title + "─".repeat(Math.max(4, LINE_WIDTH - title.length)));
  }
  appendToLog(formatEntry(entry));
  console.log(summarizeForConsole(entry));
}

function formatEntry(entry: ApiCallRecord): string {
  const clock = entry.at.toISOString().slice(11, 23);
  const outcome =
    entry.error !== undefined
      ? `✗ ERRO (${messageOf(entry.error)})`
      : `${entry.response?.status ?? "?"} ${statusMessageOf(entry.response)}`.trimEnd();
  const lines = [`  ${clock}  ${entry.method} ${entry.url} → ${outcome} · ${entry.durationMs}ms`];

  const requestBody = prettyJson(entry.requestBody);
  if (requestBody !== undefined) {
    lines.push("    ── requisição ──", indent(requestBody, 8));
  }
  const responseBody = responseBodyOf(entry.response);
  if (responseBody !== undefined) {
    lines.push("    ── resposta ──", indent(responseBody, 8));
  }
  return lines.join("\n");
}

function summarizeForConsole(entry: ApiCallRecord): string {
  const outcome = entry.error !== undefined ? "ERRO" : String(entry.response?.status ?? "?");
  const body = entry.error !== undefined ? undefined : responseBodyOf(entry.response);
  const preview = body === undefined ? "" : ` ${truncate(body.replace(/\s+/g, " "), 200)}`;
  return `◆ ${entry.method} ${entry.url} → ${outcome} (${entry.durationMs}ms)${preview}`;
}

function responseBodyOf(response: Response | undefined): string | undefined {
  if (response === undefined) return undefined;
  const body = response.body as unknown;
  const bodyIsEmptyObject = typeof body === "object" && body !== null && Object.keys(body).length === 0;
  if (body !== undefined && body !== null && !bodyIsEmptyObject) return prettyJson(body);
  return response.text?.trim() || undefined;
}

// superagent wraps the raw Node response instead of exposing it directly (and its type
// omits the status text), so the real "Bad Request"/"Created" lives on the inner `.res`.
function statusMessageOf(response: Response | undefined): string {
  const raw = response as ({ res?: { statusMessage?: string } } & { statusMessage?: string }) | undefined;
  return raw?.res?.statusMessage ?? raw?.statusMessage ?? "";
}

// Same convention as app.ts's json replacer: bigints travel as decimal strings.
const jsonReplacer = (_key: string, value: unknown) => (typeof value === "bigint" ? value.toString() : value);

function prettyJson(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, jsonReplacer, 2) ?? undefined;
  } catch {
    return String(value);
  }
}

function fullNameOf(task: TaskLike): string {
  const names: string[] = [];
  for (let suite = task.suite; suite; suite = suite.suite) {
    if (suite.name) names.unshift(suite.name);
  }
  names.push(task.name);
  return names.join(" > ");
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function indent(text: string, spaces: number): string {
  const padding = " ".repeat(spaces);
  return text
    .split("\n")
    .map((line) => padding + line)
    .join("\n");
}

function truncate(text: string, maxLength: number): string {
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}

function appendToLog(text: string): void {
  appendFileSync(LOG_PATH, `${text}\n`, "utf8");
}
