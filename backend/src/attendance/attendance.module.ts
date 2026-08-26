import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PostgresModule } from '../postgres/postgres.module';
import { RedisModule } from '../redis/redis.module';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';

@Module({ imports: [AuthModule, PostgresModule, RedisModule], controllers: [AttendanceController], providers: [AttendanceService] })
export class AttendanceModule {}
