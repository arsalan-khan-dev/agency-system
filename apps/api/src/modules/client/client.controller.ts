import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ClientService } from './client.service';
import { SessionAuthGuard } from '../identity/guards/session-auth.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import { Roles } from '../identity/decorators/roles.decorator';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';

@Controller('api/v1/clients')
@UseGuards(SessionAuthGuard, RolesGuard)
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  @Get()
  list() {
    return this.clientService.list();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.clientService.get(id);
  }

  @Post()
  @Roles('admin', 'manager', 'estimator')
  create(@Body() dto: CreateClientDto, @Req() req: Request) {
    return this.clientService.create(dto, req.session.userId ?? null);
  }

  @Patch(':id')
  @Roles('admin', 'manager', 'estimator')
  update(@Param('id') id: string, @Body() dto: UpdateClientDto, @Req() req: Request) {
    return this.clientService.update(id, dto, req.session.userId ?? null);
  }

  @Delete(':id')
  @Roles('admin')
  delete(@Param('id') id: string, @Req() req: Request) {
    return this.clientService.delete(id, req.session.userId ?? null);
  }
}
