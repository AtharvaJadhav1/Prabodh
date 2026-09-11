import { Module } from '@nestjs/common';
import { IdentityController } from './identity.controller';
import { IdentityRepository } from './repository';
import { IdentityService } from './service';

@Module({
  controllers: [IdentityController],
  providers: [IdentityService, IdentityRepository],
  exports: [IdentityService, IdentityRepository],
})
export class IdentityModule {}
