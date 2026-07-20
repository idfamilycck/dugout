// 기획서 PDF 빌드: docs/TOUCHLINE-기획서-source.html -> docs/TOUCHLINE-기획서.pdf
//
// 실행:  node scripts/build-proposal-pdf.mjs
// 여백 조정:  node scripts/build-proposal-pdf.mjs --margin 14
//
// 스크린샷은 HTML이 상대 경로로 참조하므로 file:// 로 열어야 함께 로드된다.
// 스크린샷을 갈아끼운 뒤(e2e/capture-docs.spec.ts)에는 이 스크립트를 다시 돌려야
// PDF 안의 화면과 실제 제품이 일치한다.

import { chromium } from "@playwright/test";
import { pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "docs", "TOUCHLINE-기획서-source.html");
const OUT = path.join(ROOT, "docs", "TOUCHLINE-기획서.pdf");

const marginArg = process.argv.indexOf("--margin");
const MARGIN = marginArg > -1 ? `${process.argv[marginArg + 1]}mm` : "15mm";

// 여백 보정용: 커밋된 산출물을 건드리지 않고 임시 경로로 뽑아볼 때 쓴다.
const outArg = process.argv.indexOf("--out");
const TARGET = outArg > -1 ? path.resolve(process.argv[outArg + 1]) : OUT;

const browser = await chromium.launch();
const page = await browser.newPage();

// file:// 로 열어 상대 경로 이미지(docs/screenshots/*.png)를 그대로 물리게 한다.
await page.goto(pathToFileURL(SRC).href, { waitUntil: "load" });

// 웹폰트/이미지 디코딩이 끝나기 전에 인쇄하면 레이아웃이 밀린다.
await page.evaluate(async () => {
  await document.fonts.ready;
  await Promise.all(
    Array.from(document.images)
      .filter((img) => !img.complete)
      .map((img) => new Promise((res) => { img.onload = img.onerror = res; })),
  );
});

await page.pdf({
  path: TARGET,
  format: "A4",
  printBackground: true,
  margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
});

await browser.close();

// 페이지 수는 레이아웃이 깨졌는지 보는 가장 빠른 지표다(기준: 8페이지).
const buf = await fs.readFile(TARGET);
const pages = (buf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
console.log(`PDF 생성: ${path.relative(ROOT, TARGET)}`);
console.log(`  여백 ${MARGIN} · ${(buf.length / 1024 / 1024).toFixed(2)} MB · ${pages}페이지`);
