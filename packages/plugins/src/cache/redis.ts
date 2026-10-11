import { startSpan, getActiveContext } from '@tracelens/core';

/**
 * Tự động bọc `ioredis` hoặc `redis` client
 */
export function instrumentRedis(redisClientOrModule: any): void {
  if (!redisClientOrModule) return;

  // Trường hợp ioredis prototype: `sendCommand`
  const target = redisClientOrModule.prototype?.sendCommand
    ? redisClientOrModule.prototype
    : redisClientOrModule.sendCommand
    ? redisClientOrModule
    : null;

  if (target && target.sendCommand) {
    const originalSendCommand = target.sendCommand;
    if ((originalSendCommand as any).__tracelens_patched) return;

    target.sendCommand = function (this: any, command: any, ...args: any[]) {
      if (!getActiveContext()) {
        return originalSendCommand.call(this, command, ...args);
      }

      const commandName = (command?.name || 'COMMAND').toUpperCase();
      const firstArg = command?.args?.[0] ? String(command.args[0]) : '';
      const spanName = `redis: ${commandName} ${firstArg}`.trim();

      return startSpan(
        spanName,
        'CLIENT',
        {
          'db.system': 'redis',
          'db.operation': commandName,
          'redis.key': firstArg,
        },
        async (span) => {
          try {
            const result = await originalSendCommand.call(this, command, ...args);
            // Suy luận cache hit / miss nếu là lệnh GET
            if (commandName === 'GET' || commandName === 'HGET') {
              const isHit = result !== null && result !== undefined;
              span.attributes['cache.hit'] = isHit;
            }
            span.status = { code: 'OK' };
            return result;
          } catch (error) {
            span.status = {
              code: 'ERROR',
              message: error instanceof Error ? error.message : String(error),
            };
            throw error;
          }
        }
      );
    };

    (target.sendCommand as any).__tracelens_patched = true;
  }
}
