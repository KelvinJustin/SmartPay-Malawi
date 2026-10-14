
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
    // Reusable SMTP transporter responsible for sending outgoing emails.
    private readonly transporter: Transporter;

    constructor(private readonly configService: ConfigService) {
        // Configure the SMTP connection using environment-based settings.
        // getOrThrow() ensures the application fails if a required setting is missing.
        this.transporter = nodemailer.createTransport({
            host: this.configService.getOrThrow<string>('SMTP_SERVER'),
            port: Number(this.configService.getOrThrow<string>('SMTP_PORT')),

            // Use a standard SMTP connection with STARTTLS where supported.
            secure: false,

            // Authenticate with the SMTP credentials provided by the mail service.
            auth: {
                user: this.configService.getOrThrow<string>('SMTP_USER'),
                pass: this.configService.getOrThrow<string>('SMTP_API_KEY'),
            },
        });
    }

    // Generic email method shared by the verification and login email workflows.
    async sendEmail(to: string, subject: string, text: string) {
        return this.transporter.sendMail({
            // Sender address configured for the SmartPay email account.
            from: this.configService.getOrThrow<string>('SMTP_FROM'),
            to,
            subject,
            text,
        });
    }

    // Send a one-time code to verify ownership of a merchant's email address.
    async sendVerificationCode(to: string, code: string) {
        return this.sendEmail(
            to,
            'Verify your SmartPay email',
            `Your SmartPay verification code is ${code}.

This code expires in 10 minutes.

If you did not request this code, you can ignore this email.`,
        );
    }

    // Send a one-time code as the second authentication step during login.
    async sendLoginCode(to: string, code: string) {
        return this.sendEmail(
            to,
            'Your SmartPay login verification code',
            `Your SmartPay login code is ${code}.

This code expires in 10 minutes.
If you did not attempt to log in, secure your account.`,
        );
    }
}
