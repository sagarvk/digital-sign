import "dotenv/config";
import express from "express";
import multer from "multer";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";

import { makeSupabase } from "./supabase.js";
import { getClientIp } from "./ip.js";
import { sha256 } from "./hash.js";
import { stampEveryPage } from "./stamp.js";
import { cryptographicallySign } from "./sign.js";

const app = express();
app.set("trust proxy", 1);

const PORT = Number(process.env.PORT || 3000);
const MAX_PDF_MB = Number(process.env.MAX_PDF_MB || 20);
const RATE_LIMIT_PER_MIN = Number(process.env.RATE_LIMIT_PER_MIN || 30);

const supabase = makeSupabase();

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin: true,
    methods: ["GET", "POST"],
    exposedHeaders: ["Content-Disposition"], // ✅ IMPORTANT
  })
);
app.use(
  rateLimit({
    windowMs: 60_000,
    limit: RATE_LIMIT_PER_MIN,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PDF_MB * 1024 * 1024 },
});

app.get("/health", (req, res) => res.json({ ok: true }));

app.post("/api/sign", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ error: "PDF required (field: pdf)" });

    const fileName = req.file.originalname || "document.pdf";
    const buf = req.file.buffer;

    if (buf.slice(0, 4).toString("utf8") !== "%PDF")
      return res.status(400).json({ error: "Invalid PDF" });

    const signedBy = "Sagar Vijayrao Katore";
    const reason = "ESign";
    const location = "Shirdi, Ahilyanagar";

    const ip = getClientIp(req);
    const userAgent = req.headers["user-agent"] || null;

    const originalHash = sha256(buf);

    const stampedBytes = await stampEveryPage(buf, {
      signedBy,
      reason,
      location,
    });
    const signedPdf = await cryptographicallySign(stampedBytes, {
      reason,
      location,
      signedBy,
    });

    const signedHash = sha256(signedPdf);

    const { error: dbErr } = await supabase.from("sign_logs").insert([
      {
        file_name: fileName,
        original_sha256: originalHash,
        signed_sha256: signedHash,
        ip_address: ip || null,
        user_agent: userAgent,
      },
    ]);
    if (dbErr) console.error("Supabase insert failed:", dbErr);

    const safeBase = fileName.replace(/\.pdf$/i, "") || "document";
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeBase}-signed.pdf"`
    );
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(Buffer.from(signedPdf));
  } catch (e) {
    console.error(e);
    return res
      .status(500)
      .json({ error: "Signing failed", details: String(e?.message || e) });
  }
});

app.listen(PORT, () =>
  console.log(`Backend running on http://localhost:${PORT}`)
);
