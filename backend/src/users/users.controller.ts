import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(Role.ADMIN, Role.OWNER)
  create(@CurrentUser() user: any, @Body() createUserDto: any) {
    return this.usersService.create(user.organizationId, createUserDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.OWNER)
  findAll(@CurrentUser() user: any) {
    return this.usersService.findAll(user.organizationId);
  }

  @Get('branches')
  getBranches(@CurrentUser() user: any) {
    return this.usersService.getBranches(user.organizationId);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.OWNER)
  update(@Param('id') id: string, @CurrentUser() user: any, @Body() updateUserDto: any) {
    return this.usersService.update(id, user.organizationId, updateUserDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.OWNER)
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.usersService.remove(id, user.organizationId);
  }
}
