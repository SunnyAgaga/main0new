import { randomUUID } from "node:crypto";
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
