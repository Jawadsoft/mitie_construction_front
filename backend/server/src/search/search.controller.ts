import { Controller, Get, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SearchService } from './search.service';

@Controller('api/search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  searchAll(@Query('q') q?: string) {
    const query = (q ?? '').trim();
    if (query.length < 2) {
      throw new BadRequestException('Query must be at least 2 characters');
    }
    return this.search.search(query);
  }
}
