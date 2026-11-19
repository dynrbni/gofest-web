import PDFDocument from 'pdfkit';
import { prisma } from '../../lib/prisma';
import { readPrivateFile } from '../../lib/storage';

const regular = require.resolve('@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff');
const semibold = require.resolve('@fontsource/noto-sans/files/noto-sans-latin-600-normal.woff');
const ink = '#111827';
const blue = '#0052CC';
const muted = '#475569';
const border = '#CBD5E1';
const left = 64;

export async function createOrderTicketPdf(orderCode: string, recipient: string) {
  const order = await prisma.order.findUnique({
    where: { orderCode },
    select: {
      buyerEmail: true,
      event: {
        select: {
          title: true,
          startsAt: true,
          endsAt: true,
          timezone: true,
          type: true,
          venueName: true,
          address: true,
          city: true,
          onlineAccessUrl: true,
        },
      },
      tickets: {
        where: { status: { in: ['VALID', 'CHECKED_IN'] } },
        select: {
          ticketCode: true,
          holderName: true,
          qrImageKey: true,
          ticketType: { select: { name: true } },
        },
        orderBy: { ticketCode: 'asc' },
      },
    },
  });
  if (!order?.tickets.length || order.buyerEmail !== recipient) return null;
  const event = order.event;
  const date = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: event.timezone,
  });
  const location =
    event.type === 'ONLINE'
      ? 'Acara online'
      : [event.venueName, event.address, event.city].filter(Boolean).join(' · ');

  const doc = new PDFDocument({
    size: 'A4',
    autoFirstPage: false,
    margin: 40,
    info: { Title: `E-Ticket Gofest · ${orderCode}`, Author: 'Gofest' },
  });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  const output = new Promise<Buffer>((resolve, reject) => {
    doc.once('end', () => resolve(Buffer.concat(chunks)));
    doc.once('error', reject);
  });
  const qrImages = await Promise.all(
    order.tickets.map((ticket) => readPrivateFile(ticket.qrImageKey)),
  );

  order.tickets.forEach((ticket, index) => {
    doc.addPage();
    doc.roundedRect(40, 40, doc.page.width - 80, 520, 12).stroke(border);
    doc.font(semibold).fontSize(16).fillColor(blue).text('Gofest · E-Ticket', left, 64);
    doc.fontSize(24).fillColor(ink).text(event.title, left, 104, {
      width: 462,
      height: 106,
      ellipsis: true,
    });
    doc
      .font(regular)
      .fontSize(11)
      .fillColor(muted)
      .text(`${date.format(event.startsAt)} – ${date.format(event.endsAt)}`, left, 222, {
        width: 462,
      });
    doc.moveTo(left, 261).lineTo(530, 261).stroke(border);

    function field(label: string, value: string, y: number) {
      doc.font(regular).fontSize(9).fillColor(muted).text(label, left, y);
      doc
        .font(semibold)
        .fontSize(12)
        .fillColor(ink)
        .text(value, left, y + 16, {
          width: 250,
          height: 42,
          ellipsis: true,
        });
    }
    field('PEMEGANG TIKET', ticket.holderName, 281);
    field('KATEGORI', ticket.ticketType.name, 345);
    field('LOKASI', location, 409);
    if (event.type === 'ONLINE' && event.onlineAccessUrl) {
      doc.font(regular).fontSize(10).fillColor(blue).text('Buka tautan acara', left, 454, {
        link: event.onlineAccessUrl,
        underline: true,
        width: 250,
      });
    }

    doc.image(qrImages[index]!, 351, 282, { fit: [160, 160] });
    doc.font(semibold).fontSize(12).fillColor(ink).text(ticket.ticketCode, 351, 450, {
      width: 160,
      align: 'center',
    });
    doc.moveTo(left, 496).lineTo(530, 496).stroke(border);
    doc.font(regular).fontSize(10).fillColor(muted).text(`Pesanan ${orderCode}`, left, 518);
  });

  doc.end();
  return output;
}
