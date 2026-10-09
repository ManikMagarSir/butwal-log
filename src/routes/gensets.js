const express = require('express');
const { auth, requireRole } = require('../middleware/auth');
const { pick, assertNoOperators, fail, assertObjectId } = require('../utils/validate');
const GensetLog = require('../models/GensetLog');

const router = express.Router();
router.use(auth);

// Allowlist: client-controlled fields only. createdBy is always forced server-side.
const FIELDS = ['date', 'dieselPurchase', 'securityName', 'startTime', 'endTime', 'g1', 'g2', 'stockDrum', 'fuelConsumed', 'remarks'];

function parseDate(s) {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

router.get('/', async (req, res) => {
  try {
    const q = {};
    const from = parseDate(req.query.from && String(req.query.from).slice(0, 10));
    const to = parseDate(req.query.to && String(req.query.to).slice(0, 10));
    if (from || to) {
      q.date = {};
      if (from) { from.setUTCHours(0, 0, 0, 0); q.date.$gte = from; }
      if (to) { to.setUTCHours(0, 0, 0, 0); to.setUTCDate(to.getUTCDate() + 1); q.date.$lt = to; }
    }
    if (req.query.date) {
      const d = parseDate(String(req.query.date).slice(0, 10));
      if (d) {
        const start = new Date(d); start.setUTCHours(0, 0, 0, 0);
        const end = new Date(start); end.setUTCDate(end.getUTCDate() + 1);
        q.date = { $gte: start, $lt: end };
      }
    }
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 31)));
    const total = await GensetLog.countDocuments(q);
    const rows = await GensetLog.find(q).sort({ date: -1, startTime: 1 }).skip((page - 1) * limit).limit(limit).populate('createdBy', 'name email');
    res.json({ total, page, limit, rows });
  } catch (e) {
    fail(res, e, 'GET /api/gensets');
  }
});

router.get('/:id', async (req, res) => {
  try {
    assertObjectId(req.params.id);
    const row = await GensetLog.findById(req.params.id).populate('createdBy', 'name email');
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message });
    fail(res, e, 'GET /api/gensets/:id');
  }
});

router.post('/', async (req, res) => {
  try {
    assertNoOperators(req.body);
    const row = await GensetLog.create({ ...pick(req.body, FIELDS), createdBy: req.user._id });
    res.status(201).json(row);
  } catch (e) {
    if (e.status === 422) return res.status(422).json({ error: e.message });
    if (e.name === 'ValidationError') return res.status(400).json({ error: e.message });
    fail(res, e, 'POST /api/gensets');
  }
});

router.put('/:id', requireRole('admin'), async (req, res) => {
  try {
    assertObjectId(req.params.id);
    assertNoOperators(req.body);
    const row = await GensetLog.findByIdAndUpdate(req.params.id, pick(req.body, FIELDS), { new: true, runValidators: true });
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (e) {
    if (e.status === 422 || e.status === 400) return res.status(e.status).json({ error: e.message });
    if (e.name === 'ValidationError' || e.name === 'CastError') return res.status(400).json({ error: 'Invalid input' });
    fail(res, e, 'PUT /api/gensets/:id');
  }
});

router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    assertObjectId(req.params.id);
    const row = await GensetLog.findByIdAndDelete(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    console.warn(`[audit] genset deleted id=${req.params.id} by=${req.user.email}`);
    res.json({ ok: true });
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message });
    fail(res, e, 'DELETE /api/gensets/:id');
  }
});

module.exports = router;
