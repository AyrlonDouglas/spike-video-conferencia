import { BadRequestException, Body, Controller, Get, Param, Post } from '@nestjs/common';
import type { JoinSessionRequest } from './session.types';
import { SessionsService } from './sessions.service';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  create() {
    return this.sessionsService.createSession();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.sessionsService.getSession(id);
  }

  @Post(':id/join')
  join(@Param('id') id: string, @Body() body: JoinSessionRequest) {
    if (!body?.role) {
      throw new BadRequestException('Campo "role" é obrigatório');
    }
    return this.sessionsService.joinSession(id, body);
  }

  @Post(':id/end')
  end(@Param('id') id: string) {
    return this.sessionsService.endSession(id);
  }

  @Post(':id/veto')
  veto(@Param('id') id: string) {
    return this.sessionsService.vetoSession(id);
  }
}
