import { randomUUID } from 'node:crypto';
import { createApp } from '../src/app';
import { env } from '../src/config/env';
import { prisma } from '../src/lib/prisma';
import { removePrivateObject } from '../src/lib/storage';
import { checkoutCustomerDetails, registerAgent, PASSWORD } from './helpers';

async function main() {
  const [, , action, email] = process.argv;
  if (
    !env.isDevelopment ||
    env.EMAIL_PROVIDER !== 'console' ||
    !/^qa-customer-[a-z0-9-]+@example\.com$/.test(email ?? '')
  )
    throw new Error(
      'Customer fixture requires local development, console mail and an isolated QA email.',
    );
  try {
    if (action === 'setup') {
      const app = createApp();
      const { agent } = await registerAgent(app, email);
      const event = await prisma.event.findFirstOrThrow({
        where: { isDemo: true, status: 'PUBLISHED', startsAt: { gt: new Date() } },
        include: { ticketTypes: { where: { isActive: true }, orderBy: { price: 'asc' } } },
        orderBy: { startsAt: 'asc' },
      });
      const ticketType = event.ticketTypes.find(
        (ticket) => ticket.quotaTotal - ticket.quantitySold - ticket.quantityReserved >= 5,
      );
      if (!ticketType)
        throw new Error('Demo event needs five available tickets for the customer flow.');
      const orders = [];
      for (const quantity of [2, 1, 1]) {
        const items = [{ ticketTypeId: ticketType.id, quantity }];
        const result = await agent.post('/api/v1/orders').send({
          eventId: event.id,
          buyerName: 'Pengguna Uji',
          buyerEmail: email,
          buyerPhone: '081234567890',
          items,
          ...checkoutCustomerDetails(items, 'Pemilik Tiket Uji', email),
          acceptTerms: true,
          idempotencyKey: randomUUID(),
        });
        if (result.status !== 201) throw new Error(`Order setup failed: ${result.status}`);
        const order = result.body.data.order;
        if (orders.length < 2) {
          const paid = await agent.post(`/api/v1/orders/${order.orderCode}/mock-pay`);
          if (paid.status !== 200) throw new Error(`Mock payment failed: ${paid.status}`);
        }
        orders.push(order);
      }
      const used = await prisma.ticket.findFirstOrThrow({ where: { orderId: orders[1]!.id } });
      await prisma.ticket.update({
        where: { id: used.id },
        data: { status: 'CHECKED_IN', checkedInAt: new Date() },
      });
      const tickets = await prisma.ticket.findMany({
        where: { orderId: orders[0]!.id },
        orderBy: { issuedAt: 'asc' },
      });
      await prisma.ticket.update({ where: { id: tickets[1]!.id }, data: { status: 'REFUNDED' } });
      console.log(
        `FIXTURE:${JSON.stringify({ email, password: PASSWORD, eventTitle: event.title, orderId: orders[0]!.id, pendingId: orders[2]!.id, ticketCode: tickets[0]!.ticketCode, usedCode: used.ticketCode })}`,
      );
    } else if (action === 'cleanup') {
      const orders = await prisma.order.findMany({
        where: { buyerEmail: email },
        include: { items: true, tickets: { select: { qrImageKey: true } } },
      });
      await prisma.$transaction(async (tx) => {
        for (const order of orders) {
          for (const item of order.items) {
            if (order.paidAt)
              await tx.ticketType.update({
                where: { id: item.ticketTypeId },
                data: { quantitySold: { decrement: item.quantity } },
              });
            else if (order.status === 'PENDING_PAYMENT')
              await tx.ticketType.update({
                where: { id: item.ticketTypeId },
                data: { quantityReserved: { decrement: item.quantity } },
              });
          }
          await tx.order.delete({ where: { id: order.id } });
        }
        await tx.user.deleteMany({ where: { email } });
        await tx.registrationChallenge.deleteMany({ where: { email } });
        await tx.emailNotification.deleteMany({ where: { to: email } });
      });
      await Promise.all(
        orders.flatMap((order) =>
          order.tickets.map((ticket) => removePrivateObject(ticket.qrImageKey)),
        ),
      );
    } else throw new Error('Unknown fixture action');
  } finally {
    await prisma.$disconnect();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
