import { Controller, Post, Body } from '@nestjs/common';
import { SyncService } from './sync.service';

@Controller('sync')
export class SyncController {
  constructor(private syncService: SyncService) {}

  @Post('pull')
  async pull(@Body() dto: { cursor: string }) {
    return this.syncService.pullChanges(dto.cursor);
  }

  @Post('push')
  async push(@Body() dto: { changes: any[] }) {
    return this.syncService.pushChanges(dto.changes, 'user-id');
  }
}