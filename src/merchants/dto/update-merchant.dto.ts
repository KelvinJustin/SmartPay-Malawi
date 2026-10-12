import { PartialType } from '@nestjs/mapped-types';
import { CreateMerchantDto } from './create-merchant.dto.js';

export class UpdateMerchantDto extends PartialType(CreateMerchantDto) {}
