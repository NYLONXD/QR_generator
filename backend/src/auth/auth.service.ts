import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { trimmed } from '../common/trimmed';
import { PostgresService } from '../postgres/postgres.service';

/** Only official faculty addresses can sign up or sign in. Ownership isn't verified yet (no OTP, no staff directory). */
const FACULTY_EMAIL = /^[a-z0-9._-]{1,64}@thapar\.edu$/;
const BCRYPT_ROUNDS = 10;
/** A teacher as the API returns it: never includes password_hash. */
const TEACHER_COLUMNS = 'id, email, name, department, designation, role, created_at AS "createdAt"';

export interface Teacher { id: string; email: string; name: string; department: string | null; designation: string | null; role: string; createdAt: Date }
export interface ProfileInput { name?: string; department?: string; designation?: string }
export interface RegisterInput extends ProfileInput { email?: string; password?: string }

@Injectable()
export class AuthService {
  constructor(private readonly db: PostgresService, private readonly jwt: JwtService) {}

  /** Self sign-up: the account is active straight away and the teacher is signed in. */
  async register(input: RegisterInput) {
    const email = this.facultyEmail(input.email);
    const password = this.newPassword(input.password);
    const { name, department, designation } = this.profile(input);
    const result = await this.db.query<Teacher>(
      `INSERT INTO teachers (email, name, department, designation, password_hash) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO NOTHING RETURNING ${TEACHER_COLUMNS}`,
      [email, name, department, designation, await bcrypt.hash(password, BCRYPT_ROUNDS)],
    );
    if (!result.rows[0]) throw new ConflictException('An account with this email already exists.');
    return this.signIn(result.rows[0]);
  }

  async login(email: unknown, password: unknown) {
    const result = await this.db.query<Teacher & { password_hash: string }>(`SELECT ${TEACHER_COLUMNS}, password_hash FROM teachers WHERE email = $1`, [this.facultyEmail(email)]);
    const row = result.rows[0];
    if (!row || typeof password !== 'string' || !(await bcrypt.compare(password, row.password_hash))) throw new UnauthorizedException('Invalid credentials');
    const { password_hash: _passwordHash, ...teacher } = row;
    return this.signIn(teacher);
  }

  async me(teacherId: string) {
    const result = await this.db.query<Teacher>(`SELECT ${TEACHER_COLUMNS} FROM teachers WHERE id = $1`, [teacherId]);
    if (!result.rows[0]) throw new UnauthorizedException();
    return result.rows[0];
  }

  async updateProfile(teacherId: string, input: ProfileInput) {
    const { name, department, designation } = this.profile(input);
    const result = await this.db.query<Teacher>(
      `UPDATE teachers SET name = $2, department = $3, designation = $4 WHERE id = $1 RETURNING ${TEACHER_COLUMNS}`,
      [teacherId, name, department, designation],
    );
    if (!result.rows[0]) throw new UnauthorizedException();
    return result.rows[0];
  }

  async changePassword(teacherId: string, currentPassword: unknown, newPassword: unknown) {
    const password = this.newPassword(newPassword);
    const result = await this.db.query<{ password_hash: string }>('SELECT password_hash FROM teachers WHERE id = $1', [teacherId]);
    if (!result.rows[0]) throw new UnauthorizedException();
    // 400, not 401: the frontend signs the teacher out on any 401.
    if (typeof currentPassword !== 'string' || !(await bcrypt.compare(currentPassword, result.rows[0].password_hash))) throw new BadRequestException('Current password is incorrect.');
    await this.db.query('UPDATE teachers SET password_hash = $2 WHERE id = $1', [teacherId, await bcrypt.hash(password, BCRYPT_ROUNDS)]);
    return { ok: true };
  }

  private async signIn(teacher: Teacher) {
    const accessToken = await this.jwt.signAsync({ sub: teacher.id, email: teacher.email, name: teacher.name, role: teacher.role });
    return { accessToken, teacher };
  }

  private facultyEmail(value: unknown) {
    const email = trimmed(value).toLowerCase();
    if (!FACULTY_EMAIL.test(email)) throw new BadRequestException('Use your official @thapar.edu email address.');
    return email;
  }

  private newPassword(value: unknown) {
    const password = typeof value === 'string' ? value : '';
    // bcrypt ignores everything after 72 bytes, so reject rather than silently truncate.
    if (password.length < 8 || Buffer.byteLength(password) > 72) throw new BadRequestException('Password must be 8 to 72 characters long.');
    return password;
  }

  private profile(input: ProfileInput) {
    const name = trimmed(input.name);
    const department = trimmed(input.department);
    const designation = trimmed(input.designation);
    if (name.length < 3 || name.length > 100) throw new BadRequestException('Enter your full name (3 to 100 characters).');
    if (department.length > 100 || designation.length > 100) throw new BadRequestException('Department and designation must be at most 100 characters.');
    return { name, department: department || null, designation: designation || null };
  }
}
