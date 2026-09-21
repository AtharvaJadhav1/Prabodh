import { Module } from '@nestjs/common';
import { PsPreferencesModule } from '../ps-preferences/ps-preferences.module';
import { IndustrialMentorsController } from './industrial-mentors.controller';
import { MentorsController } from './mentors.controller';
import { MentorsRepository } from './repository';
import { MentorsService } from './service';

@Module({
  imports: [PsPreferencesModule],
  controllers: [MentorsController, IndustrialMentorsController],
  providers: [MentorsService, MentorsRepository],
  exports: [MentorsService],
})
export class MentorsModule {}
