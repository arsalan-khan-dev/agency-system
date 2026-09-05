import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdentityModule } from './modules/identity/identity.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { EstimationModule } from './modules/estimation/estimation.module';
import { ClientModule } from './modules/client/client.module';
import { QuotationModule } from './modules/quotation/quotation.module';
import { ProjectModule } from './modules/project/project.module';
import { ReportsModule } from './modules/reports/reports.module';
import { IntelligenceModule } from './modules/intelligence/intelligence.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { OrgSettingsModule } from './modules/org-settings/org-settings.module';
import { ChangeRequestModule } from './modules/change-request/change-request.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: false, // migrations only — see MEMORY.md Section 11
      logging: false,
    }),
    IdentityModule,
    CatalogModule,
    PricingModule,
    EstimationModule,
    ClientModule,
    QuotationModule,
    ProjectModule,
    ReportsModule,
    IntelligenceModule,
    NotificationsModule,
    OrgSettingsModule,
    ChangeRequestModule,
  ],
})
export class AppModule {}
