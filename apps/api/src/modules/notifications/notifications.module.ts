import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailLog } from './entities/email-log.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { IdentityModule } from '../identity/identity.module';

@Module({
  imports: [TypeOrmModule.forFeature([EmailLog]), IdentityModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
