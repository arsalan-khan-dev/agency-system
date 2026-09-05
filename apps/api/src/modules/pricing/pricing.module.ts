import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PricingProfile } from './entities/pricing-profile.entity';
import { PricingRule } from './entities/pricing-rule.entity';
import { PricingService } from './pricing.service';
import { PricingController } from './pricing.controller';
import { IdentityModule } from '../identity/identity.module';

@Module({
  imports: [TypeOrmModule.forFeature([PricingProfile, PricingRule]), IdentityModule],
  controllers: [PricingController],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}
