import Fastify from 'fastify';
import { tracelensFastifyPlugin, startSpan } from '@tracelens/fastify';

const app = Fastify({ logger: false });
const PORT = 3002;

// Khởi tạo TraceLens cho Fastify Service (kết nối về Hub trung tâm ở port 3000)
await app.register(tracelensFastifyPlugin, {
  serviceName: 'Fastify Notification Service',
  hubUrl: 'http://localhost:3000/__lens/api/ingest',
  endpoint: '/__lens',
});

// API gửi thông báo qua Email & Push notification
app.post('/api/notify/order-placed', async (req, _reply) => {
  const { orderId = 'ord_default', customerEmail = 'customer@example.com' } = (req.body as any) || {};

  // Giả lập gửi email qua SMTP
  await startSpan('smtp.sendOrderConfirmation', 'CLIENT', {
    'email.to': customerEmail,
    'email.template': 'order_receipt_v2',
  }, async () => {
    await new Promise((r) => setTimeout(r, 20));
  });

  // Giả lập đẩy push notification qua Firebase Cloud Messaging (FCM)
  await startSpan('fcm.sendPushNotification', 'CLIENT', {
    'push.channel': 'mobile_order_updates',
    'push.priority': 'high',
  }, async () => {
    await new Promise((r) => setTimeout(r, 12));
  });

  return {
    success: true,
    orderId,
    delivered: true,
    channels: ['email', 'fcm_push'],
    service: 'Fastify Notification Service',
  };
});

try {
  await app.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`⚡ [Fastify Notification Service] running on http://localhost:${PORT}`);
  console.log(`📊 Local Fastify Inspector at: http://localhost:${PORT}/__lens`);
} catch (err) {
  console.error(err);
  process.exit(1);
}
