import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('api/users')
export class UsersController {
  constructor(private readonly svc: UsersService) {}

  @Get() findAll() { return this.svc.findAll(); }
  @Get('roles') findRoles() { return this.svc.findAllRoles(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.svc.findOne(id); }
  @Post() create(@Body() dto: any) { return this.svc.createUser(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: any) { return this.svc.updateUser(id, dto); }
  @Delete(':id') deactivate(@Param('id') id: string) { return this.svc.deactivate(id); }
}
