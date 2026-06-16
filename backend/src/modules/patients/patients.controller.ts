import { Controller, Get, Post, Patch, Param, Body } from '@nestjs/common';
import { PatientsService } from './patients.service';

@Controller('patients')
export class PatientsController {
  constructor(private patientsService: PatientsService) {}

  @Get()
  async getAllPatients() {
    return this.patientsService.getAllPatients();
  }

  @Get(':id')
  async getPatientById(@Param('id') id: string) {
    return this.patientsService.getPatientById(id);
  }

  @Post()
  async createPatient(
    @Body()
    dto: {
      fullName: string;
      birthDate?: string;
      nationalId?: string;
    },
  ) {
    return this.patientsService.createPatient(dto);
  }

  @Patch(':id')
  async updatePatient(@Param('id') id: string, @Body() dto: any) {
    return this.patientsService.updatePatient(id, dto);
  }
}