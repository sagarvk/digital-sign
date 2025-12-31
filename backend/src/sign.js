import fs from "fs";
import path from "path";

import signpdf from "@signpdf/signpdf";
import { P12Signer } from "@signpdf/signer-p12";
import { pdflibAddPlaceholder } from "@signpdf/placeholder-pdf-lib";
import { PDFDocument } from "pdf-lib";

const toStr = (v) => (v === undefined || v === null ? "" : String(v));

export async function cryptographicallySign(
  pdfBytes,
  { reason, location, signedBy }
) {
  const p12B64 = process.env.SIGN_P12_B64;

  const passphraseRaw = process.env.SIGN_P12_PASS;

  if (!p12B64) throw new Error("SIGN_P12_B64 missing");

  const p12Buffer = Buffer.from(p12B64, "base64");

  const pdfDoc = await PDFDocument.load(Buffer.from(pdfBytes));
  const pages = pdfDoc.getPages();
  if (!pages || pages.length === 0) throw new Error("PDF has no pages");

  // ✅ Make sure NOTHING is undefined
  const safeReason = toStr(reason) || "Digitally signed";
  const safeLocation = toStr(location);
  const safeName = toStr(signedBy); // "Digitally signed by"
  const safeContact = ""; // keep empty unless you want phone/email

  // ✅ Add placeholder on page 1 (invisible rect)
  pdflibAddPlaceholder({
    pdfDoc,
    pdfPage: pages[0],
    widgetRect: [0, 0, 0, 0],
    reason: safeReason,
    location: safeLocation,
    name: safeName,
    contactInfo: safeContact,
    signatureLength: 16000,
  });

  const pdfWithPlaceholder = await pdfDoc.save({
    useObjectStreams: false,
    updateFieldAppearances: false,
  });

  const passphrase = toStr(passphraseRaw).trim();
  const signer =
    passphrase.length > 0
      ? new P12Signer(p12Buffer, { passphrase })
      : new P12Signer(p12Buffer);

  const mod = signpdf;

  let signed;
  if (mod && typeof mod.sign === "function") {
    signed = await mod.sign(Buffer.from(pdfWithPlaceholder), signer);
  } else if (typeof mod === "function") {
    signed = await mod(Buffer.from(pdfWithPlaceholder), signer);
  } else if (mod?.default && typeof mod.default.sign === "function") {
    signed = await mod.default.sign(Buffer.from(pdfWithPlaceholder), signer);
  } else if (typeof mod?.default === "function") {
    signed = await mod.default(Buffer.from(pdfWithPlaceholder), signer);
  } else {
    throw new Error("Unsupported @signpdf/signpdf export shape");
  }
  return Buffer.from(signed);
}
