import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { PatientsModule } from './modules/patients/patients.module';
import { SyncModule } from './modules/sync/sync.module';

@Module({
  imports: [AuthModule, PatientsModule, SyncModule],
  controllers: [],
  providers: [],
})
export class AppModule {}