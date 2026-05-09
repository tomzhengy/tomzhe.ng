import { exchangeWithingsRefreshToken } from "../app/lib/withings";

async function main() {
	const env = {
		WITHINGS_CLIENT_ID: process.env.WITHINGS_CLIENT_ID,
		WITHINGS_CLIENT_SECRET: process.env.WITHINGS_CLIENT_SECRET,
		WITHINGS_REFRESH_TOKEN: process.env.WITHINGS_REFRESH_TOKEN,
		NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
		SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
	} as const;

	const token = await exchangeWithingsRefreshToken(env);

	const d = new Date();
	const ymd =
		d.getFullYear() +
		"-" +
		String(d.getMonth() + 1).padStart(2, "0") +
		"-" +
		String(d.getDate()).padStart(2, "0");

	const body = new URLSearchParams({
		action: "getactivity",
		startdateymd: ymd,
		enddateymd: ymd,
		data_fields:
			"steps,distance,calories,totalcalories,elevation,soft,moderate,intense,active,hr_average",
	});

	const r = await fetch("https://wbsapi.withings.net/v2/measure", {
		method: "POST",
		headers: {
			"content-type": "application/x-www-form-urlencoded",
			authorization: `Bearer ${token}`,
		},
		body,
	});

	const json = await r.json();
	console.log("date queried:", ymd);
	console.log("raw response:", JSON.stringify(json, null, 2));
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
