import { Router, type IRouter } from "express";
import multer from "multer";
import { saveUploadedImage, uploadedImagesCollection } from "@/db";
import { requirePermission } from "../middlewares/requireAuth";

const router: IRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image files are allowed"));
      return;
    }
    cb(null, true);
  },
});

// Stored the same way as images (base64 in Mongo) for consistency, but capped
// smaller: a raw file this size base64-encodes to ~13.3MB, staying safely
// under MongoDB's 16MB per-document BSON limit alongside the rest of the doc.
const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("audio/")) {
      cb(new Error("Only audio files are allowed"));
      return;
    }
    cb(null, true);
  },
});

router.post("/admin/uploads", requirePermission("site-settings"), (req, res): void => {
  upload.single("file")(req, res, async (err: unknown) => {
    if (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      res.status(400).json({ error: message });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }

    const image = await saveUploadedImage(req.file.mimetype, req.file.buffer.toString("base64"));
    req.log.info({ id: image.id, size: req.file.size }, "Image uploaded");
    res.status(201).json({ url: `/api/uploads/${image.id}` });
  });
});

router.post("/admin/uploads/audio", requirePermission("music"), (req, res): void => {
  audioUpload.single("file")(req, res, async (err: unknown) => {
    if (err) {
      const message =
        err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
          ? "Audio file is too large (10MB max)."
          : err instanceof Error
            ? err.message
            : "Upload failed";
      res.status(400).json({ error: message });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }

    const audio = await saveUploadedImage(req.file.mimetype, req.file.buffer.toString("base64"));
    req.log.info({ id: audio.id, size: req.file.size }, "Audio track uploaded");
    res.status(201).json({ url: `/api/uploads/${audio.id}` });
  });
});

router.get("/uploads/:id", async (req, res): Promise<void> => {
  const image = await uploadedImagesCollection().findOne({ id: req.params.id });
  if (!image) {
    res.status(404).end();
    return;
  }

  res.set("Content-Type", image.contentType);
  res.set("Cache-Control", "public, max-age=31536000, immutable");
  res.send(Buffer.from(image.base64, "base64"));
});

export default router;
