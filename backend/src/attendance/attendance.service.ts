import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { Response } from 'express';
import { PostgresService } from '../postgres/postgres.service';
import { RedisService } from '../redis/redis.service';

const QR_TTL_SECONDS = 15;
const GRANT_TTL_SECONDS = 60;
const BROWSER_SESSION_TTL_SECONDS = 300;
const BROWSER_COOKIE = 'attendance_browser_session';

interface SessionStatusRow { id: string; status: string }
interface SessionUrlRow { google_form_url: string; status: string }
interface Grant { sessionId: string; browserSessionId: string }

@Injectable()
export class AttendanceService {
  private readonly publicBaseUrl: string;
  private readonly secureCookie: boolean;

  constructor(private readonly db: PostgresService, private readonly redis: RedisService, config: ConfigService) {
    this.publicBaseUrl = config.get<string>('PUBLIC_BASE_URL', 'http://localhost:3000').replace(/\/$/, '');
    this.secureCookie = config.get<string>('COOKIE_SECURE', 'true') !== 'false';
  }

  async start(teacherId: string, googleFormUrl: string) {
    if (!this.isGoogleFormsUrl(googleFormUrl)) throw new BadRequestException('A valid Google Forms URL is required');
    const result = await this.db.query<{ id: string }>(
      'INSERT INTO attendance_sessions (teacher_id, google_form_url, status) VALUES ($1, $2, $3) RETURNING id',
      [teacherId, googleFormUrl, 'active'],
    );
    await this.redis.client.set(this.sessionActiveKey(result.rows[0].id), '1');
    return { sessionId: result.rows[0].id };
  }

  async stop(teacherId: string, sessionId: string) {
    const result = await this.db.query<{ id: string }>(
      "UPDATE attendance_sessions SET status = 'stopped', stopped_at = NOW() WHERE id = $1 AND teacher_id = $2 AND status = 'active' RETURNING id",
      [sessionId, teacherId],
    );
    if (!result.rowCount) throw new NotFoundException('Active attendance session not found');
    const currentKey = this.currentTokenKey(sessionId);
    const token = await this.redis.client.get(currentKey);
    const keys = [currentKey, this.sessionActiveKey(sessionId)];
    if (token) keys.push(this.reverseTokenKey(token));
    await this.redis.client.del(...keys);
    return { stopped: true };
  }

  async getQr(teacherId: string, sessionId: string) {
    const session = await this.db.query<SessionStatusRow>('SELECT id, status FROM attendance_sessions WHERE id = $1 AND teacher_id = $2', [sessionId, teacherId]);
    if (!session.rows[0] || session.rows[0].status !== 'active') throw new NotFoundException('Active attendance session not found');
    await this.redis.client.set(this.sessionActiveKey(sessionId), '1');

    const currentKey = this.currentTokenKey(sessionId);
    let token = await this.redis.client.get(currentKey);
    if (!token) {
      const candidate = this.randomToken();
      token = await this.redis.client.eval(
        "local existing = redis.call('GET', KEYS[1]); if existing then return existing end; redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[3]); redis.call('SET', KEYS[2], ARGV[2], 'EX', ARGV[3]); return ARGV[1]",
        2,
        currentKey,
        this.reverseTokenKey(candidate),
        candidate,
        sessionId,
        String(QR_TTL_SECONDS),
      ) as string;
    }
    if (!token) throw new BadRequestException('Unable to create QR token');
    const ttlRemaining = await this.redis.client.ttl(currentKey);
    return { token, qrUrl: `${this.publicBaseUrl}/a/${encodeURIComponent(token)}`, ttlRemaining: Math.max(ttlRemaining, 0) };
  }

  async serveGateway(token: string, res: Response) {
    const browserSessionId = this.randomToken();
    await this.redis.client.set(this.browserSessionKey(browserSessionId), '1', 'EX', BROWSER_SESSION_TTL_SECONDS);
    res.cookie(BROWSER_COOKIE, browserSessionId, { httpOnly: true, secure: this.secureCookie, sameSite: 'lax', path: '/', maxAge: BROWSER_SESSION_TTL_SECONDS * 1000 });
    res.type('html').send(this.gatewayHtml(token));
  }

  async validate(token: string, browserSessionId: string | undefined, ip: string | undefined) {
    if (!token) throw new UnauthorizedException('QR expired or invalid');
    await this.checkRateLimit(`rate:ip:${ip ?? 'unknown'}`, 300, 60);
    const sessionId = await this.redis.client.get(this.reverseTokenKey(token));
    if (!sessionId) throw new UnauthorizedException('QR expired or invalid');
    await this.checkRateLimit(`rate:session:${sessionId}`, 500, 60);
    if (!browserSessionId || !(await this.redis.client.get(this.browserSessionKey(browserSessionId)))) throw new UnauthorizedException();
    await this.checkRateLimit(`rate:browser:${createHash('sha256').update(browserSessionId).digest('hex')}`, 10, 30);
    if (!(await this.redis.client.get(this.sessionActiveKey(sessionId)))) throw new UnauthorizedException();
    const grantToken = this.randomToken();
    const grant: Grant = { sessionId, browserSessionId };
    await this.redis.client.set(this.grantKey(grantToken), JSON.stringify(grant), 'EX', GRANT_TTL_SECONDS);
    return { grantToken };
  }

  async access(grantToken: string, browserSessionId: string | undefined, res: Response) {
    const grantKey = this.grantKey(grantToken);
    const rawGrant = await this.redis.client.get(grantKey);
    if (!rawGrant) throw new UnauthorizedException();
    await this.redis.client.del(grantKey);
    const grant = JSON.parse(rawGrant) as Grant;
    if (!browserSessionId || browserSessionId !== grant.browserSessionId) throw new UnauthorizedException();
    const result = await this.db.query<SessionUrlRow>('SELECT google_form_url, status FROM attendance_sessions WHERE id = $1', [grant.sessionId]);
    if (!result.rows[0] || result.rows[0].status !== 'active') throw new UnauthorizedException();
    res.redirect(302, result.rows[0].google_form_url);
  }

  private isGoogleFormsUrl(value: string) {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && ((url.hostname === 'docs.google.com' && url.pathname.startsWith('/forms/')) || url.hostname === 'forms.gle');
    } catch { return false; }
  }

  private randomToken() { return randomBytes(32).toString('base64url'); }
  private currentTokenKey(sessionId: string) { return `qr:${sessionId}:current`; }
  private reverseTokenKey(token: string) { return `qr-token:${token}`; }
  private grantKey(token: string) { return `grant:${token}`; }
  private browserSessionKey(id: string) { return `browser-session:${createHash('sha256').update(id).digest('hex')}`; }
  private sessionActiveKey(sessionId: string) { return `session:${sessionId}:active`; }

  private async checkRateLimit(key: string, limit: number, seconds: number) {
    const count = await this.redis.client.incr(key);
    if (count === 1) await this.redis.client.expire(key, seconds);
    if (count > limit) throw new UnauthorizedException('Too many requests');
  }

  private gatewayHtml(token: string) { return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Validating attendance access</title><style>body{font-family:system-ui,sans-serif;background:#f8fafc;color:#0f172a;min-height:100vh;display:grid;place-items:center;margin:0}.card{background:#fff;border:1px solid #e2e8f0;border-radius:20px;padding:32px;max-width:340px;text-align:center;box-shadow:0 8px 30px #0001}.muted{color:#64748b}.spinner{width:48px;height:48px;border:4px solid #e2e8f0;border-top-color:#16a34a;border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 18px}@keyframes spin{to{transform:rotate(360deg)}}.ok{color:#16a34a}.bad{color:#dc2626}</style></head><body><main class="card"><div class="spinner" id="spinner"></div><h1 id="title">Validating attendance access...</h1><p class="muted" id="body">Please wait.</p></main><script>const token=${JSON.stringify(token)};async function run(){try{const r=await fetch('/attendance/validate',{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify({token})});if(!r.ok)throw new Error('bad');const d=await r.json();document.getElementById('spinner').style.display='none';document.getElementById('title').className='ok';document.getElementById('title').textContent='Access granted';document.getElementById('body').textContent='Opening Google Form...';location.replace('/attendance/access/'+encodeURIComponent(d.grantToken));}catch(e){document.getElementById('spinner').style.display='none';document.getElementById('title').className='bad';document.getElementById('title').textContent='QR expired or invalid.';document.getElementById('body').textContent='Please scan the current QR.';}}run();</script></body></html>`; }
}
