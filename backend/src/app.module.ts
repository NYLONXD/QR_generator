import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AttendanceModule } from './attendance/attendance.module';
import { AuthModule } from './auth/auth.module';
import { PostgresModule } from './postgres/postgres.module';
import { RedisModule } from './redis/redis.module';

@Module({ imports: [ConfigModule.forRoot({ isGlobal: true }), PostgresModule, RedisModule, AuthModule, AttendanceModule] })
export class AppModule {}
