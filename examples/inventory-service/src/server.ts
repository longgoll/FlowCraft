import express from 'express';
import { tracelens, startSpan } from '@tracelens/express';

const app = express();
const PORT = 3001;

// Khởi tạo TraceLens cho Microservice B (kết nối về Hub trung tâm ở port 3000)
tracelens.init(app, {
  serviceName: 'Inventory Microservice',
  hubUrl: 'http://localhost:3000/__lens/api/ingest',
});

app.use(express.json());

// API giảm trừ tồn kho của Microservice B
app.post('/api/inventory/deduct', async (req, res) => {
  const { itemId = 'item_12', quantity = 1 } = req.body || {};

  // Giả lập query Database nội bộ của Inventory Service
  await startSpan('db.inventory.deductStock', 'CLIENT', {
    'db.system': 'postgresql',
    'db.statement': `UPDATE inventory SET stock = stock - ${quantity} WHERE item_id = '${itemId}'`,
  }, async () => {
    await new Promise((r) => setTimeout(r, 18));
  });

  res.json({
    success: true,
    itemId,
    deducted: quantity,
    remainingStock: 42,
    service: 'Inventory Microservice',
  });
});

app.listen(PORT, () => {
  console.log(`📦 [Inventory Microservice] running on http://localhost:${PORT}`);
});
