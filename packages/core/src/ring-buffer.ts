/**
 * Circular Ring Buffer cố định kích thước
 * Đảm bảo bộ nhớ RAM luôn bị chặn ở mức tối đa maxItems, tự động ghi đè bản ghi cũ nhất (FIFO).
 */
export class RingBuffer<T> {
  private buffer: (T | undefined)[];
  private capacity: number;
  private pointer = 0;
  private size = 0;

  constructor(capacity = 100) {
    this.capacity = Math.max(10, capacity);
    this.buffer = new Array(this.capacity);
  }

  push(item: T): void {
    this.buffer[this.pointer] = item;
    this.pointer = (this.pointer + 1) % this.capacity;
    if (this.size < this.capacity) {
      this.size++;
    }
  }

  /**
   * Lấy toàn bộ items theo thứ tự từ mới nhất đến cũ nhất
   */
  getAll(): T[] {
    const result: T[] = [];
    if (this.size === 0) return result;

    let index = (this.pointer - 1 + this.capacity) % this.capacity;
    for (let i = 0; i < this.size; i++) {
      const item = this.buffer[index];
      if (item !== undefined) {
        result.push(item);
      }
      index = (index - 1 + this.capacity) % this.capacity;
    }
    return result;
  }

  /**
   * Tìm item theo predicate (ví dụ theo traceId)
   */
  find(predicate: (item: T) => boolean): T | undefined {
    return this.getAll().find(predicate);
  }

  clear(): void {
    this.buffer = new Array(this.capacity);
    this.pointer = 0;
    this.size = 0;
  }

  get length(): number {
    return this.size;
  }
}
