import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccuracySnapshot } from './entities/accuracy-snapshot.entity';
import { Project } from '../project/entities/project.entity';
import { Estimate } from '../estimation/entities/estimate.entity';
import { IntelligenceService } from './intelligence.service';
import { IntelligenceController } from './intelligence.controller';
import { IdentityModule } from '../identity/identity.module';

@Module({
  imports: [TypeOrmModule.forFeature([AccuracySnapshot, Project, Estimate]), IdentityModule],
  controllers: [IntelligenceController],
  providers: [IntelligenceService],
  exports: [IntelligenceService],
})
export class IntelligenceModule {}
