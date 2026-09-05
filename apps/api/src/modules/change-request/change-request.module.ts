import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChangeRequest } from './entities/change-request.entity';
import { Project } from '../project/entities/project.entity';
import { ChangeRequestService } from './change-request.service';
import { ChangeRequestController } from './change-request.controller';
import { IdentityModule } from '../identity/identity.module';
import { QuotationModule } from '../quotation/quotation.module';

@Module({
  imports: [TypeOrmModule.forFeature([ChangeRequest, Project]), IdentityModule, QuotationModule],
  controllers: [ChangeRequestController],
  providers: [ChangeRequestService],
  exports: [ChangeRequestService],
})
export class ChangeRequestModule {}
