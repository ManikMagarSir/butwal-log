const express = require('express');
const { auth, requireRole } = require('../middleware/auth');
const { fail } = require('../utils/validate');
const DcLog = require('../models/DcLog');
const GensetLog = require('../models/GensetLog');

const router = express.Router();
router.use(auth, requireRole('admin'));

function csvCell(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

router.get('/dclogs.csv', async (req, res) => {
  try {
  const q = {};
  const from = req.query.from ? new Date(String(req.query.from).slice(0, 10)) : null;
  const to = req.query.to ? new Date(String(req.query.to).slice(0, 10)) : null;
  if ((from && !isNaN(from)) || (to && !isNaN(to))) {
    q.date = {};
    if (from && !isNaN(from)) q.date.$gte = from;
    if (to && !isNaN(to)) q.date.$lt = new Date(to.getTime() + 86400000);
  }
  const rows = await DcLog.find(q).sort({ date: 1, time: 1 }).lean();
  const head = ['date', 'time', 'upsStatus', 'upsLoadA', 'upsLoadB', 'upsLoadC', 'dutyPerson', 'mainsA_AB', 'mainsA_BC', 'mainsA_CA', 'mainsB_AB', 'mainsB_BC', 'mainsB_CA'];
  for (let i = 1; i <= 22; i++) head.push(`rack${i}A`, `rack${i}B`);
  for (const p of ['A', 'B', 'C', 'D']) head.push(`pac${p}_temp`, `pac${p}_hum`);
  const lines = [head.join(',')];
  for (const r of rows) {
    const rackMap = {};
    for (const x of r.racks || []) rackMap[x.no] = x;
    const pacMap = {};
    for (const x of r.pac || []) pacMap[x.id] = x;
    const vals = [
      new Date(r.date).toISOString().slice(0, 10), r.time, r.upsStatus, r.upsLoadA, r.upsLoadB, r.upsLoadC, r.dutyPerson,
      r.mainsA?.ab, r.mainsA?.bc, r.mainsA?.ca, r.mainsB?.ab, r.mainsB?.bc, r.mainsB?.ca,
    ];
    for (let i = 1; i <= 22; i++) vals.push(rackMap[i]?.a ?? '', rackMap[i]?.b ?? '');
    for (const p of ['A', 'B', 'C', 'D']) vals.push(pacMap[p]?.temp ?? '', pacMap[p]?.humidity ?? '');
    lines.push(vals.map(csvCell).join(','));
  }
  res.header('Content-Type', 'text/csv');
  res.header('Content-Disposition', 'attachment; filename="dclogs.csv"');
  res.send(lines.join('\n'));
  } catch (e) {
    if (!res.headersSent) fail(res, e, 'GET /api/export/dclogs.csv');
  }
});

router.get('/gensets.csv', async (req, res) => {
  try {
  const q = {};
  const from = req.query.from ? new Date(String(req.query.from).slice(0, 10)) : null;
  const to = req.query.to ? new Date(String(req.query.to).slice(0, 10)) : null;
  if ((from && !isNaN(from)) || (to && !isNaN(to))) {
    q.date = {};
    if (from && !isNaN(from)) q.date.$gte = from;
    if (to && !isNaN(to)) q.date.$lt = new Date(to.getTime() + 86400000);
  }
  const rows = await GensetLog.find(q).sort({ date: 1 }).lean();
  const head = ['date', 'dieselPurchase', 'securityName', 'startTime', 'endTime', 'g1_before', 'g1_after', 'g1_loadKw', 'g1_fuelPct', 'g1_runMin', 'g2_before', 'g2_after', 'g2_loadKw', 'g2_fuelPct', 'g2_runMin', 'stockDrum', 'fuelConsumed', 'remarks'];
  const lines = [head.join(',')];
  for (const r of rows) {
    const vals = [
      new Date(r.date).toISOString().slice(0, 10), r.dieselPurchase, r.securityName, r.startTime, r.endTime,
      r.g1?.before, r.g1?.after, r.g1?.loadKw, r.g1?.fuelPct, r.g1?.runMin,
      r.g2?.before, r.g2?.after, r.g2?.loadKw, r.g2?.fuelPct, r.g2?.runMin,
      r.stockDrum, r.fuelConsumed, r.remarks,
    ];
    lines.push(vals.map(csvCell).join(','));
  }
  res.header('Content-Type', 'text/csv');
  res.header('Content-Disposition', 'attachment; filename="gensets.csv"');
  res.send(lines.join('\n'));
  } catch (e) {
    if (!res.headersSent) fail(res, e, 'GET /api/export/gensets.csv');
  }
});

module.exports = router;
