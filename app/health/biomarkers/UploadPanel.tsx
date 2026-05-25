"use client";

import { useRef, useState } from "react";
import { extractPdfText } from "./pdfExtract";
import type { BiomarkerSource } from "./types";

interface UploadPanelProps {
	onUploaded: () => void | Promise<void>;
}

const SOURCES: Array<{ id: BiomarkerSource; label: string; accept: string }> = [
	{ id: "function_health", label: "Function Health (PDF)", accept: ".pdf" },
	{ id: "whoop_labs", label: "Whoop Advanced Labs (PDF)", accept: ".pdf" },
	{ id: "nucleus", label: "Nucleus (JSON)", accept: ".json" },
];

type Stage =
	| { kind: "idle" }
	| { kind: "extracting"; filename: string }
	| { kind: "uploading"; filename: string }
	| { kind: "done"; filename: string; count: number }
	| { kind: "error"; filename: string; message: string };

export default function UploadPanel({ onUploaded }: UploadPanelProps) {
	const [source, setSource] = useState<BiomarkerSource>("function_health");
	const [stage, setStage] = useState<Stage>({ kind: "idle" });
	const [dragOver, setDragOver] = useState(false);
	const inputRef = useRef<HTMLInputElement | null>(null);

	const currentSource = SOURCES.find((s) => s.id === source) ?? SOURCES[0];

	async function handleFile(file: File) {
		setStage({ kind: "extracting", filename: file.name });
		let body: Record<string, unknown>;
		try {
			if (source === "nucleus") {
				const text = await file.text();
				const json = JSON.parse(text);
				body = { source, filename: file.name, jsonPayload: json };
			} else {
				const text = await extractPdfText(file);
				if (!text || text.trim().length < 50) {
					setStage({
						kind: "error",
						filename: file.name,
						message:
							"no text extracted — pdf may be image-only. retry with a text pdf.",
					});
					return;
				}
				body = { source, filename: file.name, extractedText: text };
			}
		} catch (err) {
			setStage({
				kind: "error",
				filename: file.name,
				message: err instanceof Error ? err.message : "extraction failed",
			});
			return;
		}

		setStage({ kind: "uploading", filename: file.name });
		try {
			const r = await fetch("/api/biomarkers/upload", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(body),
			});
			if (!r.ok) {
				const t = await r.text();
				setStage({
					kind: "error",
					filename: file.name,
					message: `server: ${r.status} ${t.slice(0, 200)}`,
				});
				return;
			}
			const json = (await r.json()) as {
				upload: { parsedCount: number } | null;
			};
			setStage({
				kind: "done",
				filename: file.name,
				count: json.upload?.parsedCount ?? 0,
			});
			await onUploaded();
		} catch (err) {
			setStage({
				kind: "error",
				filename: file.name,
				message: err instanceof Error ? err.message : "upload failed",
			});
		}
	}

	function onDrop(e: React.DragEvent<HTMLDivElement>) {
		e.preventDefault();
		setDragOver(false);
		const file = e.dataTransfer.files[0];
		if (file) void handleFile(file);
	}

	return (
		<section
			style={{
				marginTop: 20,
				border: "1px solid var(--rule-strong)",
				background: "var(--card)",
				padding: 20,
				display: "flex",
				flexDirection: "column",
				gap: 14,
			}}
		>
			<div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
				{SOURCES.map((s) => {
					const active = s.id === source;
					return (
						<button
							key={s.id}
							type="button"
							onClick={() => setSource(s.id)}
							style={{
								padding: "6px 10px",
								border: `1px solid ${active ? "var(--accent)" : "var(--rule-strong)"}`,
								background: active
									? "color-mix(in oklab, var(--accent) 12%, transparent)"
									: "transparent",
								color: active ? "var(--accent)" : "var(--fg-soft)",
								fontFamily: "var(--f-mono)",
								fontSize: 11,
								letterSpacing: "0.08em",
								cursor: "pointer",
							}}
						>
							{s.label}
						</button>
					);
				})}
			</div>

			<div
				onDrop={onDrop}
				onDragOver={(e) => {
					e.preventDefault();
					setDragOver(true);
				}}
				onDragLeave={() => setDragOver(false)}
				onClick={() => inputRef.current?.click()}
				style={{
					padding: 32,
					border: `1px dashed ${dragOver ? "var(--accent)" : "var(--rule-strong)"}`,
					background: dragOver
						? "color-mix(in oklab, var(--accent) 8%, transparent)"
						: "transparent",
					textAlign: "center",
					color: "var(--fg-mute)",
					fontFamily: "var(--f-mono)",
					fontSize: 12,
					letterSpacing: "0.08em",
					cursor: "pointer",
				}}
			>
				drop a {currentSource.label.toLowerCase()} here, or click to choose
			</div>
			<input
				ref={inputRef}
				type="file"
				accept={currentSource.accept}
				onChange={(e) => {
					const f = e.target.files?.[0];
					if (f) void handleFile(f);
					e.target.value = "";
				}}
				style={{ display: "none" }}
			/>

			<StageRow stage={stage} />
		</section>
	);
}

function StageRow({ stage }: { stage: Stage }) {
	if (stage.kind === "idle") return null;
	const color =
		stage.kind === "error"
			? "var(--danger)"
			: stage.kind === "done"
				? "var(--ok)"
				: "var(--fg-mute)";
	const text =
		stage.kind === "extracting"
			? `extracting text from ${stage.filename}…`
			: stage.kind === "uploading"
				? `parsing ${stage.filename} via llm…`
				: stage.kind === "done"
					? `parsed ${stage.count} biomarkers from ${stage.filename}`
					: `failed ${stage.filename}: ${stage.message}`;
	return (
		<div
			style={{
				fontFamily: "var(--f-mono)",
				fontSize: 11,
				color,
				letterSpacing: "0.06em",
			}}
		>
			{text}
		</div>
	);
}
