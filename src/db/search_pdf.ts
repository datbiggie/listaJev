import fs from "node:fs";
import { extractText, getDocumentProxy } from "unpdf";

async function main() {
  const buffer = fs.readFileSync("pdf/proveedor.pdf");
  const pdfProxy = await getDocumentProxy(new Uint8Array(buffer));
  const { text: pageTexts } = await extractText(pdfProxy, { mergePages: false });

  const pages = Array.isArray(pageTexts) ? pageTexts : [pageTexts];
  console.log("Total pages:", pages.length);

  for (let i = 0; i < pages.length; i++) {
    const lines = pages[i].split(/\r?\n/);
    for (const line of lines) {
      if (/MIN/i.test(line) && /FUSIBLE|25|10|35/i.test(line)) {
        console.log(`P${i + 1}: ${line}`);
      }
    }
  }
}

main().catch(console.error);
