import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import type { MailMessage, MailTransport } from './mail-transport.interface';

@Injectable()
export class SesMailTransport implements MailTransport {
  private readonly logger = new Logger(SesMailTransport.name);
  private readonly client: SESClient | null;
  private readonly defaultFrom: string;

  constructor(config: ConfigService) {
    const accessKey = config.get<string>('SES_ACCESS_KEY');
    const secretKey = config.get<string>('SES_SECRET_KEY');
    const region = config.get<string>('SES_REGION') ?? 'us-east-1';
    this.defaultFrom = config.get<string>('SES_FROM') ?? 'Delta Signal Alerts <alerts@deltasignal.org>';

    if (!accessKey || !secretKey) {
      this.client = null;
      this.logger.warn('SES_ACCESS_KEY / SES_SECRET_KEY not set — SES mail transport disabled.');
      return;
    }

    this.client = new SESClient({
      region,
      credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    });
  }

  async send(message: MailMessage): Promise<void> {
    if (!this.client) {
      this.logger.debug(`Skipping email to ${message.to} — SES not configured`);
      return;
    }

    await this.client.send(
      new SendEmailCommand({
        Source: message.from ?? this.defaultFrom,
        Destination: { ToAddresses: [message.to] },
        Message: {
          Subject: { Data: message.subject, Charset: 'UTF-8' },
          Body: { Text: { Data: message.text, Charset: 'UTF-8' } },
        },
      }),
    );
  }
}
