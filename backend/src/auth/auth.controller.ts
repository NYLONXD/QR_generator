import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService, ProfileInput, RegisterInput } from './auth.service';
import { JwtAuthGuard, TeacherRequest } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() body: RegisterInput) {
    return this.auth.register(body);
  }

  @Post('login')
  login(@Body() body: { email?: string; password?: string }) {
    return this.auth.login(body.email, body.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: TeacherRequest) {
    return this.auth.me(req.teacher.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateProfile(@Req() req: TeacherRequest, @Body() body: ProfileInput) {
    return this.auth.updateProfile(req.teacher.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  changePassword(@Req() req: TeacherRequest, @Body() body: { currentPassword?: string; newPassword?: string }) {
    return this.auth.changePassword(req.teacher.id, body.currentPassword, body.newPassword);
  }
}
