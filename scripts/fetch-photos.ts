import { fetchPhotosFromR2 } from "../app/lib/photos";

async function main() {
  console.log("fetching photos metadata from R2...");
  await fetchPhotosFromR2();
  console.log("done");
}

main().catch((err) => {
  console.error("failed to fetch photos:", err);
  process.exit(1);
});
