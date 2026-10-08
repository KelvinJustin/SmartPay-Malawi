import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { EndpointerService } from './endpointer.service.js';
import { CreateEndpointerDto } from './dto/create-endpointer.dto.js';
import { UpdateEndpointerDto } from './dto/update-endpointer.dto.js';

@Controller('endpointer')
export class EndpointerController {
  constructor(private readonly endpointerService: EndpointerService) {}

  @Post()
  create(@Body() createEndpointerDto: CreateEndpointerDto) {
    return this.endpointerService.create(createEndpointerDto);
  }

  @Get()
  findAll() {
    return this.endpointerService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.endpointerService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateEndpointerDto: UpdateEndpointerDto) {
    return this.endpointerService.update(+id, updateEndpointerDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.endpointerService.remove(+id);
  }
}
