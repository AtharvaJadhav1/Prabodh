import { Module } from '@nestjs/common';
import { MentorsController } from './mentors.controller';
import { MentorsRepository } from './repository';
import { MentorsService } from './service';

@Module({
  controllers: [MentorsController],
  providers: [MentorsService, MentorsRepository],
  exports: [MentorsService],
})
export class MentorsModule {}
