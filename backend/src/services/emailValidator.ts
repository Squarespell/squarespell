const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'tempmail.com', 'throwaway.email',
  'yopmail.com', 'sharklasers.com', 'guerrillamailblock.com', 'grr.la',
  'guerrillamail.info', 'guerrillamail.de', 'guerrillamail.net',
  'trashmail.com', 'trashmail.me', 'trashmail.net', 'dispostable.com',
  'maildrop.cc', 'mailnesia.com', 'mailexpire.com', 'temp-mail.org',
  'fakeinbox.com', 'mailcatch.com', 'tempail.com', 'tempr.email',
  'discard.email', 'disposableemailaddresses.emailmiser.com',
  'getnada.com', 'emailondeck.com', 'mohmal.com', 'burnermail.io',
  'mailsac.com', 'harakirimail.com', 'mytemp.email', 'tempmailaddress.com',
  'tmpmail.net', 'tmpmail.org', 'bupmail.com', 'mailtemp.net',
  'tempinbox.com', 'jetable.org', 'trash-mail.com', 'tempomail.fr',
  'ephemail.net', 'tempmailo.com', 'spamgourmet.com', 'mintemail.com',
  'mailnator.com', 'anonbox.net', 'trashymail.com', 'incognitomail.org',
  '10minutemail.com', 'guerrillamail.com', 'maildrop.cc', 'nada.email',
  'tempmail.ninja', 'crazymailing.com', 'disposable.email', 'emailfake.com',
  'generator.email', 'guerrillamail.biz', 'hornyalwary.top', 'mailtemp.info',
  'safetymail.info', 'tmail.ws', 'temp-mail.io', 'tempail.com',
  'tempm.com', 'temporarymail.com', 'tempr.email', 'throwam.com',
  'wegwerfemail.de', 'yopmail.fr', 'yopmail.net', '20minutemail.com',
  'armyspy.com', 'cuvox.de', 'dayrep.com', 'einrot.com', 'fleckens.hu',
  'gustr.com', 'jourrapide.com', 'rhyta.com', 'superrito.com',
  'teleworm.us', 'mailforspam.com', 'spam4.me', 'trashmail.io',
  'disposableaddress.com', 'mailnull.com', 'spamfree24.org',
  'bugmenot.com', 'deadaddress.com', 'despammed.com', 'devnullmail.com',
  'dodgit.com', 'filzmail.com', 'haltospam.com', 'jetable.com',
  'kasmail.com', 'klassmaster.com', 'lhsdv.com', 'mailinater.com',
  'mailmetrash.com', 'mytempmail.com', 'nobulk.com', 'nospamfor.us',
  'owlpic.com', 'pookmail.com', 'proxymail.eu', 'rcpt.at', 'reallymymail.com',
  'rtrtr.com', 'sharklasers.com', 'sogetthis.com', 'spamavert.com'
]);

export function validateEmail(email: string): { valid: boolean; reason?: string } {
  if (!email || typeof email !== 'string') {
    return { valid: false, reason: 'Email is required' };
  }

  const trimmed = email.trim().toLowerCase();

  if (trimmed.length > 254) {
    return { valid: false, reason: 'Email address is too long' };
  }

  if (!EMAIL_REGEX.test(trimmed)) {
    return { valid: false, reason: 'Invalid email format' };
  }

  const domain = trimmed.split('@')[1];
  if (!domain || domain.length < 3) {
    return { valid: false, reason: 'Invalid email domain' };
  }

  if (DISPOSABLE_DOMAINS.has(domain)) {
    return { valid: false, reason: 'Disposable email addresses are not allowed' };
  }

  return { valid: true };
}
