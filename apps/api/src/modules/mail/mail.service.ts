import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import { buildPasswordResetEmail } from './templates/password-reset-email.js';

type MailConfig = {
  host?: string;
  port?: number;
  secure: boolean;
  user?: string;
  password?: string;
  from?: string;
};

type SmtpConfig = Required<MailConfig>;

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly configService: ConfigService) {}

  /**
   * Throws when the mail cannot be sent. Outside development the code is never
   * written to the logs, even when SMTP is missing.
   */
  async sendPasswordResetCode(to: string, code: string, validityMinutes: number): Promise<void> {
    const smtp = this.getSmtpConfig();
    if (!smtp) {
      if (this.isDevelopment()) {
        this.logger.warn(
          `SMTP not configured (development): password reset code for ${to} is ${code}`,
        );
        return;
      }
      throw new Error('SMTP is not configured');
    }

    const content = buildPasswordResetEmail(code, validityMinutes);
    await this.getTransporter(smtp).sendMail({
      from: smtp.from,
      to,
      subject: content.subject,
      text: content.text,
      html: content.html,
    });
  }

  private getSmtpConfig(): SmtpConfig | null {
    const mail = this.configService.get<MailConfig>('mail');
    if (!mail?.host || !mail.port || !mail.user || !mail.password || !mail.from) {
      return null;
    }
    return {
      host: mail.host,
      port: mail.port,
      secure: mail.secure,
      user: mail.user,
      password: mail.password,
      from: mail.from,
    };
  }

  private getTransporter(smtp: SmtpConfig): Transporter {
    this.transporter ??= createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: { user: smtp.user, pass: smtp.password },
    });
    return this.transporter;
  }

  private isDevelopment(): boolean {
    return this.configService.get<string>('deployment.environment') === 'development';
  }
}
