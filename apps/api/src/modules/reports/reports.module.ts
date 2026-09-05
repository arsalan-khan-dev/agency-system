import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Quotation } from '../quotation/entities/quotation.entity';
import { Project } from '../project/entities/project.entity';
import { Estimate } from '../estimation/entities/estimate.entity';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Quotation, Project, Estimate])],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
