import {
  IsEnum,
  IsOptional,
  IsString,
  IsBoolean,
  IsPhoneNumber,
  ValidateIf,
} from 'class-validator';
import { SettlementMethod } from '../../generated/prisma/enums.js';

export class AddSettlementAccountDto {
  @IsEnum(SettlementMethod)
  method!: SettlementMethod;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  // Required only when method is AIRTEL_MONEY or TNM_MPAMBA
  @ValidateIf(
    (o) =>
      o.method === SettlementMethod.AIRTEL_MONEY ||
      o.method === SettlementMethod.TNM_MPAMBA,
  )
  @IsString()
  phoneNumber?: string;

  // Required only when method is BANK_TRANSFER
  @ValidateIf((o) => o.method === SettlementMethod.BANK_TRANSFER)
  @IsString()
  bankName?: string;

  @ValidateIf((o) => o.method === SettlementMethod.BANK_TRANSFER)
  @IsString()
  accountName?: string;

  @ValidateIf((o) => o.method === SettlementMethod.BANK_TRANSFER)
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @IsString()
  branchCode?: string;
}