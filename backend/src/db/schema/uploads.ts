import { randomUUID } from "node:crypto";
import { GridFSBucket } from "mongodb";
import { db } from "../client";

export interface UploadedImage {
  id: string;
  contentType: string;
  base64: string;
  createdAt: Date;
}

export const uploadedImagesCollection = () =>
  db.collection<UploadedImage>("uploaded_images");

export async function saveUploadedImage(
  contentType: string,
  base64: string,
): Promise<UploadedImage> {
  const image: UploadedImage = { id: randomUUID(), contentType, base64, createdAt: new Date() };
  await uploadedImagesCollection().insertOne(image);
  return image;
}

// Audio files are too large for the base64-in-a-single-document approach
// above: MongoDB caps a BSON document at 16MB, and base64 inflates a file by
// ~33%, so anything past ~11MB raw would fail to insert. GridFS chunks the
// file across many small documents instead, so there's no such ceiling.
export const audioBucket = () => new GridFSBucket(db, { bucketName: "audio" });
