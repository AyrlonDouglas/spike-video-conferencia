import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LiveKitProvider } from '../provider/livekit-provider';
import { VIDEO_PROVIDER } from './video-provider.token';
import { SessionsService } from './sessions.service';
import { SessionsController } from './sessions.controller';
import { WebhooksController } from './webhooks.controller';

@Module({
  controllers: [SessionsController, WebhooksController],
  providers: [
    SessionsService,
    {
      provide: VIDEO_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new LiveKitProvider({
          url: config.getOrThrow<string>('LIVEKIT_URL'),
          apiKey: config.getOrThrow<string>('LIVEKIT_API_KEY'),
          apiSecret: config.getOrThrow<string>('LIVEKIT_API_SECRET'),
        }),
    },
  ],
})
export class SessionsModule {}
