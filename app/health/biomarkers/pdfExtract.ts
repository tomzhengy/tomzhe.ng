"use client";

// dynamic-import pdfjs-dist so it stays out of the main bundle. only
// pulled in when the user opens the upload panel.

type PdfTextItem = { str: string };

export async function extractPdfText(file: File): Promise<string> {
	const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

	// pdfjs needs a worker. point it at the worker URL the same package
	// ships. webpack/turbopack rewrites these `new URL(..., import.meta.url)`
	// references at build time so they resolve to a static asset.
	pdfjs.GlobalWorkerOptions.workerSrc = new URL(
		"pdfjs-dist/legacy/build/pdf.worker.mjs",
		import.meta.url,
	).toString();

	const buf = await file.arrayBuffer();
	const doc = await pdfjs.getDocument({ data: buf }).promise;

	const pages: string[] = [];
	for (let i = 1; i <= doc.numPages; i++) {
		const page = await doc.getPage(i);
		const content = await page.getTextContent();
		const items = content.items as PdfTextItem[];
		const text = items.map((it) => it.str).join(" ");
		pages.push(text);
	}
	return pages.join("\n\n");
}
