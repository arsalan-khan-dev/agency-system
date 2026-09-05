import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from './entities/client.entity';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';
import { AuditLogService } from '../identity/audit-log.service';

@Injectable()
export class ClientService {
  constructor(
    @InjectRepository(Client) private clientRepo: Repository<Client>,
    private readonly auditLogService: AuditLogService,
  ) {}

  list() {
    return this.clientRepo.find({ order: { name: 'ASC' } });
  }

  async get(id: string) {
    const client = await this.clientRepo.findOne({ where: { id } });
    if (!client) throw new NotFoundException('Client not found');
    return client;
  }

  async create(dto: CreateClientDto, actingUserId: string | null = null) {
    const client = await this.clientRepo.save(this.clientRepo.create(dto));
    await this.auditLogService.record({
      userId: actingUserId,
      action: 'client.created',
      entityType: 'Client',
      entityId: client.id,
      metadata: { name: client.name },
    });
    return client;
  }

  async update(id: string, dto: UpdateClientDto, actingUserId: string | null = null) {
    const client = await this.get(id);
    Object.assign(client, dto);
    const saved = await this.clientRepo.save(client);
    await this.auditLogService.record({
      userId: actingUserId,
      action: 'client.updated',
      entityType: 'Client',
      entityId: id,
      metadata: dto as Record<string, unknown>,
    });
    return saved;
  }

  async delete(id: string, actingUserId: string | null = null) {
    const client = await this.get(id);
    await this.clientRepo.softRemove(client);
    await this.auditLogService.record({
      userId: actingUserId,
      action: 'client.deleted',
      entityType: 'Client',
      entityId: id,
      metadata: { name: client.name },
    });
    return { success: true };
  }
}
