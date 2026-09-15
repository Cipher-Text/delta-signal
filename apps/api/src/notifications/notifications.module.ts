import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import { EmailProcessor, EMAIL_QUEUE } from './email.processor';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { MAIL_TRANSPORT } from './mail/mail-transport.interface';
import { SmtpMailTransport } from './mail/smtp.mail-transport';
import { MailgunMailTransport } from './mail/mailgun.mail-transport';
import { SesMailTransport } from './mail/ses.mail-transport';

@Module({
  imports: [BullModule.registerQueue({ name: EMAIL_QUEUE })],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    EmailService,
    EmailProcessor,
    SmtpMailTransport,
    MailgunMailTransport,
    SesMailTransport,
    {
      provide: MAIL_TRANSPORT,
      // MAIL_PROVIDER selects the active transport ("smtp" | "mailgun" | "ses");
      // defaults to smtp. Each transport degrades gracefully (skips sends,
      // logs a warning) when its own env vars are absent, so switching
      // providers never requires touching this factory.
      useFactory: (
        config: ConfigService,
        smtp: SmtpMailTransport,
        mailgun: MailgunMailTransport,
        ses: SesMailTransport,
      ) => {
        switch (config.get<string>('MAIL_PROVIDER')) {
          case 'mailgun':
            return mailgun;
          case 'ses':
            return ses;
          default:
            return smtp;
        }
      },
      inject: [ConfigService, SmtpMailTransport, MailgunMailTransport, SesMailTransport],
    },
  ],
  // NotificationsService consumed by AlertsModule; EmailService consumed by AuthModule.
  exports: [NotificationsService, EmailService],
})
export class NotificationsModule {}
