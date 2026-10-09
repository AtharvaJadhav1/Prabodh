import { Module } from '@nestjs/common';
import { CaptchaService } from '../../lib/captcha';
import { IdentityController } from './identity.controller';
import { IdentityRepository } from './repository';
import { IdentityService } from './service';

@Module({
  controllers: [IdentityController],
  providers: [IdentityService, IdentityRepository, CaptchaService],
  exports: [IdentityService, IdentityRepository, CaptchaService],
})
export class IdentityModule {}
