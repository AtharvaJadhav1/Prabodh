import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { AdminController } from './admin.controller';
import { AdminService } from './service';

@Module({
  imports: [IdentityModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
