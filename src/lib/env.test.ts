import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

const valid = {
  DATA_GO_KR_SERVICE_KEY: "data-key",
  KOSIS_API_KEY: "kosis-key",
  GEMINI_API_KEY: "gemini-key",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "sb_secret_x",
};

describe("parseEnv", () => {
  it("필수 키가 모두 있으면 기본값을 채워 반환한다", () => {
    const env = parseEnv(valid);
    expect(env.KOSIS_API_KEY).toBe("kosis-key");
    expect(env.GEMINI_MODEL).toBe("gemini-flash-latest");
    expect(env.GEMINI_FALLBACK_MODEL).toBe("gemini-flash-lite-latest");
    expect(env.AI_DAILY_LIMIT).toBe(100);
  });

  it("AI_DAILY_LIMIT 문자열을 숫자로 변환한다", () => {
    expect(parseEnv({ ...valid, AI_DAILY_LIMIT: "30" }).AI_DAILY_LIMIT).toBe(30);
  });

  it("필수 키가 없으면 키 이름을 담아 에러를 던진다", () => {
    expect(() => parseEnv({ ...valid, KOSIS_API_KEY: undefined })).toThrow(/KOSIS_API_KEY/);
  });

  it("빈 문자열은 없는 것으로 본다", () => {
    expect(() => parseEnv({ ...valid, GEMINI_API_KEY: "" })).toThrow(/GEMINI_API_KEY/);
  });

  it("SUPABASE_URL이 URL 형식이 아니면 에러를 던진다", () => {
    expect(() => parseEnv({ ...valid, SUPABASE_URL: "not-a-url" })).toThrow(/SUPABASE_URL/);
  });

  it("에러 메시지에 키 값을 노출하지 않는다", () => {
    expect(() => parseEnv({ ...valid, SUPABASE_URL: "secret-looking-value" })).toThrow(
      expect.not.objectContaining({ message: expect.stringContaining("secret-looking-value") }),
    );
  });
});
