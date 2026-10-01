import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { StagesModule } from '../stages/stages.module';
import { AdminController } from './admin.controller';
import { BatchesController } from './batches.controller';
import { BatchesService } from './batches.service';
import { AdminService } from './service';

@Module({
  imports: [IdentityModule, StagesModule],
  controllers: [AdminController, BatchesController],
  providers: [AdminService, BatchesService],
})
export class AdminModule {}
