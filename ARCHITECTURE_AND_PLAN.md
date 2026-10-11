# TraceLens (FlowCraft Observability)
> **Modern Local-First & Zero-Lock-In Distributed Tracing Platform**
> *Chuẩn hóa theo OpenTelemetry & W3C TraceContext (2026 Edition)*

---

## 1. Tầm nhìn & Nguyên lý thiết kế (Core Philosophy)

### 1.1 Vấn đề cốt lõi
- **Encore / AWS X-Ray / Datadog**: Gây vendor lock-in, ép viết code theo SDK độc quyền hoặc hạ tầng phức tạp, chi phí cao trên cloud.
- **OpenTelemetry + Jaeger / Zipkin thuần túy**: Cực kỳ mạnh nhưng thiết lập local quá cồng kềnh (cần docker-compose, config OTel collector, YAML phức tạp), UI thô ráp và thiếu tính "in-app developer experience" (DX).
- **Backend Dev Node.js / Express**: Khi code local vẫn phải dùng `console.log`, không nhìn thấy request đi qua bao nhiêu middleware, tốn bao nhiêu ms, query DB nào, Redis hit hay miss.

### 1.2 Giải pháp TraceLens
1. **Zero-Lock-in & Zero-Refactor**: Code Express / Fastify / NestJS giữ nguyên 100%. Cài package là chạy.
2. **Cưỡi trên vai người khổng lồ (OTel & W3C Standard)**: Toàn bộ cấu trúc ID (`traceparent`), Span và Metadata tuân thủ 100% chuẩn OpenTelemetry & W3C. Điều này cho phép mở rộng không giới hạn sang Frontend (React/Vue), Database (Prisma/Drizzle/Redis), Microservices và đa ngôn ngữ (Go/Rust/Python) mà không phải đập đi xây lại.
3. **Local-First & Privacy-First**: Dữ liệu lưu trong Ring Buffer RAM của tiến trình Node local, không gửi telemetry ra ngoài, tự động ẩn secrets (passwords, JWT, credit cards).
4. **Embedded Micro-Dashboard**: Dashboard UI (`/__lens`) siêu nhẹ, thẩm mỹ chuẩn dark-mode hiện đại, kết hợp **Waterfall Timeline** (đo độ trễ) và **React Flow Topology** (vẽ bản đồ kiến trúc động).

---

## 2. Kiến trúc Monorepo Module (Khả năng mở rộng tối đa)

Để dự án mở rộng dễ dàng từ Express cho đến Microservices và Frontend, kiến trúc được chia thành **Monorepo** độc lập:

```
tracelens/
├── packages/
│   ├── protocol/          # [Trọng tâm chuẩn hóa] (Done 100%)
│   │   ├── w3c.ts         # Parser & Generator cho W3C traceparent (00-traceid-spanid-01)
│   │   ├── types.ts       # Span, Trace, HttpMetadata, ClientMetadata (OTel-compatible)
│   │   └── sanitizer.ts   # Masking sensitive data (Authorization, Passwords, Tokens)
│   │
│   ├── core/              # [Core Engine] (Done 100%)
│   │   ├── context.ts     # Node.js AsyncLocalStorage wrapper
│   │   ├── ring-buffer.ts # Circular buffer lưu N trace gần nhất (Zero memory leak)
│   │   └── hub.ts         # SSE streaming, In-memory Ingest & Event bus
│   │
│   ├── plugins/           # [Auto-Detection Plugins] (Done 100%)
│   │   ├── http/fetch.ts  # Tự động bắt outgoing fetch & inject W3C traceparent
│   │   ├── database/      # Tự động hook PostgreSQL (pg), MySQL (mysql2), Mongoose
│   │   ├── cache/         # Tự động hook Redis (ioredis) & tính cache hit/miss
│   │   └── orm/           # Tự động hook Prisma ($use middleware & $extends)
│   │
│   ├── express/           # [Express Adapter] (Done 100%)
│   │   ├── patcher.ts     # Monkey-patch Express Router & Layer handle
│   │   ├── middleware.ts  # Middleware đo đạc HTTP timing, headers, query, status
│   │   ├── ui-template.ts # Embedded Dashboard (Live Topology + Waterfall)
│   │   └── dashboard-routes.ts # Expose /__lens, /__lens/events, /__lens/api/ingest
│   │
│   └── browser/           # [Frontend SDK] (Done 100%)
│       ├── tracer.ts      # Bọc window.fetch & traceAction('checkout', 'Button')
│       └── index.ts       # Export initBrowserTracing & traceAction
│
└── examples/
    ├── express-demo/      # Order Service (Port 3000) & Web Store UI
    └── inventory-service/ # Inventory Microservice (Port 3001)
```

---

## 3. Tiêu chuẩn Dữ liệu (Data Contract - W3C & OTel Standard)

Mỗi Trace tuân thủ định dạng chuẩn quốc tế:

```json
{
  "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
  "rootSpanId": "00f067aa0ba902b7",
  "name": "POST /api/v1/orders",
  "timestamp": 1791704108000000,
  "durationMs": 48.6,
  "status": { "code": "OK" },
  "http": {
    "method": "POST",
    "route": "/api/v1/orders",
    "statusCode": 201,
    "clientIp": "127.0.0.1",
    "userAgent": "Mozilla/5.0..."
  },
  "spans": [
    {
      "spanId": "00f067aa0ba902b7",
      "parentSpanId": null,
      "name": "HTTP POST /api/v1/orders",
      "kind": "SERVER",
      "startTime": 1791704108000,
      "endTime": 1791704108048,
      "durationMs": 48.6
    },
    {
      "spanId": "5c3789ab612348cd",
      "parentSpanId": "00f067aa0ba902b7",
      "name": "authMiddleware",
      "kind": "INTERNAL",
      "durationMs": 4.1,
      "attributes": {
        "component": "express:middleware",
        "user.id": "usr_99"
      }
    },
    {
      "spanId": "8b5129ef993411ab",
      "parentSpanId": "00f067aa0ba902b7",
      "name": "orderController.create",
      "kind": "INTERNAL",
      "durationMs": 43.5,
      "children": [
        {
          "spanId": "91ab77cc88112233",
          "name": "redis.get user:cart",
          "kind": "CLIENT",
          "attributes": {
            "db.system": "redis",
            "db.operation": "GET",
            "cache.hit": false
          },
          "durationMs": 1.2
        },
        {
          "spanId": "44bb99aa11223344",
          "name": "db.orders.insert",
          "kind": "CLIENT",
          "attributes": {
            "db.system": "postgresql",
            "db.statement": "INSERT INTO orders (user_id, total) VALUES ($1, $2)"
          },
          "durationMs": 28.5
        }
      ]
    }
  ]
}
```

---

## 4. Dòng chảy Distributed Tracing khi mở rộng (End-to-End Flow)

```
[ FRONTEND (Browser / React / Next.js) ]
  │  Gắn header: `traceparent: 00-{traceId}-{spanId}-01`
  ▼
[ API GATEWAY / EXPRESS BACKEND ]
  │  AsyncLocalStorage bọc request context
  │  Đo từng middleware layer: cors -> auth -> rateLimit
  ├──► [ REDIS CACHE ] (Ghi nhận span: db.system = redis)
  ├──► [ DATABASE (Prisma/Drizzle) ] (Ghi nhận span: SQL + time)
  └──► [ MICROSERVICE B (NestJS / Go / Python) ]
         │ Truyền tiếp `traceparent` qua HTTP / gRPC header
         ▼
       [ TRACELENS HUB (Local In-Memory SSE Stream) ]
         ▼
       [ REAL-TIME DASHBOARD UI (http://localhost:PORT/__lens) ]
         - Topology Graph (React Flow)
         - Waterfall Timeline & Flame Graph
```

---

## 5. Lộ trình triển khai (Implementation Roadmap)

### 📌 Giai đoạn 1: Foundation & Express MVP (Done 100%)
- [x] Thiết lập pnpm workspace monorepo + TypeScript 5.x.
- [x] Xây dựng `@tracelens/protocol`: Tiêu chuẩn hóa W3C `traceparent` generator/parser & Span types.
- [x] Xây dựng `@tracelens/core`: `AsyncLocalStorage` context manager + Ring Buffer (100 items) + SSE Hub.
- [x] Xây dựng `@tracelens/express`:
  - Hook Express Router / Layer execution để bắt middleware duration.
  - Endpoint `/__lens` serve Dashboard.
  - Endpoint `/__lens/events` (SSE real-time feed).
- [x] Xây dựng `@tracelens/ui` (Embedded Dashboard):
  - Request List (Method badge, Path, Status, Duration, Timestamp, Clear RAM).
  - **Live Architecture Topology Map**: Vẽ luồng Client -> Express -> Database / Redis / External Services kèm hiệu ứng dòng chảy phát sáng.
  - **Waterfall Timeline Gantt View**: Hiển thị thanh thời gian chi tiết từng Layer/Middleware.
  - Dark mode cao cấp, responsive, mượt mà.

### 📌 Giai đoạn 2: Deep Context & ORM / Cache Auto-Detect (Done 100%)
- [x] Package `@tracelens/plugins`: Tự động nhận diện Database, ORM, Cache và Outgoing HTTP.
- [x] Tích hợp Outgoing `fetch`: Bắt latency và tự động chèn header W3C `traceparent`.
- [x] Tích hợp Plugin Prisma (`$use` middleware & `$extends`).
- [x] Tích hợp PostgreSQL (`pg`), MySQL (`mysql2`), MongoDB (`mongoose`).
- [x] Tích hợp Plugin Redis (`ioredis` hook) bắt hit/miss và query latency.
- [x] Tự động Sanitizer (ẩn token, mật khẩu, credit cards trong request/response body).

### 📌 Giai đoạn 3: Frontend Bridge & Full-Stack Tracing (Done 100%)
- [x] Package `@tracelens/browser`: SDK Frontend cho trình duyệt web (React, Vue, Next.js, Vanilla).
- [x] Tự động chèn header W3C `traceparent` vào `window.fetch`.
- [x] Bắt component name & user action qua `traceAction()` và header `x-tracelens-client`.
- [x] Live Topology Map hiển thị động Node `⚛️ React UI Component` nối sang Express API và Database.
- [x] Tạo ứng dụng Web Store Demo tại `http://localhost:3000` kết nối trực tiếp với Inspector `http://localhost:3000/__lens`.

### 📌 Giai đoạn 4: Distributed Microservices & Export (Done 100%)
- [x] **Distributed Microservices Correlation**: Tự động truyền header W3C `traceparent` qua HTTP calls giữa các dịch vụ.
- [x] Tạo **Order Service (Port 3000)** và **Inventory Microservice (Port 3001)** độc lập.
- [x] Cơ chế **Central Hub Ingestion (`/__lens/api/ingest`)**: Cho phép microservice phụ tự động đẩy spans về Hub chính để gộp chung vào 1 Trace Tree duy nhất.
- [x] **Live Multi-Service Topology Map**: Hiển thị chuỗi tương tác liên service: `[ React UI ] -> [ Order Service ] -> [ Inventory Microservice ] -> [ PostgreSQL / Redis ]`.
- [x] **Export Trace**: Xuất file JSON chuẩn OpenTelemetry ResourceSpans (OTLP), HAR 1.2 và copy cURL trực tiếp trên Dashboard UI.
- [x] **Hỗ trợ Fastify**: Package `@tracelens/fastify` tự động tích hợp qua Fastify hooks và serve Dashboard.
- [x] **Test Suite Toàn Diện**: Bộ kiểm thử tự động Vitest bao phủ W3C, Sanitizer, Exporter, RingBuffer, Hub SSE, Fetch plugin và Fastify adapter.
- [x] **Dashboard UI Analytics**: Real-time Metrics bar (Avg Latency, P95, Error rate), Search & Latency Filter, Error Alert Banner.

### 📌 Giai đoạn 5: Enterprise Hardening, NestJS & Advanced Observability (Done 100%)
- [x] **Package `@tracelens/nestjs`**: Cung cấp `TraceLensModule.forRoot()`, `TraceLensInterceptor`, decorator `@TraceSpan` và Middleware.
- [x] **Toàn diện Outgoing HTTP (`node:http` / `node:https`)**: Bắt 100% mọi HTTP client trong Node.js (Axios, Got, Superagent, Native http.request) và tự động chèn W3C `traceparent`.
- [x] **Event-Driven & Queue Tracing (`@tracelens/plugins/queue`)**: Tiện ích `injectQueueTrace` và `withJobContext` nối liền vết distributed tracing qua hàng đợi (BullMQ, Kafka, RabbitMQ, SQS).
- [x] **An toàn bộ nhớ (Memory Guard & Payload Truncation)**: Giới hạn kích thước payload trong RAM buffer, chống tràn RAM khi dev upload file lớn hoặc JSON dung lượng cao.
- [x] **Remote OTLP HTTP Background Exporter**: Tự động gom batch và gửi traces tới Jaeger / SigNoz / Tempo qua endpoint `/v1/traces`.
- [x] **Dashboard UI Flame Graph & Tree View**: Chế độ xem cây phân cấp lồng nhau cha-con, hiển thị thanh thời gian theo từng tầng.
- [x] **Span Diagnostic Inspector Modal**: Click vào bất kỳ span nào để xem chi tiết mã lỗi, attributes, tags và copy JSON report.
- [x] **Unified Multi-Service Demo Orchestrator**: Lệnh `pnpm demo` khởi chạy đồng thời Order Service (3000), Inventory Service (3001) và Fastify Notification (3002).
- [x] **Bộ kiểm thử toàn diện mở rộng**: 12/12 test suites, 32/32 tests passed 100%.

### 📌 Giai đoạn 6: AI Performance Advisor, 1-Click Replay, Trace Diff & SQL Engine (Done 100%)
- [x] **Service Deep-Dive Drawer**: Click vào Node Service trên Topology để giải phẫu nội bộ: Middleware, Controller Steps, Database, Cache và Network I/O.
- [x] **Helper `tracelens.step()`**: Tiện ích gắn cờ các chặng logic nghiệp vụ nội bộ zero-refactor.
- [x] **AI & Heuristic Performance Advisor (Tab AI PERFORMANCE ADVISOR)**:
  - Tự động phát hiện N+1 Queries lặp lại trong 1 request.
  - Cảnh báo cuộc gọi HTTP ra bên ngoài / Microservices chiếm tỷ trọng cao (>30% latency).
  - Phát hiện truy vấn Database thiếu lớp đệm Redis Cache hoặc Cache Miss.
  - Tính điểm hiệu năng Performance Score (0-100) & Tỷ lệ I/O Wait.
  - Nút **`🤖 Copy AI Fix Prompt`** tạo prompt kỹ thuật chi tiết để ném cho AI phân tích refactor code.
- [x] **1-Click Request Replay (`🔁 Replay`)**: Gửi lại request tức thì ngay trên Dashboard mà không cần mở Postman hay gõ cURL.
- [x] **Trace Differential Comparison (`⚖️ Diff`)**: So sánh trực quan Trace A vs Trace B với Δ Latency (-65% FASTER 🚀) và bảng đối chiếu Span-by-span.
- [x] **SQL Formatter & Syntax Highlighter**: Tự động nhận diện và tô màu cú pháp câu truy vấn SQL (Postgres, MySQL, Prisma) kèm nút Copy tiện lợi.

### 📌 Giai đoạn 7: Production-Grade Hardening, Advanced Frontend SDK & Real-time Protocols (Done 100%)
- [x] **Nâng cấp Toàn diện Frontend SDK ([`@tracelens/browser`](file:///f:/Dev/product/FlowCraft/packages/browser))**:
  - Hỗ trợ song song cả `window.fetch` và `XMLHttpRequest` (tự động bắt 100% request từ Axios, jQuery, XHR clients).
  - Tự động bắt lỗi unhandled trên trình duyệt (`window.onerror`, `unhandledrejection`) và gắn kèm metadata vào trace.
  - Đo lường hiệu năng mạng trình duyệt: DNS, TCP, TTFB, DOM Interactive, Page Load (`getNavigationPerformance`).
  - Cung cấp React helpers & HOF: `useTraceAction()`, `withTraceAction()`, `createTraceHeaders()`.
- [x] **Cơ chế Lấy mẫu Tải cao (Head & Tail/Adaptive Sampling)**:
  - Class [`Sampler`](file:///f:/Dev/product/FlowCraft/packages/core/src/sampling.ts) tích hợp vào Express, Fastify và NestJS.
  - Hỗ trợ `sampleRate` (0.0 - 1.0) giảm tải RAM/CPU khi traffic lớn.
  - **Tail Sampling thông minh**: Tự động giữ lại 100% trace bị lỗi (`alwaysSampleErrors`) hoặc trace bị chậm vượt ngưỡng (`slowLatencyThresholdMs`).
- [x] **Bảo vệ Dashboard Security (Auth Guard)**:
  - Hàm [`verifyDashboardAuth`](file:///f:/Dev/product/FlowCraft/packages/core/src/auth.ts) bảo vệ Dashboard `/__lens` và các Ingest API.
  - Hỗ trợ HTTP Basic Auth (`username`/`password`), Bearer Token, Query param `?token=` và custom validator function.
- [x] **Plugin Real-time WebSocket & Socket.io ([`@tracelens/plugins/websocket`](file:///f:/Dev/product/FlowCraft/packages/plugins/src/websocket))**:
  - Tiện ích `injectSocketTrace`, `extractSocketTrace`, `withSocketContext` kết nối trace liên mạch qua luồng real-time socket events.
- [x] **Kiểm thử Tự động Mở rộng**: 15/15 test suites, 47/47 tests passed 100%.

---

## 6. Trải nghiệm Lập trình viên (DX - Developer Experience)

Chỉ 2 dòng code duy nhất:

```typescript
import express from 'express';
import { tracelens } from '@tracelens/express';

const app = express();

// Khởi tạo TraceLens (tự động gắn tracer + mount dashboard vào /__lens)
tracelens.init(app, {
  endpoint: '/__lens', // Mở http://localhost:3000/__lens
  maxHistory: 100,     // Giữ 100 trace gần nhất trong RAM
});

// Giữ nguyên 100% routes và code của người dùng
app.use(express.json());
app.get('/api/users', userController.getUsers);

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
  console.log('TraceLens Dashboard: http://localhost:3000/__lens');
});
```
