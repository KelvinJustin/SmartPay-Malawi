import { PartialType } from '@nestjs/mapped-types';
import { CreateEndpointerDto } from './create-endpointer.dto.js';

export class UpdateEndpointerDto extends PartialType(CreateEndpointerDto) {}
