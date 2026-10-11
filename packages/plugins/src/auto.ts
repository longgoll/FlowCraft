import { createRequire } from 'node:module';
import { instrumentFetch } from './http/fetch.js';
import { instrumentNodeHttp } from './http/node-http.js';
import { instrumentPg } from './database/pg.js';
import { instrumentMysql } from './database/mysql.js';
import { instrumentMongoose } from './database/mongoose.js';
import { instrumentRedis } from './cache/redis.js';

export interface AutoPluginOptions {
  pg?: any;
  mysql?: any;
  mongoose?: any;
  redis?: any;
}

// Hỗ trợ cả môi trường CommonJS và ES Module thông qua createRequire
let dynamicRequire: NodeRequire | null = null;
try {
  if (typeof require !== 'undefined') {
    dynamicRequire = require;
  } else {
    // Trong môi trường ESM thuần
    dynamicRequire = createRequire(import.meta.url);
  }
} catch {
  // Dự phòng an toàn
}

/**
 * Tự động kích hoạt toàn bộ các plugin có sẵn trong môi trường Runtime
 */
export function enableAutoPlugins(options?: AutoPluginOptions): void {
  // 1. Tự động bật Outgoing HTTP (cả fetch và node:http/https cho axios, got, native)
  try {
    instrumentFetch();
  } catch {
    // ignore
  }

  try {
    instrumentNodeHttp();
  } catch {
    // ignore
  }

  // 2. Nếu người dùng chủ động truyền instance thư viện vào
  if (options?.pg) instrumentPg(options.pg);
  if (options?.mysql) instrumentMysql(options.mysql);
  if (options?.mongoose) instrumentMongoose(options.mongoose);
  if (options?.redis) instrumentRedis(options.redis);

  // 3. Tự động tìm và patch các thư viện phổ biến nếu đã được cài đặt trong app
  if (!options?.pg) tryAutoPatch('pg', instrumentPg);
  if (!options?.mysql) tryAutoPatch('mysql2', instrumentMysql);
  if (!options?.mongoose) tryAutoPatch('mongoose', instrumentMongoose);
  if (!options?.redis) tryAutoPatch('ioredis', instrumentRedis);
}

function tryAutoPatch(moduleName: string, patchFn: (mod: any) => void): void {
  try {
    if (dynamicRequire) {
      const mod = dynamicRequire(moduleName);
      if (mod) patchFn(mod);
    }
  } catch {
    // Module chưa được cài đặt trong app, an toàn bỏ qua
  }
}
