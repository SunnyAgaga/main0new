import { Router, type IRouter } from "express";
import multer from "multer";
import { saveUploadedImage, uploadedImagesCollection } from "@/db";
import { requireAdmin } from "../middlewares/requireAuth";

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

router.post("/admin/uploads", requireAdmin, (req, res): void => {
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
