"use client";

// dynamic-import pdfjs-dist so it stays out of the main bundle. only
// pulled in when the user opens the upload panel.

type PdfTextItem = { str: string };

export async function extractPdfText(file: File): Promise<string> {
	// v5 has no exports map, so subpath imports (legacy/build/pdf.mjs)
	// don't resolve under turbopack. import the default entry instead —
	// it points at build/pdf.mjs which is the same modern bundle.
	const pdfjs = await import("pdfjs-dist");

	// worker needs to load from the same package. cdn keeps it simple and
	// avoids turbopack's `new URL(..., import.meta.url)` static-asset
	// rewrite, which is flaky for cross-package worker files.
	pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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
