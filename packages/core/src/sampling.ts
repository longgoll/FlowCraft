import type { SamplingOptions, TraceRecord } from '@tracelens/protocol';

/**
 * Quản lý lấy mẫu (Head & Tail Sampling)
 * Giúp kiểm soát bộ nhớ RAM và throughput trong môi trường Production
 */
export class Sampler {
  private sampleRate: number;
  private alwaysSampleErrors: boolean;
  private slowLatencyThresholdMs?: number;

  constructor(options?: SamplingOptions) {
    this.sampleRate = typeof options?.sampleRate === 'number' ? Math.max(0, Math.min(1, options.sampleRate)) : 1.0;
    this.alwaysSampleErrors = options?.alwaysSampleErrors !== false;
    this.slowLatencyThresholdMs = options?.slowLatencyThresholdMs;
  }

  /**
   * Head Sampling: Quyết định ngay khi request bắt đầu
   */
  shouldSampleHead(): boolean {
    if (this.sampleRate >= 1.0) return true;
    if (this.sampleRate <= 0.0) return false;
    return Math.random() < this.sampleRate;
  }

  /**
   * Tail Sampling: Quyết định khi request kết thúc
   * Ngay cả khi Head Sampling là false, nếu request bị lỗi hoặc chạy quá ngưỡng chậm thì vẫn giữ lại!
   */
  shouldKeepTrace(trace: TraceRecord, headSampled: boolean): boolean {
    if (headSampled) return true;

    // 1. Kiểm tra mã lỗi
    const isError =
      trace.status?.code === 'ERROR' ||
      (trace.http?.statusCode !== undefined && trace.http.statusCode >= 400);

    if (isError && this.alwaysSampleErrors) {
      return true;
    }

    // 2. Kiểm tra độ trễ (Slow request tail-sampling)
    if (this.slowLatencyThresholdMs && trace.durationMs >= this.slowLatencyThresholdMs) {
      return true;
    }

    return false;
  }
}
