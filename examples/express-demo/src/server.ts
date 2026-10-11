import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { tracelens, startSpan } from '@tracelens/express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// 1. Khởi tạo TraceLens cho Order Service (Hub trung tâm)
tracelens.init(app, {
  serviceName: 'Order Service',
  endpoint: '/__lens',
  maxHistory: 100,
});

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// 2. Các middleware thông thường (TraceLens tự động đo lường)
function corsMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  setTimeout(() => next(), 5); // giả lập 5ms CORS check
}

function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  setTimeout(() => next(), 12); // giả lập 12ms JWT validation
}

app.use(corsMiddleware);

// 3. API Routes thông thường
app.get('/api/users', authMiddleware, async (req, res) => {
  // Giả lập database query
  await startSpan('db.users.findMany', 'CLIENT', { 'db.system': 'postgresql' }, async () => {
    await new Promise((r) => setTimeout(r, 28));
  });

  res.json({
    users: [
      { id: 'usr_1', name: 'Alice', role: 'admin' },
      { id: 'usr_2', name: 'Bob', role: 'developer' },
    ],
  });
});

app.post('/api/orders', authMiddleware, async (req, res) => {
  console.info(`🛒 New order checkout initiated for items count: ${req.body?.items || 1}`);

  // 1. Bước nghiệp vụ nội bộ (Business Step Logic)
  await tracelens.step('Validate Cart & Customer Eligibility', async () => {
    await new Promise((r) => setTimeout(r, 8));
  });

  // 2. Check Redis cache
  console.warn('⚠️ Checking Redis cache key: stock:item_12');
  await startSpan('redis.get stock:item_12', 'CLIENT', { 'db.system': 'redis', 'cache.hit': true }, async () => {
    await new Promise((r) => setTimeout(r, 4));
  });

  // 2. Gọi sang Microservice B (Inventory - Express) - Tự động truyền W3C header traceparent
  let inventoryData = null;
  try {
    const invRes = await fetch('http://localhost:3001/api/inventory/deduct', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ itemId: 'item_12', quantity: req.body?.items || 1 }),
    });
    inventoryData = await invRes.json();
  } catch (err) {
    console.error('Lỗi gọi Inventory Service:', err);
  }

  // 3. Gọi sang Microservice C (Notification - Fastify) - Tự động truyền W3C header traceparent
  let notificationData = null;
  try {
    const notifRes = await fetch('http://localhost:3002/api/notify/order-placed', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ orderId: 'ord_9901', customerEmail: 'alice@company.io' }),
    });
    notificationData = await notifRes.json();
  } catch (err) {
    console.error('Lỗi gọi Fastify Notification Service:', err);
  }

  // 4. Insert DB của Order Service
  console.log('💾 Writing order ord_9901 into PostgreSQL database');
  await startSpan('db.orders.insert', 'CLIENT', { 'db.system': 'postgresql' }, async () => {
    await new Promise((r) => setTimeout(r, 35));
  });

  res.status(201).json({
    orderId: 'ord_9901',
    status: 'created',
    items: req.body?.items || 1,
    inventory: inventoryData,
    notification: notificationData,
  });
});

// Route kiểm chứng Real-time WebSocket Tracing Plugin
app.post('/api/socket-test', async (req, res) => {
  const { injectSocketTrace, withSocketContext } = await import('@tracelens/plugins');

  const socketPayload = injectSocketTrace(
    { message: 'Live order status update', orderId: 'ord_9901', status: 'shipped' },
    'order:status_update',
    'room_order_9901'
  );

  console.info('⚡ Emitting real-time WebSocket event: order:status_update');

  const result = await withSocketContext('order:status_update', socketPayload, async () => {
    await new Promise((r) => setTimeout(r, 18));
    console.log('📬 Client acknowledgment received via socket channel');
    return { delivered: true, timestamp: Date.now() };
  });

  res.json({ success: true, socketResult: result, payload: socketPayload });
});


// 4. Route kiểm chứng AUTO-DETECTION: Tự động bắt Outgoing HTTP (fetch) ra ngoài
app.get('/api/external-call', async (req, res) => {
  try {
    // Không cần bọc gì cả! TraceLens tự động instrument global fetch
    const response = await fetch('https://httpbin.org/get');
    const data = await response.json();
    res.json({ success: true, externalStatus: response.status, data });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// 5. Route kiểm chứng Prisma Tracing
// Giả lập Prisma client với middleware tracing
const mockPrisma = {
  middlewares: [] as any[],
  $use(fn: any) {
    this.middlewares.push(fn);
  },
  async userFindUnique(id: string) {
    const params = { model: 'User', action: 'findUnique', args: { where: { id } } };
    let runner = async () => {
      await new Promise((r) => setTimeout(r, 22));
      return { id, name: 'Alice', email: 'alice@example.com' };
    };
    for (const mw of this.middlewares) {
      const next = runner;
      runner = () => mw(params, next);
    }
    return runner();
  },
};
tracelens.attachPrismaTracing(mockPrisma);

app.get('/api/prisma-test', async (req, res) => {
  const user = await mockPrisma.userFindUnique('usr_101');
  res.json({ message: 'Prisma query executed & tracked automatically', user });
});

app.get('/api/error-test', (req, res) => {
  res.status(500).json({ error: 'Internal server error example' });
});

app.listen(PORT, () => {
  console.log(`🚀 Demo server is running at: http://localhost:${PORT}`);
  console.log(`📊 Open TraceLens Dashboard at: http://localhost:${PORT}/__lens`);
});
