import { Injectable } from '@nestjs/common';
import { CreateEndpointerDto } from './dto/create-endpointer.dto.js';
import { UpdateEndpointerDto } from './dto/update-endpointer.dto.js';

@Injectable()
export class EndpointerService {
  create(createEndpointerDto: CreateEndpointerDto) {
    return 'This action adds a new endpointer';
  }

  findAll() {
    return `This action returns all endpointer`;
  }

  findOne(id: number) {
    return `This action returns a #${id} endpointer`;
  }

  update(id: number, updateEndpointerDto: UpdateEndpointerDto) {
    return `This action updates a #${id} endpointer`;
  }

  remove(id: number) {
    return `This action removes a #${id} endpointer`;
  }
}
