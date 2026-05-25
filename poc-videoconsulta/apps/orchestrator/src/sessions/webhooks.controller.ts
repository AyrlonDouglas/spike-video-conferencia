import {
  Controller,
  Headers,
  Inject,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { LiveKitProvider } from '../provider/livekit-provider';
import { VIDEO_PROVIDER } from './video-provider.token';
import { SessionsService } from './sessions.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(
    @Inject(VIDEO_PROVIDER) private readonly provider: LiveKitProvider,
    private readonly sessionsService: SessionsService,
  ) {}

  @Post('livekit')
  async livekit(
    @Req() req: RawBodyRequest<Request>,
    @Headers('authorization') authorization = '',
  ) {
    const rawBody = req.rawBody?.toString('utf8') ?? '';
    const body = JSON.parse(rawBody);
    console.log({
      event: body.event,
      participant: {
        identity: body.participant?.identity,
        state: body.participant?.state,
        metadata: body.participant?.metadata,
      },
      room: body.room?.name,
      // ...body,
    });

    if (!rawBody) {
      throw new UnauthorizedException('Webhook inválido: body vazio');
    }

    let event;
    try {
      event = await this.provider.receiveWebhook(rawBody, authorization);
    } catch {
      throw new UnauthorizedException('Webhook inválido');
    }

    const events = this.provider.parseMediaEvents(event);
    await this.sessionsService.handleWebhookEvents(events);
    return { ok: true };
  }
}
