import { createRequire } from 'node:module';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

const require = createRequire(import.meta.url);
// Embedded TTF with Croatian glyphs (č, ć, đ) — the built-in PDF fonts lack them.
const FONT_REGULAR = require.resolve('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf');
const FONT_SEMIBOLD = require.resolve('@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf');

const INK = '#1C1915';
const MUTED = '#5F574D';
const ACCENT = '#9A4A23';
const LINE = '#E5DFD5';

/**
 * Loyalty card PDF (A6 portrait). The QR encodes the same token the app shows,
 * so the waiter scans it exactly like the in-browser QR.
 */
export async function renderCardPdf({ tenantName, guestName, qrToken, locations }) {
  const qrPng = await QRCode.toBuffer(qrToken, { errorCorrectionLevel: 'M', margin: 1, width: 600, color: { dark: '#000000', light: '#FFFFFF' } });

  const doc = new PDFDocument({ size: 'A6', margin: 0, info: { Title: `${tenantName} — kartica vjernosti`, Author: 'Mandrač Loyalty' } });
  doc.registerFont('regular', FONT_REGULAR);
  doc.registerFont('semibold', FONT_SEMIBOLD);

  const W = doc.page.width; // 297.64
  const H = doc.page.height; // 419.53
  const pad = 22;

  // Header band
  doc.rect(0, 0, W, 64).fill(ACCENT);
  doc.fillColor('#FFFFFF').font('semibold').fontSize(15).text(tenantName, pad, 20, { width: W - pad * 2 });
  doc.font('regular').fontSize(9).fillColor('#F6EAE2').text('Kartica vjernosti', pad, 40, { width: W - pad * 2 });

  // QR
  const qrSize = 190;
  const qrX = (W - qrSize) / 2;
  const qrY = 86;
  doc.roundedRect(qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, 8).lineWidth(1).strokeColor(LINE).stroke();
  doc.image(qrPng, qrX, qrY, { width: qrSize, height: qrSize });

  // Code + name
  doc.font('semibold').fontSize(13).fillColor(INK).text(qrToken, 0, qrY + qrSize + 18, { width: W, align: 'center', characterSpacing: 1.5 });
  doc.font('regular').fontSize(10).fillColor(MUTED).text(guestName, 0, qrY + qrSize + 38, { width: W, align: 'center' });

  // Footer
  const footY = H - 66;
  doc.moveTo(pad, footY).lineTo(W - pad, footY).lineWidth(0.5).strokeColor(LINE).stroke();
  doc.font('regular').fontSize(8.5).fillColor(MUTED)
    .text('Pokažite QR kod konobaru uz račun i skupljajte bodove.', pad, footY + 10, { width: W - pad * 2, align: 'center' });
  if (locations?.length) {
    doc.text(`Vrijedi na lokacijama: ${locations.join(', ')}`, pad, footY + 24, { width: W - pad * 2, align: 'center' });
  }

  doc.end();
  return doc;
}
