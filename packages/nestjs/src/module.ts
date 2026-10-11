import { TraceHub } from '@tracelens/core';
import { enableAutoPlugins } from '@tracelens/plugins';
import { TraceLensInterceptor } from './interceptor.js';
import { createTraceLensNestMiddleware } from './middleware.js';

export interface TraceLensModuleOptions {
  endpoint?: string;
  maxHistory?: number;
  serviceName?: string;
  excludePaths?: string[];
  autoPlugins?: boolean;
}

export class TraceLensModule {
  private static defaultHub: TraceHub;

  static forRoot(options?: TraceLensModuleOptions) {
    if (!this.defaultHub) {
      this.defaultHub = new TraceHub(options?.maxHistory || 100);
    }

    if (options?.autoPlugins !== false) {
      enableAutoPlugins();
    }

    return {
      module: TraceLensModule,
      providers: [
        {
          provide: TraceHub,
          useValue: this.defaultHub,
        },
        TraceLensInterceptor,
      ],
      exports: [TraceHub, TraceLensInterceptor],
    };
  }

  static getHub(): TraceHub {
    if (!this.defaultHub) {
      this.defaultHub = new TraceHub(100);
    }
    return this.defaultHub;
  }

  static createMiddleware(options?: Partial<TraceLensModuleOptions>) {
    const hub = this.getHub();
    return createTraceLensNestMiddleware({
      hub,
      serviceName: options?.serviceName || 'nestjs-service',
      excludePaths: options?.excludePaths || ['/__lens'],
    });
  }
}
