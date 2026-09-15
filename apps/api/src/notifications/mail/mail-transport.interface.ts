export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  /** Overrides the transport's default From address. */
  from?: string;
}

/**
 * A mail transport sends a single message and no-ops (with a debug log) when
 * its provider isn't configured — callers never need to check readiness first.
 */
export interface MailTransport {
  send(message: MailMessage): Promise<void>;
}

export const MAIL_TRANSPORT = Symbol('MAIL_TRANSPORT');
