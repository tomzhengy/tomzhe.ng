import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getR2Client, R2_BUCKET } from "../../lib/r2";
import { getPhotos, writePhotos } from "../../lib/photos";
import { MosaicItem } from "../../types/photography";

// GET /api/photos -- list all photos
export async function GET() {
  const photos = getPhotos();
  return NextResponse.json({ photos });
}

// POST /api/photos -- upload a new photo
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "no file provided" }, { status: 400 });
    }

    const title = (formData.get("title") as string) || file.name;
    const description = (formData.get("description") as string) || "";
    const type = (formData.get("type") as "still" | "motion") || "still";
    const width = parseInt(formData.get("width") as string) || 0;
    const height = parseInt(formData.get("height") as string) || 0;
    const color = (formData.get("color") as string) || "#888888";
    const aspect = (formData.get("aspect") as string) || `${width}/${height}`;

    const id = crypto.randomUUID().slice(0, 8);
    const ext = file.name.split(".").pop() || "jpg";
    const r2Key = `photos/${id}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const r2 = getR2Client();
    await r2.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: r2Key,
        Body: buffer,
        ContentType: file.type,
      }),
    );

    const now = new Date().toISOString();
    const photo: MosaicItem = {
      id,
      title,
      description,
      color,
      type,
      aspect,
      r2Key,
      width,
      height,
      mimeType: file.type,
      size: file.size,
      createdAt: now,
      updatedAt: now,
    };

    const photos = getPhotos();
    photos.push(photo);
    writePhotos(photos);

    return NextResponse.json({ photo });
  } catch (err) {
    console.error("upload error:", err);
    return NextResponse.json({ error: "upload failed" }, { status: 500 });
  }
}

// PUT /api/photos -- reorder photos
export async function PUT(request: NextRequest) {
  try {
    const { orderedIds } = await request.json();
    if (!Array.isArray(orderedIds)) {
      return NextResponse.json(
        { error: "orderedIds must be an array" },
        { status: 400 },
      );
    }

    const photos = getPhotos();
    const photoMap = new Map(photos.map((p) => [p.id, p]));
    const reordered: MosaicItem[] = [];

    for (const id of orderedIds) {
      const photo = photoMap.get(id);
      if (photo) reordered.push(photo);
    }

    // append any photos not in orderedIds (safety net)
    for (const photo of photos) {
      if (!orderedIds.includes(photo.id)) {
        reordered.push(photo);
      }
    }

    writePhotos(reordered);
    return NextResponse.json({ photos: reordered });
  } catch (err) {
    console.error("reorder error:", err);
    return NextResponse.json({ error: "reorder failed" }, { status: 500 });
  }
}
