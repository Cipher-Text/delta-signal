import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { MailMessage, MailTransport } from './mail-transport.interface';

@Injectable()
export class SmtpMailTransport implements MailTransport {
  private readonly logger = new Logger(SmtpMailTransport.name);
  private readonly transporter: Transporter | null;
  private readonly defaultFrom: string;

  constructor(config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    const port = Number(config.get<string>('SMTP_PORT') ?? 587);
    const user = config.get<string>('SMTP_USER');
    const pass = config.get<string>('SMTP_PASS');
    this.defaultFrom = config.get<string>('SMTP_FROM') ?? 'Delta Signal Alerts <alerts@deltasignal.org>';

    if (!host) {
      this.transporter = null;
      this.logger.warn('SMTP_HOST not set — SMTP mail transport disabled.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  async send(message: MailMessage): Promise<void> {
    if (!this.transporter) {
      this.logger.debug(`Skipping email to ${message.to} — SMTP not configured`);
      return;
    }

    await this.transporter.sendMail({
      from: message.from ?? this.defaultFrom,
      to: message.to,
      subject: message.subject,
      text: message.text,
    });
  }
}
