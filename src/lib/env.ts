import { z } from "zod";

const required = z.string().trim().min(1);

const EnvSchema = z.object({
  DATA_GO_KR_SERVICE_KEY: required,
  KOSIS_API_KEY: required,
  GEMINI_API_KEY: required,
  GEMINI_MODEL: required.default("gemini-flash-lite-latest"), // 무료 티어에서 빠르고 안정적 (2026-10-06 실측)
  GEMINI_FALLBACK_MODEL: required.default("gemini-flash-latest"),
  AI_DAILY_LIMIT: z.coerce.number().int().positive().default(100),
  AI_PER_CLIENT_DAILY_LIMIT: z.coerce.number().int().positive().default(20), // 한 IP(해시)가 하루에 쓸 수 있는 AI 호출
  SUPABASE_URL: z.url(),
  SUPABASE_SERVICE_ROLE_KEY: required,
});

export type Env = z.infer<typeof EnvSchema>;

/** 환경변수 객체를 검증한다. 실패 시 키 이름만 담은 에러를 던진다 (값은 노출하지 않음). */
export function parseEnv(raw: Record<string, string | undefined>): Env {
  const result = EnvSchema.safeParse(raw);
  if (!result.success) {
    const keys = [...new Set(result.error.issues.map((issue) => issue.path.join(".")))];
    throw new Error(`환경변수 설정 오류: ${keys.join(", ")} (.env.example 참고)`);
  }
  return result.data;
}

let cached: Env | undefined;

/** 서버 코드에서 환경변수를 읽는 유일한 진입점. */
export function getEnv(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}
