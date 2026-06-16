import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../backend/src/app.module';

let app: any;

export default async (req: any, res: any) => {
  if (!app) {
    app = await NestFactory.create(AppModule);
    app.setGlobalPrefix('api');
    await app.init();
  }

  return app.getHttpAdapter().getInstance()(req, res);
};