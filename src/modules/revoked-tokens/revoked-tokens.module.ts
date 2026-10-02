import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RevokedToken } from './entities/revoked-token.entity';
import { RevokedTokensService } from './revoked-tokens.service';
import { RevokedTokensCron } from './revoked-tokens.cron';

/**
 * @Global để RevokedTokensService inject được từ:
 *   - JwtStrategy (auth module)
 *   - AuthService (logout)
 *   - UserDevicesController (revoke)
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([RevokedToken])],
  providers: [RevokedTokensService, RevokedTokensCron],
  exports: [RevokedTokensService],
})
export class RevokedTokensModule {}
