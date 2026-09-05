import { IsIn, IsUUID } from 'class-validator';
import { ProjectStatus } from '../entities/project.entity';

const PROJECT_STATUSES: ProjectStatus[] = ['active', 'completed', 'cancelled'];

export class CreateProjectFromQuotationDto {
  @IsUUID()
  quotationId: string;
}

export class UpdateProjectStatusDto {
  @IsIn(PROJECT_STATUSES)
  status: ProjectStatus;
}
