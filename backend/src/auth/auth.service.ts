import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PostgresService } from '../postgres/postgres.service';

interface TeacherRow { id: string; email: string; name: string; password_hash: string }

@Injectable()
export class AuthService {
  constructor(private readonly db: PostgresService, private readonly jwt: JwtService) {}

  async login(email: string, password: string) {
    const result = await this.db.query<TeacherRow>('SELECT id, email, name, password_hash FROM teachers WHERE email = $1', [email.toLowerCase()]);
    const teacher = result.rows[0];
    if (!teacher || !(await bcrypt.compare(password, teacher.password_hash))) throw new UnauthorizedException('Invalid credentials');
    const accessToken = await this.jwt.signAsync({ sub: teacher.id, email: teacher.email, name: teacher.name });
    return { accessToken, teacher: { id: teacher.id, email: teacher.email, name: teacher.name } };
  }
}
