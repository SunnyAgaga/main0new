import { Router, type IRouter } from "express";
import multer from "multer";
import { ObjectId } from "mongodb";
import { saveUploadedImage, uploadedImagesCollection, audioBucket } from "@/db";
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

const AUDIO_MAX_BYTES = 20 * 1024 * 1024;

const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: AUDIO_MAX_BYTES },
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
  audioUpload.single("file")(req, res, (err: unknown) => {
    if (err) {
      const message =
        err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
          ? "Audio file is too large (20MB max)."
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

    const uploadStream = audioBucket().openUploadStream(req.file.originalname, {
      contentType: req.file.mimetype,
    });
    uploadStream.on("error", (streamErr) => {
      req.log.error({ err: streamErr }, "Audio upload to GridFS failed");
      if (!res.headersSent) res.status(500).json({ error: "Upload failed" });
    });
    uploadStream.on("finish", () => {
      req.log.info({ id: uploadStream.id.toString(), size: req.file?.size }, "Audio track uploaded");
      res.status(201).json({ url: `/api/uploads/audio/${uploadStream.id.toString()}` });
    });
    uploadStream.end(req.file.buffer);
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

router.get("/uploads/audio/:id", async (req, res): Promise<void> => {
  let objectId: ObjectId;
  try {
    objectId = new ObjectId(req.params.id);
  } catch {
    res.status(404).end();
    return;
  }

  const bucket = audioBucket();
  const [file] = await bucket.find({ _id: objectId }).toArray();
  if (!file) {
    res.status(404).end();
    return;
  }

  res.set("Content-Type", file.contentType || "audio/mpeg");
  res.set("Cache-Control", "public, max-age=31536000, immutable");
  bucket
    .openDownloadStream(objectId)
    .on("error", () => {
      if (!res.headersSent) res.status(404).end();
    })
    .pipe(res);
});

export default router;
