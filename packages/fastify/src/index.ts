import type { FastifyInstance } from 'fastify';
import type { TraceLensInitOptions } from '@tracelens/protocol';
import { tracelensFastifyPlugin } from './plugin.js';

export * from '@tracelens/protocol';
export * from '@tracelens/core';
export * from '@tracelens/plugins';
export { tracelensFastifyPlugin } from './plugin.js';

export class TraceLensFastify {
  register(fastify: FastifyInstance, options: TraceLensInitOptions = {}) {
    fastify.register(tracelensFastifyPlugin, options);
  }
}

export const tracelens = new TraceLensFastify();
export default tracelens;
