import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EstimationQuestion } from './entities/estimation-question.entity';
import { Estimate } from './entities/estimate.entity';
import { EstimateFeature } from './entities/estimate-feature.entity';
import { ProjectType } from '../catalog/entities/project-type.entity';
import { Feature } from '../catalog/entities/feature.entity';
import { EstimationService } from './estimation.service';
import { EstimationController } from './estimation.controller';
import { PricingModule } from '../pricing/pricing.module';
import { IdentityModule } from '../identity/identity.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EstimationQuestion, Estimate, EstimateFeature, ProjectType, Feature]),
    PricingModule,
    IdentityModule,
  ],
  controllers: [EstimationController],
  providers: [EstimationService],
  exports: [EstimationService],
})
export class EstimationModule {}
