import fs from "fs";
import path from "path";
import {
  GetObjectCommand,
  PutObjectCommand,
  NoSuchKey,
} from "@aws-sdk/client-s3";
import { PhotosData, MosaicItem } from "../types/photography";
import { getR2Client, R2_BUCKET } from "./r2";

const METADATA_KEY = "photos.json";
const localPath = path.join(process.cwd(), "data/photos.json");

// read from local cache (used at build time after prebuild fetches from R2)
export function getPhotos(): MosaicItem[] {
  if (!fs.existsSync(localPath)) {
    return [];
  }
  const raw = fs.readFileSync(localPath, "utf-8");
  const data: PhotosData = JSON.parse(raw);
  return data.photos;
}

// write to both R2 and local cache
export async function writePhotos(photos: MosaicItem[]): Promise<void> {
  const data: PhotosData = { photos };
  const json = JSON.stringify(data, null, 2) + "\n";

  // write to R2
  const r2 = getR2Client();
  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: METADATA_KEY,
      Body: json,
      ContentType: "application/json",
    }),
  );

  // write local cache
  fs.mkdirSync(path.dirname(localPath), { recursive: true });
  fs.writeFileSync(localPath, json, "utf-8");
}

// fetch from R2 to local cache (used by prebuild script)
export async function fetchPhotosFromR2(): Promise<void> {
  const r2 = getR2Client();
  try {
    const res = await r2.send(
      new GetObjectCommand({
        Bucket: R2_BUCKET,
        Key: METADATA_KEY,
      }),
    );
    const body = await res.Body?.transformToString();
    if (body) {
      fs.mkdirSync(path.dirname(localPath), { recursive: true });
      fs.writeFileSync(localPath, body, "utf-8");
      const data: PhotosData = JSON.parse(body);
      console.log(`fetched ${data.photos.length} photos from R2`);
    }
  } catch (err) {
    if (err instanceof NoSuchKey) {
      console.log("no photos.json in R2 yet, starting fresh");
      fs.mkdirSync(path.dirname(localPath), { recursive: true });
      fs.writeFileSync(localPath, '{ "photos": [] }\n', "utf-8");
    } else {
      throw err;
    }
  }
}
