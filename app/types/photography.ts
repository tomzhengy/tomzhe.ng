export interface MosaicItem {
  id: string;
  title: string;
  description: string;
  color: string;
  type: "still" | "motion";
  aspect: string;
  r2Key: string;
  width: number;
  height: number;
  mimeType: string;
  size: number;
  createdAt: string;
  updatedAt: string;
}

export interface PhotosData {
  photos: MosaicItem[];
}
