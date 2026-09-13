import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { StagesModule } from '../stages/stages.module';
import { AdminController } from './admin.controller';
import { AdminService } from './service';

@Module({
  imports: [IdentityModule, StagesModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
