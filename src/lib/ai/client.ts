import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { z } from "zod";
import { getEnv } from "@/lib/env";
import { UpstreamError, type ErrorCode } from "@/lib/errors";

/** Gemini SDK 호출은 이 파일에만 둔다 (다른 AI로 바꿀 때 이 파일만 수정). */

// 모델당 제한. lite 실측 1.4~2.8초, 대체 모델까지 가도 최악 24초 (2026-10-06)
const TIMEOUT_MS = 12_000;

export type GenerateRequest = { model: string; system: string; user: string; jsonSchema: unknown };
export type GenerateFn = (request: GenerateRequest) => Promise<{ text: string | undefined; finishReason?: string }>;

type JsonRequest<T> = { system: string; user: string; schema: z.ZodType<T> };

function statusOf(error: unknown): number | undefined {
  return typeof error === "object" && error !== null && "status" in error ? Number(error.status) : undefined;
}

/** 다른 모델로 다시 시도할 만한 일시적 실패인지 (503 수요 과다·5xx·429·타임아웃 — 2026-10-06 실측) */
function isRetryable(error: unknown): boolean {
  const status = statusOf(error);
  if (status === 429 || (status !== undefined && status >= 500)) return true;
  return error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
}

function errorCodeOf(error: unknown): ErrorCode {
  const status = statusOf(error);
  const message = error instanceof Error ? error.message : "";
  if (status === 401 || status === 403 || (status === 400 && /api key/i.test(message))) return "UPSTREAM_AUTH";
  if (status === 429) return "UPSTREAM_RATE_LIMIT";
  return "UPSTREAM_ERROR";
}

function parseResponse<T>(response: Awaited<ReturnType<GenerateFn>>, schema: z.ZodType<T>, model: string): T {
  if (response.finishReason && response.finishReason !== "STOP") {
    throw new UpstreamError("UPSTREAM_ERROR", `Gemini 응답 중단 (${model}): ${response.finishReason}`);
  }
  if (!response.text) throw new UpstreamError("UPSTREAM_ERROR", `Gemini 빈 응답 (${model})`);
  let json: unknown;
  try {
    json = JSON.parse(response.text);
  } catch {
    throw new UpstreamError("UPSTREAM_ERROR", `Gemini 응답이 JSON이 아님 (${model})`);
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) throw new UpstreamError("UPSTREAM_ERROR", `Gemini 응답 스키마 불일치 (${model})`);
  return parsed.data;
}

/** 모델 목록을 순서대로 시도해 JSON 응답을 스키마로 검증한다. generate를 주입받아 테스트한다. */
export function createJsonGenerator(generate: GenerateFn, models: string[]) {
  return async function generateJson<T>({ system, user, schema }: JsonRequest<T>): Promise<{ data: T; model: string }> {
    const jsonSchema = z.toJSONSchema(schema);
    let lastError: unknown;
    for (const model of models) {
      try {
        const response = await generate({ model, system, user, jsonSchema });
        return { data: parseResponse(response, schema, model), model };
      } catch (error) {
        if (error instanceof UpstreamError) throw error; // 응답은 왔지만 내용이 잘못됨 → 다른 모델로 넘기지 않음
        lastError = error;
        if (!isRetryable(error)) break;
        console.error(`[ai] ${model} 실패, 다음 모델 시도`, statusOf(error) ?? (error as Error).name);
      }
    }
    throw new UpstreamError(errorCodeOf(lastError), `Gemini 호출 실패: ${(lastError as Error)?.message ?? lastError}`);
  };
}

let sdk: GoogleGenAI | undefined;

/** 실제 Gemini 호출. lite 모델만 MINIMAL 추론 지원 (flash에 주면 400 — 2026-10-06 실측) */
const geminiGenerate: GenerateFn = async ({ model, system, user, jsonSchema }) => {
  sdk ??= new GoogleGenAI({ apiKey: getEnv().GEMINI_API_KEY });
  const response = await sdk.models.generateContent({
    model,
    contents: user,
    config: {
      systemInstruction: system,
      responseMimeType: "application/json",
      responseJsonSchema: jsonSchema,
      ...(model.includes("lite") ? { thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } } : {}),
      abortSignal: AbortSignal.timeout(TIMEOUT_MS),
    },
  });
  return { text: response.text, finishReason: response.candidates?.[0]?.finishReason };
};

/** 서버 코드에서 쓰는 기본 생성기: GEMINI_MODEL → GEMINI_FALLBACK_MODEL */
export function generateJson<T>(request: JsonRequest<T>) {
  const env = getEnv();
  return createJsonGenerator(geminiGenerate, [env.GEMINI_MODEL, env.GEMINI_FALLBACK_MODEL])(request);
}
