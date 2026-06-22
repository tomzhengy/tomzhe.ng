"use client";

import { useState } from "react";

interface LoginFormProps {
	onSuccess: () => void;
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
	const [pw, setPw] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function submit(e: React.FormEvent) {
		e.preventDefault();
		if (submitting) return;
		setSubmitting(true);
		setError(null);
		try {
			const r = await fetch("/api/auth/login", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ password: pw }),
			});
			if (!r.ok) {
				setError("incorrect password");
				return;
			}
			onSuccess();
		} catch (err) {
			setError(err instanceof Error ? err.message : "network error");
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div
			style={{
				maxWidth: 380,
				margin: "10vh auto",
				padding: "32px 28px",
				border: "1px solid var(--rule-strong)",
				background: "var(--card)",
				fontFamily: "var(--f-sans)",
			}}
		>
			<h1
				style={{
					fontFamily: "var(--f-serif)",
					fontSize: 28,
					margin: "0 0 6px",
					fontWeight: 400,
				}}
			>
				Biomarkers
			</h1>
			<p
				style={{
					color: "var(--fg-mute)",
					fontSize: 13,
					margin: "0 0 22px",
					lineHeight: 1.5,
				}}
			>
				Private — enter the site password to continue.
			</p>

			<form
				onSubmit={submit}
				style={{ display: "flex", flexDirection: "column", gap: 12 }}
			>
				<input
					type="password"
					value={pw}
					onChange={(e) => setPw(e.target.value)}
					placeholder="password"
					autoFocus
					autoComplete="current-password"
					style={{
						padding: "10px 12px",
						border: "1px solid var(--rule-strong)",
						background: "var(--background)",
						color: "var(--fg)",
						font: "inherit",
						fontFamily: "var(--f-mono)",
						fontSize: 13,
						letterSpacing: "0.04em",
					}}
				/>

				<button
					type="submit"
					disabled={submitting || pw.length === 0}
					style={{
						padding: "10px 14px",
						border: "1px solid var(--rule-strong)",
						background: "transparent",
						color: "var(--fg)",
						fontFamily: "var(--f-mono)",
						fontSize: 11,
						letterSpacing: "0.12em",
						textTransform: "uppercase",
						cursor: submitting || pw.length === 0 ? "not-allowed" : "pointer",
						opacity: submitting || pw.length === 0 ? 0.5 : 1,
					}}
				>
					{submitting ? "checking…" : "enter"}
				</button>

				{error && (
					<div
						style={{
							color: "var(--danger)",
							fontSize: 12,
							fontFamily: "var(--f-mono)",
							letterSpacing: "0.08em",
						}}
					>
						{error}
					</div>
				)}
			</form>
		</div>
	);
}
