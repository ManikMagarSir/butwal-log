// Boundary validation helpers (security-and-hardening: schema validation at boundaries).
// Every route builds DB documents from pick() output only, never from raw req.body,
// and rejects MongoDB operator keys ($where, $gt, ...) and dotted paths with 422.

function pick(obj, keys) {
  const out = {};
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return out;
  for (const k of keys) {
    if (obj[k] !== undefined) out[k] = obj[k];
  }
  return out;
}

function assertNoOperators(obj, path = 'body') {
  const check = (o, p) => {
    if (!o || typeof o !== 'object') return;
    for (const k of Object.keys(o)) {
      if (k.startsWith('$') || k.includes('.')) {
        const err = new Error(`Invalid key '${k}' in ${p}`);
        err.status = 422;
        throw err;
      }
      if (o[k] && typeof o[k] === 'object') check(o[k], p);
    }
  };
  check(obj, path);
  return obj;
}

function isCleanBody(obj) {
  try {
    assertNoOperators(obj);
    return true;
  } catch {
    return false;
  }
}

// 500s stay generic to clients; internals go to the server log only.
function fail(res, err, ctx) {
  console.error(`[500] ${ctx}:`, err && err.message ? err.message : err);
  res.status(500).json({ error: 'Server error' });
}

const mongoose = require('mongoose');

function assertObjectId(id) {
  if (!mongoose.isValidObjectId(id)) {
    const err = new Error('Invalid id');
    err.status = 400;
    throw err;
  }
}

module.exports = { pick, assertNoOperators, isCleanBody, fail, assertObjectId };
