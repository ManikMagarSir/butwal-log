const express = require('express');
const { auth, requireRole } = require('../middleware/auth');
const { fail, assertObjectId } = require('../utils/validate');
const User = require('../models/User');

const router = express.Router();
router.use(auth, requireRole('admin'));

router.get('/', async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: 1 }).select('_id name email role verified createdAt');
    res.json(users);
  } catch (e) {
    fail(res, e, 'GET /api/users');
  }
});

router.patch('/:id/role', async (req, res) => {
  try {
    assertObjectId(req.params.id);
    const { role } = req.body;
    if (!['admin', 'user'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
    const u = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('_id name email role');
    if (!u) return res.status(404).json({ error: 'Not found' });
    console.warn(`[audit] role change id=${req.params.id} role=${role} by=${req.user.email}`);
    res.json(u);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message });
    fail(res, e, 'PATCH /api/users/:id/role');
  }
});

router.delete('/:id', async (req, res) => {
  try {
    assertObjectId(req.params.id);
    if (String(req.params.id) === String(req.user._id)) return res.status(400).json({ error: 'Cannot delete self' });
    const u = await User.findByIdAndDelete(req.params.id);
    if (!u) return res.status(404).json({ error: 'Not found' });
    console.warn(`[audit] user deleted email=${u.email} by=${req.user.email}`);
    res.json({ ok: true });
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message });
    fail(res, e, 'DELETE /api/users/:id');
  }
});

module.exports = router;
