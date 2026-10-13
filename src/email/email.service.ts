import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
    private readonly transporter: Transporter;

    constructor(private readonly configService: ConfigService) {
        this.transporter = nodemailer.createTransport({
            host: this.configService.getOrThrow<string>('SMTP_HOST'),
            port: Number(this.configService.getOrThrow<string>('SMTP_PORT')),
            secure: false,
            auth: {
                user: this.configService.getOrThrow<string>('SMTP_USER'),
                pass: this.configService.getOrThrow<string>('SMTP_PASS'),
            },
        });
    }

    async sendEmail(to: string, subject: string, text: string) {
        return this.transporter.sendMail({
            from: this.configService.getOrThrow<string>('SMTP_FROM'),
            to,
            subject,
            text,
        });
    }

    async sendVerificationCode(to: string, code: string) {
        return this.sendEmail(
            to,
            'Verify your SmartPay email',
            `Your SmartPay verification code is ${code}.

This code expires in 10 minutes.

If you did not request this code, you can ignore this email.`,
        );
    }
}
