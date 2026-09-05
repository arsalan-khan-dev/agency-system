import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceCategory } from './entities/service-category.entity';
import { Service } from './entities/service.entity';
import { ProjectType } from './entities/project-type.entity';
import { Feature } from './entities/feature.entity';
import { CatalogService } from './catalog.service';
import { CatalogController } from './catalog.controller';
import { IdentityModule } from '../identity/identity.module';

@Module({
  imports: [TypeOrmModule.forFeature([ServiceCategory, Service, ProjectType, Feature]), IdentityModule],
  controllers: [CatalogController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
