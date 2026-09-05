import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { UserService } from './user.service';
import { SessionAuthGuard } from './guards/session-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CreateUserDto, SetPasswordDto, UpdateUserDto } from './dto/user.dto';

// Admin-only, per the person's explicit scope decision — no manager access
// to user management, unlike some other admin-adjacent areas in this app.
@Controller('api/v1/users')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles('admin')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  list() {
    return this.userService.list();
  }

  @Post()
  create(@Body() dto: CreateUserDto, @Req() req: Request) {
    return this.userService.create(dto, req.session.userId ?? null);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @Req() req: Request) {
    return this.userService.update(id, dto, req.session.userId ?? null);
  }

  @Patch(':id/password')
  setPassword(@Param('id') id: string, @Body() dto: SetPasswordDto, @Req() req: Request) {
    return this.userService.setPassword(id, dto, req.session.userId ?? null);
  }

  @Delete(':id')
  hardDelete(@Param('id') id: string, @Req() req: Request) {
    return this.userService.hardDelete(id, req.session.userId ?? null);
  }
}
