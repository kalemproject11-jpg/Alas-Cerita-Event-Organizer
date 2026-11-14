import { IssuedTicket, Event } from '../types';
import QRCode from 'qrcode';

/**
 * Helper: wrap a string cleanly into multiple lines within maxWidth.
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines = 3
): string[] {
  const clean = (text || '').trim();
  if (!clean) return ['-'];

  const words = clean.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
        if (lines.length >= maxLines) {
          // Ellipsize remaining words onto last line if we hit maxLines
          const lastIdx = lines.length - 1;
          let last = lines[lastIdx];
          while (last.length > 3 && ctx.measureText(`${last}…`).width > maxWidth) {
            last = last.slice(0, -1);
          }
          lines[lastIdx] = `${last}…`;
          return lines;
        }
        currentLine = word;
      } else {
        // Single extra-long word (e.g. long email without spaces): break by character
        let chunk = '';
        for (const ch of word) {
          if (ctx.measureText(chunk + ch).width <= maxWidth) {
            chunk += ch;
          } else {
            lines.push(chunk);
            if (lines.length >= maxLines) {
              const lastIdx = lines.length - 1;
              let last = lines[lastIdx];
              while (last.length > 3 && ctx.measureText(`${last}…`).width > maxWidth) {
                last = last.slice(0, -1);
              }
              lines[lastIdx] = `${last}…`;
              return lines;
            }
            chunk = ch;
          }
        }
        currentLine = chunk;
      }
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : ['-'];
}

/**
 * Helper: shrink font size step-by-step until single-line text fits maxWidth (or return wrapped lines).
 */
function fitSingleLineFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontWeight: string,
  preferredSize: number,
  minSize: number,
  fontFamily: string,
  maxWidth: number
): number {
  let size = preferredSize;
  while (size > minSize) {
    ctx.font = `${fontWeight} ${size}px ${fontFamily}`;
    if (ctx.measureText(text).width <= maxWidth) {
      return size;
    }
    size -= 1;
  }
  return minSize;
}

/**
 * Generates and downloads a high-resolution, professional E-Ticket PNG pass
 * for an attendee, suitable for sending via WhatsApp or Email.
 * All text dynamically wraps and fits cleanly inside bordered boxes.
 */
export async function downloadTicketAsPNG(ticket: IssuedTicket, event: Event): Promise<void> {
  const scale = 2; // High-DPI 2x scale for sharp rendering
  const w = 720;

  // Step 1: Use a measurement canvas to calculate exact wrapped line heights before final draw
  const measureCanvas = document.createElement('canvas');
  const mCtx = measureCanvas.getContext('2d');
  if (!mCtx) throw new Error('Canvas context not available');

  const boxLeft = 36;
  const boxWidth = w - 72; // 648px
  const padX = 18;
  const innerLeft = boxLeft + padX; // 54px
  const innerWidth = boxWidth - padX * 2; // 612px

  // --- Measure Event Box ---
  const rawTitle =
    !event.title || event.title.includes('Rerasan Mawi Makna')
      ? 'TALK SHOW • MINI WORKSHOP • KERONCONG MUSIC PERFORMANCE'
      : event.title;
  mCtx.font = 'bold 18px sans-serif';
  const titleLines = wrapText(mCtx, rawTitle, innerWidth, 3);
  const titleLineHeight = 25;

  const venueText = `Lokasi: ${event.venue || 'Kalura Secret Garden'}, ${event.city || 'Yogyakarta'}`;
  const dateText = 'Sabtu, 5 Des 2026 · 08:00 WIB';
  mCtx.font = 'bold 12px monospace';
  const dateWidth = mCtx.measureText(dateText).width;
  const venueMaxWidth = innerWidth - dateWidth - 16;
  mCtx.font = '12px sans-serif';
  const venueLines = wrapText(mCtx, venueText, venueMaxWidth, 2);

  const eventHeaderH = 36; // CREATIVE PICNIC GATHERING · 2026
  const eventTitleH = titleLines.length * titleLineHeight;
  const eventTaglineH = 24;
  const eventBottomH = Math.max(venueLines.length * 16, 18) + 18;
  const eventBoxH = eventHeaderH + eventTitleH + eventTaglineH + eventBottomH + 8;

  // --- Measure Attendee Box ---
  mCtx.font = 'bold 21px sans-serif';
  const nameLines = wrapText(mCtx, ticket.attendeeName || '-', innerWidth, 2);
  const nameLineH = 26;

  mCtx.font = 'bold 15px sans-serif';
  const originText = ticket.attendeeOrigin || ticket.attendeeNik || '-';
  const originLines = wrapText(mCtx, originText, innerWidth, 2);
  const originLineH = 20;

  const colGap = 20;
  const leftColWidth = 260;
  const rightColWidth = innerWidth - leftColWidth - colGap; // 332px
  mCtx.font = '13px monospace';
  const phoneLines = wrapText(mCtx, ticket.attendeePhone || '-', leftColWidth, 2);
  const emailLines = wrapText(mCtx, ticket.attendeeEmail || '-', rightColWidth, 2);
  const contactLinesCount = Math.max(phoneLines.length, emailLines.length);
  const contactH = contactLinesCount * 17;

  const hasPackage = Boolean(ticket.packageName);
  const packageText = hasPackage
    ? `BUNDLE: PAKET ${ticket.packageName!.toUpperCase()} (PESERTA ${ticket.packageMemberIndex || 1} DARI ${ticket.packageTotalMembers || 1})`
    : '';
  const packagePillH = hasPackage ? 36 : 0;

  const attBoxH =
    36 + // section header
    18 + nameLines.length * nameLineH + 12 + // nama peserta
    18 + originLines.length * originLineH + 12 + // asal / lembaga
    18 + contactH + 12 + // phone & email
    packagePillH +
    12;

  // --- Measure QR Card ---
  const qrCardLeft = 48;
  const qrCardWidth = w - 96; // 624px
  const qrInnerMaxW = qrCardWidth - 40; // 584px
  const gateText = `Pintu: ${ticket.seat_or_gate || 'Gate Utama Kalura Garden'}`;
  mCtx.font = '11px sans-serif';
  const qrHintLines = wrapText(
    mCtx,
    'Tunjukkan QR Code ini pada layar ponsel atau cetak untuk dipindai di pintu masuk',
    qrInnerMaxW,
    2
  );
  const gateLines = wrapText(mCtx, gateText, qrInnerMaxW, 2);
  const qrCardH = 308 + qrHintLines.length * 16 + gateLines.length * 16 + 16;

  // --- Measure Security Footer ---
  mCtx.font = '10.5px sans-serif';
  const footerBullets = [
    '• Tiket terenkripsi kriptografi UUID v4 dan hanya sah untuk 1 (satu) kali pemindaian masuk.',
    '• Jika ada kendala layar retak / baterai habis, hubungi Posko Helpdesk Supervisor sesuai Asal/Lembaga terdaftar.',
    '• Diterbitkan resmi oleh Panitia Pelaksana Alas Cerita (Kalura Secret Garden).',
  ];
  const wrappedBullets = footerBullets.map((line) => wrapText(mCtx, line, innerWidth, 3));
  const totalBulletLines = wrappedBullets.reduce((acc, lines) => acc + lines.length, 0);
  const footerBoxH = 38 + totalBulletLines * 15 + wrappedBullets.length * 3 + 12;

  // Compute vertical positions cleanly with consistent 16px gaps
  const headerTop = 24;
  const headerH = 80;
  const eventY = headerTop + headerH + 14;
  const attY = eventY + eventBoxH + 14;
  const qrY = attY + attBoxH + 16;
  const footerY = qrY + qrCardH + 16;
  const h = footerY + footerBoxH + 34;

  // Step 2: Create actual render canvas with computed dynamic height
  const canvas = document.createElement('canvas');
  canvas.width = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  ctx.scale(scale, scale);

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, '#1d0f1c');
  bgGrad.addColorStop(0.5, '#1e1620');
  bgGrad.addColorStop(1, '#0e2218');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // Outer border & frame (Pink & Green matching ALCER logo)
  ctx.strokeStyle = '#FF579F';
  ctx.lineWidth = 3;
  ctx.strokeRect(16, 16, w - 32, h - 32);

  ctx.strokeStyle = 'rgba(52, 211, 153, 0.55)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(22, 22, w - 44, h - 44);

  // Top header banner
  ctx.fillStyle = '#281325';
  ctx.fillRect(24, headerTop, w - 48, headerH);

  const headerBrandText = 'ALAS CERITA PICNIC GATHERING 2026';
  const headerBrandSize = fitSingleLineFontSize(
    ctx,
    headerBrandText,
    '900',
    21,
    15,
    'sans-serif',
    475
  );
  ctx.fillStyle = '#FF579F';
  ctx.font = `900 ${headerBrandSize}px sans-serif`;
  ctx.fillText(headerBrandText, 42, headerTop + 34, 475);

  const headerTitleSize = fitSingleLineFontSize(
    ctx,
    'OFFICIAL E-TICKET PASS · TIKET MASUK RESMI',
    'bold',
    14,
    11,
    'sans-serif',
    475
  );
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${headerTitleSize}px sans-serif`;
  ctx.fillText('OFFICIAL E-TICKET PASS · TIKET MASUK RESMI', 42, headerTop + 60, 475);

  ctx.fillStyle = '#34D399';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'right';
  ctx.fillText('VERIFIED PASS', w - 42, headerTop + 32, 170);
  ctx.fillStyle = '#f9a8d4';
  ctx.font = '11px monospace';
  ctx.fillText('ONE-TIME SCAN ONLY', w - 42, headerTop + 56, 170);
  ctx.textAlign = 'left';

  // Event Details Box
  ctx.fillStyle = 'rgba(38, 19, 36, 0.9)';
  ctx.fillRect(boxLeft, eventY, boxWidth, eventBoxH);
  ctx.strokeStyle = 'rgba(52, 211, 153, 0.45)';
  ctx.lineWidth = 1;
  ctx.strokeRect(boxLeft, eventY, boxWidth, eventBoxH);

  let cursorY = eventY + 26;
  ctx.fillStyle = '#34D399';
  ctx.font = 'bold 11px monospace';
  ctx.fillText('CREATIVE PICNIC GATHERING · 2026', innerLeft, cursorY, innerWidth);

  cursorY += 26;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px sans-serif';
  titleLines.forEach((line) => {
    ctx.fillText(line, innerLeft, cursorY, innerWidth);
    cursorY += titleLineHeight;
  });

  ctx.fillStyle = '#6ee7b7';
  ctx.font = 'italic 14px serif';
  ctx.fillText('“Duduk Sejenak, Leren Kepenak”', innerLeft, cursorY, innerWidth);

  cursorY += 26;
  ctx.fillStyle = '#fce7f3';
  ctx.font = '12px sans-serif';
  venueLines.forEach((line, idx) => {
    ctx.fillText(line, innerLeft, cursorY + idx * 16, venueMaxWidth);
  });

  ctx.fillStyle = '#34D399';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(dateText, boxLeft + boxWidth - padX, cursorY, innerWidth - venueMaxWidth);
  ctx.textAlign = 'left';

  // Attendee Info Section
  ctx.fillStyle = '#21111f';
  ctx.fillRect(boxLeft, attY, boxWidth, attBoxH);
  ctx.strokeStyle = 'rgba(255, 87, 159, 0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(boxLeft, attY, boxWidth, attBoxH);

  let attCursorY = attY + 26;
  ctx.fillStyle = '#FF579F';
  ctx.font = 'bold 11px monospace';
  ctx.fillText('BIODATA PESERTA TERDAFTAR (BY NAME)', innerLeft, attCursorY, innerWidth);

  // Attendee Name
  attCursorY += 24;
  ctx.fillStyle = '#f9a8d4';
  ctx.font = '11px sans-serif';
  ctx.fillText('Nama Lengkap Peserta:', innerLeft, attCursorY, innerWidth);
  attCursorY += 22;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 21px sans-serif';
  nameLines.forEach((line) => {
    ctx.fillText(line, innerLeft, attCursorY, innerWidth);
    attCursorY += nameLineH;
  });

  // Asal / Lembaga
  attCursorY += 4;
  ctx.fillStyle = '#f9a8d4';
  ctx.font = '11px sans-serif';
  ctx.fillText('Asal / Lembaga:', innerLeft, attCursorY, innerWidth);
  attCursorY += 19;
  ctx.fillStyle = '#34D399';
  ctx.font = 'bold 15px sans-serif';
  originLines.forEach((line) => {
    ctx.fillText(line, innerLeft, attCursorY, innerWidth);
    attCursorY += originLineH;
  });

  // Phone & Email
  attCursorY += 6;
  const emailColX = innerLeft + leftColWidth + colGap;
  ctx.fillStyle = '#f9a8d4';
  ctx.font = '11px sans-serif';
  ctx.fillText('No. WhatsApp / HP:', innerLeft, attCursorY, leftColWidth);
  ctx.fillText('Alamat Email:', emailColX, attCursorY, rightColWidth);

  attCursorY += 18;
  ctx.fillStyle = '#f8fafc';
  ctx.font = '13px monospace';
  phoneLines.forEach((line, idx) => {
    ctx.fillText(line, innerLeft, attCursorY + idx * 17, leftColWidth);
  });
  emailLines.forEach((line, idx) => {
    ctx.fillText(line, emailColX, attCursorY + idx * 17, rightColWidth);
  });
  attCursorY += contactH;

  // Package bundle indicator pill (width fits text cleanly inside boxWidth)
  if (hasPackage) {
    attCursorY += 8;
    ctx.font = 'bold 11px monospace';
    const textW = ctx.measureText(packageText).width;
    const pillW = Math.min(Math.max(textW + 24, 340), innerWidth);
    const pillH = 26;

    ctx.fillStyle = '#0d2b1d';
    ctx.fillRect(innerLeft, attCursorY, pillW, pillH);
    ctx.strokeStyle = '#34D399';
    ctx.strokeRect(innerLeft, attCursorY, pillW, pillH);

    ctx.fillStyle = '#6ee7b7';
    ctx.fillText(packageText, innerLeft + 12, attCursorY + 17, pillW - 24);
  }

  // QR Code & Barcode Verification Section
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(qrCardLeft, qrY, qrCardWidth, qrCardH);

  // Generate QR Code as Data URL
  const qrDataUrl = await QRCode.toDataURL(ticket.qrToken, {
    width: 440,
    margin: 1,
    errorCorrectionLevel: 'H',
    color: {
      dark: '#1c0f1c',
      light: '#ffffff',
    },
  });

  const qrImg = new Image();
  await new Promise<void>((resolve, reject) => {
    qrImg.onload = () => resolve();
    qrImg.onerror = reject;
    qrImg.src = qrDataUrl;
  });

  // Draw QR Image centered
  const qrSize = 216;
  const qrX = (w - qrSize) / 2;
  ctx.drawImage(qrImg, qrX, qrY + 20, qrSize, qrSize);

  // Monospace ticket number
  ctx.fillStyle = '#2c1326';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('KODE TIKET RESMI (VISUAL ID):', w / 2, qrY + 260, qrInnerMaxW);

  ctx.fillStyle = '#FF579F';
  ctx.font = '900 28px monospace';
  ctx.fillText(ticket.ticketNumber, w / 2, qrY + 292, qrInnerMaxW);

  let qrTextY = qrY + 314;
  ctx.fillStyle = '#475569';
  ctx.font = '11px sans-serif';
  qrHintLines.forEach((line) => {
    ctx.fillText(line, w / 2, qrTextY, qrInnerMaxW);
    qrTextY += 16;
  });
  gateLines.forEach((line) => {
    ctx.fillText(line, w / 2, qrTextY, qrInnerMaxW);
    qrTextY += 16;
  });
  ctx.textAlign = 'left';

  // Security Footer
  ctx.fillStyle = '#12241b';
  ctx.fillRect(boxLeft, footerY, boxWidth, footerBoxH);
  ctx.strokeStyle = 'rgba(52, 211, 153, 0.4)';
  ctx.strokeRect(boxLeft, footerY, boxWidth, footerBoxH);

  let footCursorY = footerY + 24;
  ctx.fillStyle = '#34D399';
  ctx.font = 'bold 11px monospace';
  ctx.fillText('SISTEM VALIDASI ANTI SCAN GANDA (ANTI-DOUBLE SCAN)', innerLeft, footCursorY, innerWidth);

  footCursorY += 20;
  ctx.fillStyle = '#fce7f3';
  ctx.font = '10.5px sans-serif';
  wrappedBullets.forEach((lines) => {
    lines.forEach((line) => {
      ctx.fillText(line, innerLeft, footCursorY, innerWidth);
      footCursorY += 15;
    });
    footCursorY += 3;
  });

  // Trigger browser download
  const dataUrl = canvas.toDataURL('image/png');
  const safeName = ticket.attendeeName.replace(/[^a-zA-Z0-9]/g, '_');
  const link = document.createElement('a');
  link.download = `ETicket_AlasCerita_${ticket.ticketNumber}_${safeName}.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
