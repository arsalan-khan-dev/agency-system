import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './entities/project.entity';
import { ProjectActual } from './entities/project-actual.entity';
import { Expense } from './entities/expense.entity';
import { Quotation } from '../quotation/entities/quotation.entity';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';
import { IdentityModule } from '../identity/identity.module';
import { IntelligenceModule } from '../intelligence/intelligence.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, ProjectActual, Expense, Quotation]),
    IdentityModule,
    IntelligenceModule,
  ],
  controllers: [ProjectController],
  providers: [ProjectService],
  exports: [ProjectService],
})
export class ProjectModule {}
