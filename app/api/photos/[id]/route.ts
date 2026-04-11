import { NextRequest, NextResponse } from "next/server";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getR2Client, R2_BUCKET } from "../../../lib/r2";
import { getPhotos, writePhotos } from "../../../lib/photos";

// PATCH /api/photos/:id -- update metadata
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const updates = await request.json();
    const photos = getPhotos();
    const index = photos.findIndex((p) => p.id === id);

    if (index === -1) {
      return NextResponse.json({ error: "photo not found" }, { status: 404 });
    }

    const allowed = ["title", "description", "color", "type", "aspect"];
    for (const key of allowed) {
      if (key in updates) {
        (photos[index] as Record<string, unknown>)[key] = updates[key];
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

// DELETE /api/photos/:id -- delete photo
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const photos = getPhotos();
    const photo = photos.find((p) => p.id === id);

    if (!photo) {
      return NextResponse.json({ error: "photo not found" }, { status: 404 });
    }

    const r2 = getR2Client();
    await r2.send(
      new DeleteObjectCommand({
        Bucket: R2_BUCKET,
        Key: photo.r2Key,
      }),
    );

    const filtered = photos.filter((p) => p.id !== id);
    writePhotos(filtered);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("delete error:", err);
    return NextResponse.json({ error: "delete failed" }, { status: 500 });
  }
}
