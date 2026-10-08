import { Injectable } from '@nestjs/common';
import type { TestmsgCreateInput, TestmsgUpdateInput } from '../generated/prisma/models.js';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class TestApiService {
  constructor(private readonly prisma: DatabaseService) {}

  async create(createTestApiDto: TestmsgCreateInput) {
    return this.prisma.testmsg.create({ data: createTestApiDto });
  }

  async findAll() {
    return this.prisma.testmsg.findMany();
  }

  async findOne(id: number) {
    return this.prisma.testmsg.findUnique({
      where: { id },
    });
  }

  async update(id: number, updateTestApiDto: TestmsgUpdateInput) {
    return this.prisma.testmsg.update({
      where: { id },
      data: updateTestApiDto,
    });
  }

  async remove(id: number) {
    return this.prisma.testmsg.delete({
      where: { id },
    });
  }
}
