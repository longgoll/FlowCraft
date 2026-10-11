# ⚡ TraceLens (FlowCraft Observability)

> **Zero-Lock-in & Local-First Distributed Tracing & Observability Platform**  
> *Được chuẩn hóa 100% theo tiêu chuẩn W3C TraceContext và OpenTelemetry (2026 Edition).*

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![pnpm Version](https://img.shields.io/badge/pnpm-10.4.1-orange.svg)](https://pnpm.io/)
[![Standard](https://img.shields.io/badge/standard-W3C%20TraceContext%20%7C%20OpenTelemetry-indigo.svg)](https://www.w3.org/TR/trace-context/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## 📖 Giới thiệu (Overview)

**TraceLens** là nền tảng quan sát và truy vết phân tán (Distributed Tracing) chạy trực tiếp tại localhost trong quá trình phát triển (Local Development), giải quyết triệt để các vấn đề:

* **Không Vendor Lock-in (Khác với Encore)**: Bạn giữ nguyên 100% code Express, Fastify hay NestJS hiện tại. Không phải viết lại routing, không phải học SDK độc quyền.
* **Không cồng kềnh (Khác với OpenTelemetry/Jaeger thuần)**: Không cần cài đặt Docker, không cần OTel Collector, không tốn tài nguyên máy tính. Toàn bộ lưu trữ trong RAM (Ring Buffer FIFO, zero memory leak).
* **Trực quan hóa Live Topology (Khác với Datadog tốn phí)**: Tự động vẽ bản đồ kiến trúc động từ Frontend (React/Vue) xuyên qua Microservices đến tận CSDL (PostgreSQL/Prisma/MySQL) và Cache (Redis).

```
[ ⚛️ React UI: CheckoutButton ]
               │
               ▼ (W3C Header: traceparent: 00-4bf92f...-01)
[ 🚀 Order Service (Port 3000) ]
               ├──► [ ⚡ Redis Cache (HIT: stock:item_12 - 16ms) ]
               │
               ├──► [ 📦 Inventory Microservice (Port 3001) ]
               │         └──► [ 🗄️ PostgreSQL (inventory_db - 28ms) ]
               │
               └──► [ 🗄️ PostgreSQL (orders_db - 37ms) ]
```

---

## ✨ Tính năng Nổi bật (Key Features)

### 1. Zero-Refactor Express Adapter
Chỉ cần **1 dòng code duy nhất** để khởi chạy cả tracing engine và Web Dashboard Inspector:
```typescript
import { tracelens } from '@tracelens/express';

tracelens.init(app, {
  serviceName: 'Order Service',
  endpoint: '/__lens', // Mở http://localhost:3000/__lens
});
```

### 2. Auto-Detection Plugins (Tự động nhận diện không cần cấu hình)
TraceLens tự động hook và bóc tách dữ liệu của:
* **Outgoing HTTP**: Tự động bọc global `fetch`, đo độ trễ các cuộc gọi ra ngoài (Stripe, OpenAI, Microservices) và tự inject header W3C `traceparent`.
* **Database & ORM**: PostgreSQL (`pg`), MySQL (`mysql2`), MongoDB (`mongoose`), Prisma ORM (`$use` & `$extends`).
* **Cache**: Redis (`ioredis` / `redis`) — tự động suy luận trạng thái **CACHE HIT** hay **CACHE MISS**.

### 3. Frontend Browser SDK (`@tracelens/browser`)
Bọc `window.fetch` trên trình duyệt React, Vue, Next.js để biến các cú click chuột thành span đầu tiên trong chuỗi phân tán:
```typescript
import { traceAction } from '@tracelens/browser';

// Bọc nút bấm để hiển thị component name trên Dashboard
await traceAction('checkout_submit', 'CheckoutButton', async () => {
  await fetch('/api/orders', { method: 'POST', body: ... });
});
```

### 4. Distributed Microservices Correlation
Khi Service A gọi Service B qua HTTP, Service B đọc header `traceparent` và đẩy spans về Hub trung tâm qua endpoint Ingestion (`/__lens/api/ingest`). Cả hai service được gộp chung vào một Trace Tree duy nhất.

### 5. In-App Live Inspector Dashboard (`/__lens`)
* **Live Architecture Topology Map**: Bản đồ đồ họa các Node tương tác kèm hiệu ứng dòng chảy dữ liệu phát sáng (`flow-line` neon animation).
* **Waterfall Timeline Gantt View**: Đo lường chính xác từng mili-giây của middleware, database query và network latency.
* **HTTP Metadata Sanitizer**: Tự động ẩn các trường nhạy cảm như Passwords, JWT Tokens, Cookies, Credit Cards.
* **Server-Sent Events (SSE)**: Stream dữ liệu tức thì từ server lên giao diện không cần reload trang.

---

## 🏛️ Cấu trúc Monorepo (Monorepo Packages)

```
FlowCraft/
├── packages/
│   ├── protocol/     # Chuẩn W3C TraceContext, OTel types, Exporters (OTel, HAR, cURL) & Sanitizer
│   ├── core/         # AsyncLocalStorage engine, Ring Buffer FIFO & SSE Hub
│   ├── plugins/      # Auto-detection cho Postgres, MySQL, Mongo, Redis, Prisma, Fetch
│   ├── express/      # Express Router Patcher, Middleware W3C & Embedded Dashboard UI
│   ├── fastify/      # Fastify Plugin Adapter (zero-config hooks + dashboard)
│   └── browser/      # Frontend Browser SDK cho React / Next.js / Vue
│
└── examples/
    ├── express-demo/        # Order Service (Port 3000) + Web Store Client Demo
    └── inventory-service/   # Inventory Microservice (Port 3001)
```


---

## 🚀 Hướng dẫn Chạy Thử Nghiệm Nhanh (Quickstart)

### 1. Cài đặt & Build
```bash
# Cài đặt toàn bộ dependencies trong monorepo
pnpm install

# Build tất cả các packages
pnpm build
```

### 2. Khởi chạy Hệ thống Multi-Framework Microservices Demo
Chạy các dịch vụ (Order Service Express, Inventory Express, Notification Fastify):

**Terminal 1 — Order Service & Web Store (Port 3000):**
```bash
pnpm demo:order
```

**Terminal 2 — Inventory Microservice (Express - Port 3001):**
```bash
pnpm demo:inventory
```

**Terminal 3 — Notification Microservice (Fastify - Port 3002):**
```bash
pnpm demo:fastify
```

### 3. Trải nghiệm Giao diện Trực quan & Multi-Service Tracing
1. **Cửa hàng Web Store**: Mở trình duyệt vào [http://localhost:3000](http://localhost:3000) và bấm nút **"Đặt Mua Ngay (Multi-Service Flow)"**.
2. **TraceLens Inspector**: Mở [http://localhost:3000/__lens](http://localhost:3000/__lens) để chiêm ngưỡng **Live Architecture Topology Map** kết nối từ:
   `[ ⚛️ React UI ] ➜ [ 🚀 Order Service (:3000) ] ➜ [ 📦 Inventory (:3001) ] & [ ⚡ Fastify Notification (:3002) ] ➜ [ 🗄️ PostgreSQL / Redis ]`!
3. **Export Traces**: Click vào nút **OTel JSON**, **HAR 1.2** hoặc **cURL** ngay trên thanh công cụ để xuất dữ liệu chuẩn OpenTelemetry!
4. **Bộ Test Suite**: Chạy `pnpm test` để kiểm thử toàn diện 22 unit & integration tests với Vitest.


---

## 📋 Data Contract (Chuẩn Dữ Liệu Trace)

```json
{
  "id": "112233445566778899aabbccddeeff00",
  "name": "POST /api/orders",
  "durationMs": 196,
  "serviceName": "Order Service",
  "http": {
    "method": "POST",
    "path": "/api/orders",
    "statusCode": 201,
    "client": {
      "service": "React Web App",
      "component": "CheckoutButton",
      "action": "checkout_submit"
    }
  },
  "spans": [
    { "serviceName": "Order Service", "name": "POST /api/orders", "kind": "SERVER", "durationMs": 196 },
    { "serviceName": "Order Service", "name": "redis.get stock:item_12", "kind": "CLIENT", "attributes": { "cache.hit": true }, "durationMs": 16 },
    { "serviceName": "Order Service", "name": "HTTP POST localhost/api/inventory/deduct", "kind": "CLIENT", "durationMs": 102 },
    { "serviceName": "Inventory Microservice", "name": "POST /api/inventory/deduct", "kind": "SERVER", "durationMs": 45 },
    { "serviceName": "Inventory Microservice", "name": "db.inventory.deductStock", "kind": "CLIENT", "durationMs": 28 },
    { "serviceName": "Order Service", "name": "db.orders.insert", "kind": "CLIENT", "durationMs": 37 }
  ]
}
```

---

## 🗺️ Lộ trình Phát triển (Roadmap)

- [x] **Phase 1: Foundation & Express MVP** (W3C protocol, AsyncLocalStorage, Ring Buffer, SSE Dashboard)
- [x] **Phase 2: Auto-Detection Plugins** (Postgres, MySQL, Mongo, Redis hit/miss, Prisma, Outgoing Fetch & Native HTTP)
- [x] **Phase 3: Frontend Browser SDK** (`@tracelens/browser` + Live Topology React Node)
- [x] **Phase 4: Distributed Microservices Correlation** (Inter-service HTTP tracing + Central Hub Ingest)
- [x] **Phase 5: Adapters cho Fastify & NestJS** (`@tracelens/fastify` & `@tracelens/nestjs` with `@TraceSpan` decorator)
- [x] **Phase 6: OTel Exporter & Live Exporters** (Xuất OTLP JSON / HAR / cURL + Background OTLP HTTP Push tới Jaeger / SigNoz)
- [x] **Phase 7: Advanced Visualizers** (Hierarchical Flame Graph, Span Diagnostic Inspector Modal, Queue/Job Tracing)

---

## 📄 Bản quyền (License)

Dự án được phân phối dưới giấy phép [MIT](LICENSE).
