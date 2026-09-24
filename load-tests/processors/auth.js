/**
 * Shared JWT cache so Artillery VUs do not hammer /auth/login
 * (backend LOGIN_RATE_LIMIT_PER_MIN is typically ~15).
 */
let cachedToken = null;
let inflight = null;

function targetBase() {
  return (process.env.ARTILLERY_TARGET || process.env.TARGET || 'http://localhost:3001/api').replace(/\/$/, '');
}

function credentials(context) {
  return {
    email: context.vars.loginEmail || process.env.LOGIN_EMAIL || 'admin@institute.edu',
    password: context.vars.loginPassword || process.env.LOGIN_PASSWORD || 'Prabodh@123',
  };
}

async function loginOnce(context) {
  if (cachedToken) return cachedToken;
  if (inflight) return inflight;

  const { email, password } = credentials(context);
  inflight = (async () => {
    const res = await fetch(`${targetBase()}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const text = await res.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      throw new Error(`Login returned non-JSON (${res.status}): ${text.slice(0, 120)}`);
    }
    if (!res.ok || !body.accessToken) {
      throw new Error(`Login failed (${res.status}): ${body.message || text.slice(0, 120)}`);
    }
    cachedToken = body.accessToken;
    return cachedToken;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

function ensureToken(context, events, done) {
  // Prefer token injected via --variables / env (CI / smoke:render helper).
  const injected = process.env.ACCESS_TOKEN || context.vars.accessToken;
  if (injected) {
    context.vars.accessToken = injected;
    return done();
  }

  loginOnce(context)
    .then((token) => {
      context.vars.accessToken = token;
      done();
    })
    .catch((err) => done(err));
}

module.exports = {
  ensureToken,
};
