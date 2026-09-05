import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrgSettings } from './entities/org-settings.entity';
import { OrgSettingsService } from './org-settings.service';
import { OrgSettingsController } from './org-settings.controller';
import { IdentityModule } from '../identity/identity.module';

@Module({
  imports: [TypeOrmModule.forFeature([OrgSettings]), IdentityModule],
  controllers: [OrgSettingsController],
  providers: [OrgSettingsService],
  exports: [OrgSettingsService],
})
export class OrgSettingsModule {}
