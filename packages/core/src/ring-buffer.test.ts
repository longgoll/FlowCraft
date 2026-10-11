import { describe, it, expect } from 'vitest';
import { RingBuffer } from './ring-buffer.js';

describe('RingBuffer', () => {
  it('should push and return items in reverse chronological order', () => {
    const buffer = new RingBuffer<string>(10);
    buffer.push('a');
    buffer.push('b');
    buffer.push('c');

    expect(buffer.length).toBe(3);
    expect(buffer.getAll()).toEqual(['c', 'b', 'a']);
  });

  it('should evict oldest items when exceeding capacity (FIFO)', () => {
    const buffer = new RingBuffer<number>(10); // min capacity is 10
    for (let i = 1; i <= 15; i++) {
      buffer.push(i);
    }

    expect(buffer.length).toBe(10);
    const items = buffer.getAll();
    expect(items[0]).toBe(15);
    expect(items[items.length - 1]).toBe(6);
    expect(items).not.toContain(1);
    expect(items).not.toContain(5);
  });

  it('should find item matching predicate', () => {
    const buffer = new RingBuffer<{ id: string; val: number }>(10);
    buffer.push({ id: '1', val: 100 });
    buffer.push({ id: '2', val: 200 });

    const found = buffer.find((item) => item.id === '2');
    expect(found).toEqual({ id: '2', val: 200 });
    expect(buffer.find((item) => item.id === '3')).toBeUndefined();
  });

  it('should clear all items', () => {
    const buffer = new RingBuffer<string>(10);
    buffer.push('a');
    buffer.push('b');
    buffer.clear();

    expect(buffer.length).toBe(0);
    expect(buffer.getAll()).toEqual([]);
  });
});
