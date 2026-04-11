import fs from "fs";
import path from "path";
import { PhotosData, MosaicItem } from "../types/photography";

const photosPath = path.join(process.cwd(), "data/photos.json");

export function getPhotos(): MosaicItem[] {
  if (!fs.existsSync(photosPath)) {
    return [];
  }
  const raw = fs.readFileSync(photosPath, "utf-8");
  const data: PhotosData = JSON.parse(raw);
  return data.photos;
}

export function writePhotos(photos: MosaicItem[]): void {
  const dir = path.dirname(photosPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const data: PhotosData = { photos };
  fs.writeFileSync(photosPath, JSON.stringify(data, null, 2) + "\n", "utf-8");
}
