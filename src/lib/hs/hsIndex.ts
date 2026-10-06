import data from "../../../data/hs-codes.json";
import type { HsData } from "./build";
import { createHsIndex } from "./hsCodes";

/** 실제 코드표 인덱스 (약 0.9MB JSON) — 서버 전용. 클라이언트 컴포넌트에서 import하지 않는다. */
export const hsIndex = createHsIndex(data as HsData);
