const express = require('express');
const { auth, requireRole } = require('../middleware/auth');
const { pick, assertNoOperators, fail, assertObjectId } = require('../utils/validate');
const DcLog = require('../models/DcLog');

const router = express.Router();
router.use(auth);

// Allowlist: client-controlled fields only. createdBy is always forced server-side.
const FIELDS = ['date', 'time', 'upsStatus', 'upsLoadA', 'upsLoadB', 'upsLoadC', 'racks', 'pac', 'mainsA', 'mainsB', 'dutyPerson'];
// dutyPerson is identity, not input: locked to the creator's account, never updatable.
const UPDATE_FIELDS = FIELDS.filter((f) => f !== 'dutyPerson');

function parseDate(s) {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

// GET /api/dclogs?date=YYYY-MM-DD&from=&to=&page=&limit=
router.get('/', async (req, res) => {
  try {
    const q = {};
    if (req.query.date) {
      const d = parseDate(String(req.query.date).slice(0, 10));
      if (d) {
        const start = new Date(d); start.setUTCHours(0, 0, 0, 0);
        const end = new Date(start); end.setUTCDate(end.getUTCDate() + 1);
        q.date = { $gte: start, $lt: end };
      }
    } else {
      const from = parseDate(req.query.from && String(req.query.from).slice(0, 10));
      const to = parseDate(req.query.to && String(req.query.to).slice(0, 10));
      if (from || to) {
        q.date = {};
        if (from) { from.setUTCHours(0, 0, 0, 0); q.date.$gte = from; }
        if (to) { to.setUTCHours(0, 0, 0, 0); to.setUTCDate(to.getUTCDate() + 1); q.date.$lt = to; }
      }
    }
    // Non-admins see all logs too (read-only history) but cannot edit/delete.
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 31)));
    const total = await DcLog.countDocuments(q);
    const rows = await DcLog.find(q).sort({ date: -1, time: 1 }).skip((page - 1) * limit).limit(limit).populate('createdBy', 'name email');
    res.json({ total, page, limit, rows });
  } catch (e) {
    fail(res, e, 'GET /api/dclogs');
  }
});

router.get('/:id', async (req, res) => {
  try {
    assertObjectId(req.params.id);
    const row = await DcLog.findById(req.params.id).populate('createdBy', 'name email');
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message });
    fail(res, e, 'GET /api/dclogs/:id');
  }
});

// Users + admins can create
router.post('/', async (req, res) => {
  try {
    assertNoOperators(req.body);
    const row = await DcLog.create({ ...pick(req.body, FIELDS), createdBy: req.user._id, dutyPerson: req.user.name });
    res.status(201).json(row);
  } catch (e) {
    if (e.status === 422) return res.status(422).json({ error: e.message });
    if (e.code === 11000) return res.status(409).json({ error: 'Log for this date+time already exists' });
    if (e.name === 'ValidationError') return res.status(400).json({ error: e.message });
    fail(res, e, 'POST /api/dclogs');
  }
});

// Admin only edit/delete
router.put('/:id', requireRole('admin'), async (req, res) => {
  try {
    assertObjectId(req.params.id);
    assertNoOperators(req.body);
    const row = await DcLog.findByIdAndUpdate(req.params.id, pick(req.body, UPDATE_FIELDS), { new: true, runValidators: true });
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (e) {
    if (e.status === 422 || e.status === 400) return res.status(e.status).json({ error: e.message });
    if (e.code === 11000) return res.status(409).json({ error: 'Duplicate date+time' });
    if (e.name === 'ValidationError' || e.name === 'CastError') return res.status(400).json({ error: 'Invalid input' });
    fail(res, e, 'PUT /api/dclogs/:id');
  }
});

router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    assertObjectId(req.params.id);
    const row = await DcLog.findByIdAndDelete(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    console.warn(`[audit] dclog deleted id=${req.params.id} by=${req.user.email}`);
    res.json({ ok: true });
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message });
    fail(res, e, 'DELETE /api/dclogs/:id');
  }
});

module.exports = router;
