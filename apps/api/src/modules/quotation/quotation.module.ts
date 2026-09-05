import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Quotation } from './entities/quotation.entity';
import { QuotationItem } from './entities/quotation-item.entity';
import { Estimate } from '../estimation/entities/estimate.entity';
import { Client } from '../client/entities/client.entity';
import { QuotationService } from './quotation.service';
import { QuotationController } from './quotation.controller';
import { PublicQuotationController } from './public-quotation.controller';
import { IdentityModule } from '../identity/identity.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrgSettingsModule } from '../org-settings/org-settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Quotation, QuotationItem, Estimate, Client]),
    IdentityModule,
    NotificationsModule,
    OrgSettingsModule,
  ],
  controllers: [QuotationController, PublicQuotationController],
  providers: [QuotationService],
  exports: [QuotationService],
})
export class QuotationModule {}
