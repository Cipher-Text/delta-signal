import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Mailgun from 'mailgun.js';
import FormData from 'form-data';
import type { MailMessage, MailTransport } from './mail-transport.interface';

type MailgunClient = ReturnType<InstanceType<typeof Mailgun>['client']>;

@Injectable()
export class MailgunMailTransport implements MailTransport {
  private readonly logger = new Logger(MailgunMailTransport.name);
  private readonly client: MailgunClient | null;
  private readonly domain: string | undefined;
  private readonly defaultFrom: string;

  constructor(config: ConfigService) {
    const apiKey = config.get<string>('MAILGUN_API_KEY');
    this.domain = config.get<string>('MAILGUN_DOMAIN');
    // EU-region Mailgun accounts must use https://api.eu.mailgun.net instead.
    const baseUrl = config.get<string>('MAILGUN_BASE_URL') ?? 'https://api.mailgun.net';
    this.defaultFrom =
      config.get<string>('MAILGUN_FROM') ?? `Delta Signal Alerts <alerts@${this.domain ?? 'deltasignal.org'}>`;

    if (!apiKey || !this.domain) {
      this.client = null;
      this.logger.warn('MAILGUN_API_KEY / MAILGUN_DOMAIN not set — Mailgun mail transport disabled.');
      return;
    }

    this.client = new Mailgun(FormData).client({ username: 'api', key: apiKey, url: baseUrl });
  }

  async send(message: MailMessage): Promise<void> {
    if (!this.client || !this.domain) {
      this.logger.debug(`Skipping email to ${message.to} — Mailgun not configured`);
      return;
    }

    await this.client.messages.create(this.domain, {
      from: message.from ?? this.defaultFrom,
      to: message.to,
      subject: message.subject,
      text: message.text,
    });
  }
}
