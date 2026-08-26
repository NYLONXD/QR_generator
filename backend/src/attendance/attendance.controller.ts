import { Body, Controller, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtAuthGuard, TeacherRequest } from '../auth/jwt-auth.guard';
import { AttendanceService } from './attendance.service';

@Controller()
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @UseGuards(JwtAuthGuard)
  @Post('attendance/start')
  start(@Req() req: TeacherRequest, @Body() body: { googleFormUrl?: string }) {
    return this.attendance.start(req.teacher.id, body.googleFormUrl ?? '');
  }

  @UseGuards(JwtAuthGuard)
  @Post('attendance/stop')
  stop(@Req() req: TeacherRequest, @Body() body: { sessionId?: string }) {
    return this.attendance.stop(req.teacher.id, body.sessionId ?? '');
  }

  @UseGuards(JwtAuthGuard)
  @Get('attendance/:sessionId/qr')
  getQr(@Req() req: TeacherRequest, @Param('sessionId') sessionId: string) {
    return this.attendance.getQr(req.teacher.id, sessionId);
  }

  @Get('a/:token')
  gateway(@Param('token') token: string, @Res() res: Response) {
    return this.attendance.serveGateway(token, res);
  }

  @Post('attendance/validate')
  validate(@Req() req: Request, @Body() body: { token?: string }) {
    return this.attendance.validate(body.token ?? '', req.cookies?.attendance_browser_session, req.ip);
  }

  @Get('attendance/access/:grantToken')
  access(@Param('grantToken') grantToken: string, @Req() req: Request, @Res() res: Response) {
    return this.attendance.access(grantToken, req.cookies?.attendance_browser_session, res);
  }
}
