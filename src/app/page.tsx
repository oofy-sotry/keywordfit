import { AnalyzeExplorer } from "@/components/AnalyzeExplorer";
import { readUrlState } from "@/lib/urlState";

export default async function Home({ searchParams }: PageProps<"/">) {
  // 공유 링크 ?q=&category=&hs= — 값은 readUrlState가 검증
  const params = await searchParams;
  const query = new URLSearchParams(
    Object.entries(params).flatMap(([key, value]) => (typeof value === "string" ? [[key, value]] : [])),
  );
  const initial = readUrlState(query.toString());

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">KeywordFit</h1>
        <p className="text-secondary">공공데이터로 보는 온라인 시장 규모와 품목별 수입 동향</p>
      </header>
      <AnalyzeExplorer initial={initial} />
    </main>
  );
}
