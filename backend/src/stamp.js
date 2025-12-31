import fs from "fs";
import path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { formatISTDate } from "./date.js";

export async function stampEveryPage(pdfBytes) {
  const pdfDoc = await PDFDocument.load(pdfBytes);

  // Bold font
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Tick image
  const tickPath = path.resolve("assets/tick.png");
  const tickPngBytes = fs.readFileSync(tickPath);
  const tickImage = await pdfDoc.embedPng(tickPngBytes);

  // Hardcoded values
  const signedBy = "Sagar Vijayrao Katore";
  const reason = "ESign";
  const location = "Shirdi, Ahilyanagar";
  const signDate = formatISTDate(new Date());

  const lines = [
    `Digitally signed by ${signedBy}`,
    `Date: ${signDate}`,
    `Reason: ${reason}`,
    `Location: ${location}`,
  ];

  // Layout (tune here)
  const fontSize = 9;
  const lineGap = 12;
  const rightMargin = 20; // distance from right edge
  const bottomMargin = 20; // distance from bottom edge

  // Compute text block size precisely
  const textWidths = lines.map((t) => fontBold.widthOfTextAtSize(t, fontSize));
  const textBlockWidth = Math.max(...textWidths);
  const textBlockHeight = (lines.length - 1) * lineGap + fontSize;

  // Badge box padding
  const padX = 10;
  const padY = 10;

  // Badge dimensions (text + padding)
  const badgeW = textBlockWidth + padX * 2;
  const badgeH = textBlockHeight + padY * 2;

  // Tick sizing: make it a bit larger than badge height, centered behind
  const tickSize = Math.max(badgeH * 1.15, 90); // minimum 90px-ish
  const tickOpacity = 0.9;

  for (const page of pdfDoc.getPages()) {
    const { width } = page.getSize();

    // Badge bottom-right anchor (right side of page)
    const badgeX = width - rightMargin - badgeW;
    const badgeY = bottomMargin;

    // Center point of badge
    const centerX = badgeX + badgeW / 2;
    const centerY = badgeY + badgeH / 2;

    // Tick centered behind badge
    const tickX = centerX - tickSize / 2;
    const tickY = centerY - tickSize / 2;

    // 1) draw tick (background)
    page.drawImage(tickImage, {
      x: tickX,
      y: tickY,
      width: tickSize,
      height: tickSize,
      opacity: tickOpacity,
    });

    // 2) draw text (foreground), centered within badge
    for (let i = 0; i < lines.length; i++) {
      const text = lines[i];
      const w = fontBold.widthOfTextAtSize(text, fontSize);

      // center each line horizontally in the badge + (badgeW - w) / 2;
      const tx = badgeX;

      // top-to-bottom positioning inside badge
      const ty = badgeY + badgeH - padY - fontSize - i * lineGap;

      page.drawText(text, {
        x: tx,
        y: ty,
        size: fontSize,
        font: fontBold,
        color: rgb(0, 0, 0),
      });
    }
  }

  return await pdfDoc.save({
    useObjectStreams: false,
    updateFieldAppearances: false,
  });
}
