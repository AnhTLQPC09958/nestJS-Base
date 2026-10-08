import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { Public, BypassTransform } from '../../common/decorators';

@BypassTransform()
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly disk: DiskHealthIndicator,
  ) {}

  /**
   * Full health check — dùng cho monitoring dashboard.
   * GET /health
   */
  @Public()
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      // Database
      () => this.db.pingCheck('database', { timeout: 3000 }),

      // RAM — fail nếu heap > 300MB
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),

      // RAM — fail nếu RSS > 500MB
      () => this.memory.checkRSS('memory_rss', 500 * 1024 * 1024),

      // Disk — fail nếu dùng > 90%
      () =>
        this.disk.checkStorage('disk', {
          path: process.cwd(),
          thresholdPercent: 0.9,
        }),
    ]);
  }

  /**
   * Liveness probe — check app còn sống không.
   * GET /health/live
   * Dùng cho Kubernetes/Docker.
   */
  @Public()
  @Get('live')
  live() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  /**
   * Readiness probe — check app sẵn sàng nhận traffic chưa.
   * GET /health/ready
   */
  @Public()
  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([
      () => this.db.pingCheck('database', { timeout: 3000 }),
    ]);
  }
}
