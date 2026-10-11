export type SpanKind = 'SERVER' | 'CLIENT' | 'INTERNAL' | 'PRODUCER' | 'CONSUMER';

export type StatusCode = 'UNSET' | 'OK' | 'ERROR';

export interface SpanStatus {
  code: StatusCode;
  message?: string;
}

export interface SpanEvent {
  name: string;
  timestamp: number;
  attributes?: Record<string, unknown>;
}

export interface SpanLog {
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  attributes?: Record<string, unknown>;
}

export interface SpanData {
  traceId: string;
  spanId: string;
  parentSpanId: string | null;
  serviceName?: string;   // Tên microservice sản sinh ra span này
  name: string;
  kind: SpanKind;
  startTime: number;      // Epoch ms (or performance.now offset)
  endTime: number;        // Epoch ms
  durationMs: number;
  status: SpanStatus;
  attributes: Record<string, unknown>;
  events?: SpanEvent[];
  logs?: SpanLog[];
  children?: SpanData[];
}

export interface ClientMetadata {
  service?: string;
  component?: string;
  action?: string;
  url?: string;
}

export interface HttpMetadata {
  method: string;
  url: string;
  path: string;
  route?: string;
  statusCode: number;
  clientIp?: string;
  userAgent?: string;
  client?: ClientMetadata;
  headers?: Record<string, string>;
  query?: Record<string, unknown>;
  params?: Record<string, unknown>;
  body?: unknown;
}

export interface TraceRecord {
  id: string;             // traceId
  timestamp: number;      // Request start time
  rootSpanId: string;
  serviceName?: string;
  name: string;
  durationMs: number;
  http?: HttpMetadata;
  status: SpanStatus;
  spans: SpanData[];
}

export interface SamplingOptions {
  /**
   * Tỷ lệ lấy mẫu ngẫu nhiên từ 0.0 (0%) đến 1.0 (100%). Mặc định: 1.0
   */
  sampleRate?: number;
  /**
   * Luôn lưu lại trace khi xảy ra lỗi (statusCode >= 400 hoặc span error) kể cả khi sampleRate < 1.0. Mặc định: true
   */
  alwaysSampleErrors?: boolean;
  /**
   * Tail sampling: Luôn lưu lại trace nếu thời gian phản hồi vượt quá ngưỡng (ms). Ví dụ: 1000
   */
  slowLatencyThresholdMs?: number;
}

export interface DashboardAuthOptions {
  /**
   * HTTP Basic Auth username
   */
  username?: string;
  /**
   * HTTP Basic Auth password
   */
  password?: string;
  /**
   * Bearer token hoặc query param ?token=
   */
  token?: string;
  /**
   * Hàm kiểm tra tùy chỉnh
   */
  validate?: (req: any) => boolean;
}

export interface TraceLensInitOptions {
  /**
   * Tên định danh của Microservice (ví dụ: 'Order Service', 'Inventory Service')
   */
  serviceName?: string;
  /**
   * URL của TraceLens Hub trung tâm để gửi trace về (ví dụ: 'http://localhost:3000/__lens/api/ingest')
   */
  hubUrl?: string;
  /**
   * Endpoint Dashboard UI (mặc định: '/__lens')
   */
  endpoint?: string;
  /**
   * Số lượng trace tối đa lưu trong RAM (mặc định: 100)
   */
  maxHistory?: number;
  /**
   * Tự động bắt query & params (mặc định: true)
   */
  captureArgs?: boolean;
  /**
   * Tự động bắt request body (mặc định: false để tránh data lớn)
   */
  captureBody?: boolean;
  /**
   * Cấu hình Sampling Rate cho môi trường tải cao / Production
   */
  sampling?: SamplingOptions;
  /**
   * Cấu hình bảo vệ Dashboard UI & Ingest API bằng mật khẩu hoặc Token
   */
  auth?: DashboardAuthOptions;
  /**
   * Tự động tương quan console.log, console.warn, console.error vào Active Span (mặc định: true)
   */
  captureConsole?: boolean;
  /**
   * Webhook URL (Slack, Telegram, Discord) nhận thông báo khi có lỗi nghiêm trọng
   */
  webhookAlertUrl?: string;
}
