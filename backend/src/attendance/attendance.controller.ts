import { Body, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtAuthGuard, TeacherRequest } from '../auth/jwt-auth.guard';
import { AttendanceService, StartSessionInput } from './attendance.service';

/** A malformed id gets the same 404 as another teacher's session, instead of a Postgres uuid cast error (500). */
const parseSessionId = new ParseUUIDPipe({ exceptionFactory: () => new NotFoundException('Attendance session not found') });

@Controller()
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @UseGuards(JwtAuthGuard)
  @Post('attendance/start')
  start(@Req() req: TeacherRequest, @Body() body: StartSessionInput) {
    return this.attendance.start(req.teacher.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('attendance/stop')
  stop(@Req() req: TeacherRequest, @Body('sessionId', parseSessionId) sessionId: string) {
    return this.attendance.stop(req.teacher.id, sessionId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('attendance/sessions')
  listSessions(@Req() req: TeacherRequest) {
    return this.attendance.listSessions(req.teacher.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('attendance/sessions/:sessionId')
  getSession(@Req() req: TeacherRequest, @Param('sessionId', parseSessionId) sessionId: string) {
    return this.attendance.getSession(req.teacher.id, sessionId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('attendance/:sessionId/qr')
  getQr(@Req() req: TeacherRequest, @Param('sessionId', parseSessionId) sessionId: string) {
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
