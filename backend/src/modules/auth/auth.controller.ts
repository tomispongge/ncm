import { Controller, Post, Body, Get, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() dto: { email: string; password: string }) {
    return this.authService.login(dto.email, dto.password);
  }

  @Get('me')
  async getMe(@Req() req: any) {
    // Por ahora, retorna un objeto dummy
    return { id: '123', email: 'test@hospital.local', fullName: 'Test User' };
  }

  @Post('refresh')
  async refresh(@Body() dto: { refreshToken: string }) {
    return { token: 'new-jwt-token' };
  }
}