import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
  forwardRef,
} from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { WebhooksController } from './webhooks.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from '../accounts/entities/accounts.entity';
import twilio from 'twilio';
import { WebhooksProcessor } from './webhooks.processor';
import { BullModule } from '@nestjs/bullmq';
import { TemplatesModule } from '../templates/templates.module';
import { Step } from '../steps/entities/step.entity';
import { EventsModule } from '../events/events.module';
import { SlackModule } from '../slack/slack.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Account, Step]),
    BullModule.registerQueue({
      name: 'webhooks',
    }),
    TemplatesModule,
    forwardRef(() => EventsModule),
    forwardRef(() => SlackModule),
  ],
  providers: [WebhooksService, WebhooksProcessor],
  controllers: [WebhooksController],
  exports: [WebhooksService],
})
export class WebhooksModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(twilio.webhook())
      .forRoutes({ path: '/webhooks/twilio', method: RequestMethod.POST });
  }
}
