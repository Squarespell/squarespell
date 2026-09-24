import tls from 'node:tls';
import type { EmailProvider, SendOpts } from './provider';

const HOST = process.env.SMTP_HOST || '';
const PORT = Number(process.env.SMTP_PORT || 465);
const USER = process.env.SMTP_USER || '';
const PASSWORD = process.env.SMTP_PASSWORD || '';

function b64(s: string): string {
  return Buffer.from(s, 'utf8').toString('base64');
}

function assertNoHeaderInjection(value: string, field: string) {
  if (/[\r\n]/.test(value)) throw new Error('Invalid ' + field + ': contains a line break');
}

function foldHeader(name: string, value: string): string {
  return name + ': ' + value + '\r\n';
}

function buildMessage(opts: SendOpts): { message: string; messageId: string } {
  const from = opts.fromName ? opts.fromName + ' <' + opts.from + '>' : opts.from;
  const messageId = '<' + Date.now() + '.' + Math.random().toString(36).slice(2) + '@squarespellquiz.com>';
  let headers = '';
  headers += foldHeader('From', from);
  headers += foldHeader('To', opts.to);
  headers += foldHeader('Subject', opts.subject);
  headers += foldHeader('MIME-Version', '1.0');
  headers += foldHeader('Content-Type', 'text/html; charset=utf-8');
  headers += foldHeader('Message-ID', messageId);
  headers += foldHeader('Date', new Date().toUTCString());
  if (opts.replyTo) headers += foldHeader('Reply-To', opts.replyTo);
  for (const k of Object.keys(opts.headers || {})) headers += foldHeader(k, (opts.headers as any)[k]);
  // Dot-stuff any body line that starts with '.', per RFC 5321 4.5.2.
  const body = opts.html.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n').replace(/^\./gm, '..');
  return { message: headers + '\r\n' + body, messageId };
}

class SmtpError extends Error {}

/**
 * Minimal SMTP client (implicit TLS on port 465, AUTH LOGIN), no external
 * dependency. One connection per send -- this path is low-volume
 * (auth codes, transactional notices), so pooling is not worth the
 * complexity it would add.
 */
function sendOne(opts: SendOpts): Promise<{ messageId: string }> {
  assertNoHeaderInjection(opts.to, 'recipient address');
  assertNoHeaderInjection(opts.from, 'sender address');
  assertNoHeaderInjection(opts.subject, 'subject');

  return new Promise((resolve, reject) => {
    if (!HOST || !USER || !PASSWORD) {
      reject(new SmtpError('SMTP not configured (missing SMTP_HOST/SMTP_USER/SMTP_PASSWORD)'));
      return;
    }

    const socket = tls.connect({ host: HOST, port: PORT, servername: HOST });
    let step = 0;
    let buf = '';
    let settled = false;

    const fail = (err: Error) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      reject(err);
    };
    const succeed = (messageId: string) => {
      if (settled) return;
      settled = true;
      resolve({ messageId });
    };

    socket.setTimeout(20000, () => fail(new SmtpError('SMTP connection timed out')));
    socket.on('error', (e) => fail(new SmtpError('SMTP connection error: ' + e.message)));

    const { message, messageId } = buildMessage(opts);

    socket.on('data', (data) => {
      buf += data.toString('utf8');
      if (!buf.endsWith('\r\n')) return;
      const lines = buf.trim().split('\r\n');
      const last = lines[lines.length - 1];
      const code = last.slice(0, 3);
      buf = '';

      if (step === 0 && code === '220') { socket.write('EHLO squarespellquiz.com\r\n'); step = 1; }
      else if (step === 1 && code === '250') { socket.write('AUTH LOGIN\r\n'); step = 2; }
      else if (step === 2 && code === '334') { socket.write(b64(USER) + '\r\n'); step = 3; }
      else if (step === 3 && code === '334') { socket.write(b64(PASSWORD) + '\r\n'); step = 4; }
      else if (step === 4) {
        if (code !== '235') { fail(new SmtpError('SMTP auth failed: ' + code)); return; }
        socket.write('MAIL FROM:<' + opts.from + '>\r\n'); step = 5;
      }
      else if (step === 5) {
        if (code !== '250') { fail(new SmtpError('SMTP MAIL FROM rejected: ' + code)); return; }
        socket.write('RCPT TO:<' + opts.to + '>\r\n'); step = 6;
      }
      else if (step === 6) {
        if (code !== '250') { fail(new SmtpError('SMTP RCPT TO rejected: ' + code)); return; }
        socket.write('DATA\r\n'); step = 7;
      }
      else if (step === 7) {
        if (code !== '354') { fail(new SmtpError('SMTP DATA rejected: ' + code)); return; }
        socket.write(message + '\r\n.\r\n'); step = 8;
      }
      else if (step === 8) {
        if (code !== '250') { fail(new SmtpError('SMTP send rejected: ' + code)); return; }
        socket.write('QUIT\r\n'); step = 9;
        succeed(messageId);
      }
      else if (step === 9) { socket.end(); }
      else { fail(new SmtpError('Unexpected SMTP response at step ' + step + ': ' + code)); }
    });
  });
}

export const hostingerSmtpProvider: EmailProvider = {
  send: sendOne,
  async sendBatch(batch) {
    const ids: string[] = [];
    for (const opts of batch) {
      const r = await sendOne(opts);
      ids.push(r.messageId);
    }
    return { messageIds: ids };
  },
};

