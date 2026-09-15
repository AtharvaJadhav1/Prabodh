import { Module } from '@nestjs/common';
import { PsPreferencesModule } from '../ps-preferences/ps-preferences.module';
import { MentorsController } from './mentors.controller';
import { MentorsRepository } from './repository';
import { MentorsService } from './service';

@Module({
  imports: [PsPreferencesModule],
  controllers: [MentorsController],
  providers: [MentorsService, MentorsRepository],
  exports: [MentorsService],
})
export class MentorsModule {}
