import { IssuedTicket, Event } from '../types';
import QRCode from 'qrcode';

/**
 * Generates and downloads a high-resolution, professional E-Ticket PNG pass
 * for an attendee, suitable for sending via WhatsApp or Email.
 */
export async function downloadTicketAsPNG(ticket: IssuedTicket, event: Event): Promise<void> {
  const scale = 2; // High-DPI 2x scale for sharp rendering
  const width = 720 * scale;
  const height = 1000 * scale;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  ctx.scale(scale, scale);
  const w = 720;
  const h = 1000;

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, '#1d0f1c');
  bgGrad.addColorStop(0.5, '#261422');
  bgGrad.addColorStop(1, '#201610');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // Outer border & frame (Pink & Yellow nuance)
  ctx.strokeStyle = '#FF4B82';
  ctx.lineWidth = 3;
  ctx.strokeRect(16, 16, w - 32, h - 32);

  ctx.strokeStyle = 'rgba(250, 204, 21, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(22, 22, w - 44, h - 44);

  // Top header banner
  ctx.fillStyle = '#2c1428';
  ctx.fillRect(24, 24, w - 48, 70);

  ctx.fillStyle = '#FF4B82';
  ctx.font = 'bold 13px monospace';
  ctx.fillText('ALAS CERITA EVENT ORGANIZER', 42, 50);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('OFFICIAL E-TICKET PASS · TIKET MASUK RESMI', 42, 74);

  ctx.fillStyle = '#FACC15';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'right';
  ctx.fillText('VERIFIED PASS', w - 44, 52);
  ctx.fillStyle = '#f9a8d4';
  ctx.font = '11px monospace';
  ctx.fillText('ONE-TIME SCAN ONLY', w - 44, 72);
  ctx.textAlign = 'left';

  // Event Details Box
  const eventY = 110;
  ctx.fillStyle = 'rgba(44, 20, 39, 0.9)';
  ctx.fillRect(36, eventY, w - 72, 130);
  ctx.strokeStyle = 'rgba(250, 204, 21, 0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(36, eventY, w - 72, 130);

  ctx.fillStyle = '#FACC15';
  ctx.font = 'bold 11px monospace';
  ctx.fillText('EVENT TALKSHOW SPESIAL 2026', 52, eventY + 28);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(event.title || 'Alas Cerita — Talkshow: Rerasan Mawi Makna', 52, eventY + 56);

  ctx.fillStyle = '#fed7aa';
  ctx.font = 'italic 14px serif';
  ctx.fillText('“Duduk Sejenak, Leren Kepenak”', 52, eventY + 80);

  ctx.fillStyle = '#fce7f3';
  ctx.font = '12px sans-serif';
  ctx.fillText(`📍 ${event.venue || 'Kalura Secret Garden'}, ${event.city || 'Yogyakarta'}`, 52, eventY + 110);

  ctx.fillStyle = '#FACC15';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'right';
  ctx.fillText('Minggu, 13 Des 2026 · 15:30 WIB', w - 52, eventY + 110);
  ctx.textAlign = 'left';

  // Attendee Info Section
  const attY = 256;
  ctx.fillStyle = '#21111f';
  ctx.fillRect(36, attY, w - 72, 230);
  ctx.strokeStyle = 'rgba(255, 75, 130, 0.35)';
  ctx.strokeRect(36, attY, w - 72, 230);

  ctx.fillStyle = '#FF4B82';
  ctx.font = 'bold 11px monospace';
  ctx.fillText('BIODATA PESERTA TERDAFTAR (BY NAME)', 52, attY + 28);

  // Attendee Name
  ctx.fillStyle = '#f9a8d4';
  ctx.font = '11px sans-serif';
  ctx.fillText('Nama Lengkap Peserta:', 52, attY + 54);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(ticket.attendeeName, 52, attY + 80);

  // NIK
  ctx.fillStyle = '#f9a8d4';
  ctx.font = '11px sans-serif';
  ctx.fillText('NIK (Nomor Induk Kependudukan):', 52, attY + 112);
  ctx.fillStyle = '#FACC15';
  ctx.font = 'bold 16px monospace';
  ctx.fillText(ticket.attendeeNik || `**${ticket.attendeeIdLast4 || '0000'}`, 52, attY + 132);

  // Phone & Email
  ctx.fillStyle = '#f9a8d4';
  ctx.font = '11px sans-serif';
  ctx.fillText('No. WhatsApp / HP:', 52, attY + 162);
  ctx.fillStyle = '#f8fafc';
  ctx.font = '13px monospace';
  ctx.fillText(ticket.attendeePhone || '-', 52, attY + 180);

  ctx.fillStyle = '#f9a8d4';
  ctx.font = '11px sans-serif';
  ctx.fillText('Alamat Email:', 340, attY + 162);
  ctx.fillStyle = '#f8fafc';
  ctx.font = '13px monospace';
  ctx.fillText(ticket.attendeeEmail || '-', 340, attY + 180);

  // Package bundle indicator pill
  if (ticket.packageName) {
    ctx.fillStyle = '#391629';
    ctx.fillRect(52, attY + 196, 360, 24);
    ctx.strokeStyle = '#FF4B82';
    ctx.strokeRect(52, attY + 196, 360, 24);

    ctx.fillStyle = '#FACC15';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(
      `BUNDLE: PAKET ${ticket.packageName.toUpperCase()} (PESERTA ${ticket.packageMemberIndex || 1} DARI ${ticket.packageTotalMembers || 1})`,
      60,
      attY + 212
    );
  }

  // QR Code & Barcode Verification Section
  const qrY = 504;
  ctx.fillStyle = '#ffffff';
  // White card for QR Code
  ctx.fillRect(48, qrY, w - 96, 350);

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
  const qrSize = 220;
  const qrX = (w - qrSize) / 2;
  ctx.drawImage(qrImg, qrX, qrY + 20, qrSize, qrSize);

  // Monospace ticket number
  ctx.fillStyle = '#2c1326';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('KODE TIKET RESMI (VISUAL ID):', w / 2, qrY + 265);

  ctx.fillStyle = '#FF4B82';
  ctx.font = '900 28px monospace';
  ctx.fillText(ticket.ticketNumber, w / 2, qrY + 298);

  ctx.fillStyle = '#475569';
  ctx.font = '11px sans-serif';
  ctx.fillText('Tunjukkan QR Code ini pada layar ponsel atau cetak untuk dipindai di pintu masuk', w / 2, qrY + 322);
  ctx.fillText(`Pintu: ${ticket.seat_or_gate || 'Gate Utama Kalura Garden'}`, w / 2, qrY + 338);
  ctx.textAlign = 'left';

  // Security Footer
  const footerY = 874;
  ctx.fillStyle = '#221120';
  ctx.fillRect(36, footerY, w - 72, 92);
  ctx.strokeStyle = 'rgba(250, 204, 21, 0.3)';
  ctx.strokeRect(36, footerY, w - 72, 92);

  ctx.fillStyle = '#FACC15';
  ctx.font = 'bold 11px monospace';
  ctx.fillText('🔒 SISTEM VALIDASI ANTI SCAN GANDA (ANTI-DOUBLE SCAN)', 52, footerY + 26);

  ctx.fillStyle = '#fce7f3';
  ctx.font = '10px sans-serif';
  ctx.fillText('• Tiket terenkripsi kriptografi UUID v4 dan hanya sah untuk 1 (satu) kali pemindaian masuk.', 52, footerY + 46);
  ctx.fillText('• Jika ada kendala layar retak / baterai habis, hubungi Posko Helpdesk Supervisor dengan KTP asli.', 52, footerY + 62);
  ctx.fillText('• Diterbitkan resmi oleh Panitia Pelaksana Alas Cerita (Kalura Secret Garden).', 52, footerY + 78);

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
