import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { AlertSeverity } from '@prisma/client';
import {
  EMAIL_QUEUE,
  type PasswordResetJobData,
  type EmailVerificationJobData,
} from './notifications.constants';

/** Retry configuration for transactional emails (not alert fan-out). */
const EMAIL_JOB_OPTS = {
  attempts: 4,
  backoff: { type: 'exponential' as const, delay: 3_000 },
  removeOnComplete: true,
  removeOnFail: 50, // keep last 50 failed jobs for inspection
} as const;

export interface AlertForEmail {
  id: string;
  title: string;
  severity: AlertSeverity;
  description: string;
  instructions: string | null;
  issuedAt: Date;
  district: { name: string } | null;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: Transporter | null;
  private readonly smtpFrom: string;

  constructor(
    config: ConfigService,
    @InjectQueue(EMAIL_QUEUE) private readonly emailQueue: Queue,
  ) {
    const host = config.get<string>('SMTP_HOST');
    const port = Number(config.get<string>('SMTP_PORT') ?? 587);
    const user = config.get<string>('SMTP_USER');
    const pass = config.get<string>('SMTP_PASS');
    this.smtpFrom = config.get<string>('SMTP_FROM') ?? 'Delta Signal Alerts <alerts@deltasignal.org>';

    if (!host) {
      this.transporter = null;
      this.logger.warn('SMTP_HOST not set — email delivery disabled. Set SMTP_HOST to enable alert notifications.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  async sendPasswordResetEmail(to: string, displayName: string, resetUrl: string): Promise<void> {
    if (!this.transporter) {
      this.logger.debug(`Skipping password-reset email to ${to} — SMTP not configured`);
      return;
    }
    const subject = 'Delta Signal — Reset your password';
    const body = [
      `Hello ${displayName},`,
      '',
      'We received a request to reset the password for your Delta Signal account.',
      '',
      'Click the link below to choose a new password (expires in 1 hour):',
      resetUrl,
      '',
      'If you did not request a password reset, you can safely ignore this email.',
      'Your password will not change unless you click the link above.',
      '',
      '---',
      'Delta Signal — Environmental Monitoring Platform',
    ].join('\n');

    await this.transporter.sendMail({ from: this.smtpFrom, to, subject, text: body });
  }

  async sendVerificationEmail(to: string, displayName: string, verificationUrl: string): Promise<void> {
    if (!this.transporter) {
      this.logger.debug(`Skipping verification email to ${to} — SMTP not configured`);
      return;
    }
    const subject = 'Delta Signal — Verify your email address';
    const body = [
      `Hello ${displayName},`,
      '',
      'Thank you for registering with Delta Signal.',
      'Please verify your email address by clicking the link below (expires in 24 hours):',
      verificationUrl,
      '',
      'If you did not create a Delta Signal account, you can safely ignore this email.',
      '',
      '---',
      'Delta Signal — Environmental Monitoring Platform',
    ].join('\n');

    await this.transporter.sendMail({ from: this.smtpFrom, to, subject, text: body });
  }

  // ── Queued variants (add to BullMQ — caller does not wait for delivery) ──────

  /** Enqueue a password-reset email with automatic retry on transient SMTP failure. */
  async queuePasswordReset(to: string, displayName: string, resetUrl: string): Promise<void> {
    await this.emailQueue.add(
      'password-reset',
      { to, displayName, resetUrl } satisfies PasswordResetJobData,
      EMAIL_JOB_OPTS,
    );
  }

  /** Enqueue an email-verification link with automatic retry on transient SMTP failure. */
  async queueVerification(to: string, displayName: string, verificationUrl: string): Promise<void> {
    await this.emailQueue.add(
      'email-verification',
      { to, displayName, verificationUrl } satisfies EmailVerificationJobData,
      EMAIL_JOB_OPTS,
    );
  }

  // ── Direct send (used by EmailProcessor and NotificationsService internally) ──

  async sendAlertEmail(to: string, displayName: string, alert: AlertForEmail): Promise<void> {
    if (!this.transporter) {
      this.logger.debug(`Skipping email to ${to} — SMTP not configured`);
      return;
    }

    const area = alert.district?.name ?? 'Nationwide';
    const subject = `[${alert.severity}] Delta Signal Alert: ${alert.title}`;
    const body = [
      `Hello ${displayName},`,
      '',
      `A ${alert.severity} environmental alert has been issued for ${area}.`,
      '',
      `Title: ${alert.title}`,
      `Area: ${area}`,
      `Severity: ${alert.severity}`,
      `Issued: ${alert.issuedAt.toISOString()}`,
      '',
      alert.description,
      ...(alert.instructions ? ['', 'Instructions:', alert.instructions] : []),
      '',
      '---',
      'You are receiving this because you subscribed to Delta Signal alert notifications.',
      'Visit Delta Signal to manage your subscriptions.',
    ].join('\n');

    await this.transporter.sendMail({
      from: this.smtpFrom,
      to,
      subject,
      text: body,
    });
  }
}
