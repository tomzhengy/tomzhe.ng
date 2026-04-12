import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getR2Client, R2_BUCKET } from "../../lib/r2";
import { getPhotos, writePhotos } from "../../lib/photos";
import { MosaicItem } from "../../types/photography";

// static export only uses GET; mutation handlers work during next dev
export const dynamic = "force-static";

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

    const cacheControl = "public, max-age=31536000, immutable";

    const buffer = Buffer.from(await file.arrayBuffer());
    const r2 = getR2Client();
    await r2.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: r2Key,
        Body: buffer,
        ContentType: file.type,
        CacheControl: cacheControl,
      }),
    );

    // upload thumbnail if provided
    const thumb = formData.get("thumb") as File | null;
    const r2ThumbKey = `photos/${id}-thumb.webp`;
    if (thumb) {
      const thumbBuffer = Buffer.from(await thumb.arrayBuffer());
      await r2.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET,
          Key: r2ThumbKey,
          Body: thumbBuffer,
          ContentType: "image/webp",
          CacheControl: cacheControl,
        }),
      );
    }

    const now = new Date().toISOString();
    const photo: MosaicItem = {
      id,
      title,
      subtitle: "",
      description,
      color,
      type,
      aspect,
      r2Key,
      r2ThumbKey: thumb ? r2ThumbKey : "",
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
    const message = err instanceof Error ? err.message : String(err);
    console.error("upload error:", message, err);
    return NextResponse.json({ error: message }, { status: 500 });
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

// PATCH /api/photos?id=xxx -- update metadata
export async function PATCH(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const updates = await request.json();
    const photos = getPhotos();
    const index = photos.findIndex((p) => p.id === id);

    if (index === -1) {
      return NextResponse.json({ error: "photo not found" }, { status: 404 });
    }

    const allowed = [
      "title",
      "subtitle",
      "description",
      "color",
      "type",
      "aspect",
    ];
    for (const key of allowed) {
      if (key in updates) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (photos[index] as any)[key] = updates[key];
      }
    }
    photos[index].updatedAt = new Date().toISOString();

    writePhotos(photos);
    return NextResponse.json({ photo: photos[index] });
  } catch (err) {
    console.error("update error:", err);
    return NextResponse.json({ error: "update failed" }, { status: 500 });
  }
}

// DELETE /api/photos?id=xxx -- delete photo
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const photos = getPhotos();
    const photo = photos.find((p) => p.id === id);

    if (!photo) {
      return NextResponse.json({ error: "photo not found" }, { status: 404 });
    }

    // delete from R2, don't fail if objects are already gone
    try {
      const r2 = getR2Client();
      await r2.send(
        new DeleteObjectCommand({
          Bucket: R2_BUCKET,
          Key: photo.r2Key,
        }),
      );
      if (photo.r2ThumbKey) {
        await r2.send(
          new DeleteObjectCommand({
            Bucket: R2_BUCKET,
            Key: photo.r2ThumbKey,
          }),
        );
      }
    } catch (r2Err) {
      console.error("r2 delete error (continuing):", r2Err);
    }

    const filtered = photos.filter((p) => p.id !== id);
    writePhotos(filtered);

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("delete error:", message, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
