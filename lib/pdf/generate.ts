import type { Browser } from "puppeteer-core";
import { renderQuoteHtml } from "./template";
import type { QuotePdfData } from "./types";

async function htmlToPdf(html: string): Promise<Uint8Array> {
  let browser: Browser;

  if (process.env.VERCEL) {
    // Produção: Chromium compacto
    const chromium = (await import("@sparticuz/chromium")).default;
    const puppeteer = (await import("puppeteer-core")).default;
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  } else {
    // Local: Chrome baixado pelo pacote "puppeteer"
    const puppeteer = (await import("puppeteer")).default;
    browser = await puppeteer.launch({ headless: true });
  }

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    return await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", bottom: "22mm", left: "15mm", right: "15mm" },
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate: `<div style="font-size:9px;width:100%;text-align:center;color:#666">
        Página <span class="pageNumber"></span> de <span class="totalPages"></span></div>`,
    });
  } finally {
    await browser.close();
  }
}

export async function generateQuotePdf(data: QuotePdfData): Promise<Uint8Array> {
  try {
    return await htmlToPdf(renderQuoteHtml(data));
  } catch (err) {
    console.error("Puppeteer falhou, usando React-PDF:", err);
    const { renderFallbackPdf } = await import("./fallback");
    return await renderFallbackPdf(data);
  }
}