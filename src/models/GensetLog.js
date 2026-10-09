const mongoose = require('mongoose');

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/;

const gensetSide = new mongoose.Schema(
  {
    before: { type: Number, min: 0, max: 1.5 },
    after: { type: Number, min: 0, max: 1.5 },
    loadKw: { type: Number, min: 0, max: 5 },
    fuelPct: { type: Number, min: 0, max: 1.5 },
    refillBefore: { type: Number, min: 0, max: 1.5 },
    refillAfter: { type: Number, min: 0, max: 1.5 },
    runMin: { type: Number, min: 0, max: 1440 },
  },
  { _id: false }
);

const gensetSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    dieselPurchase: { type: Number, default: 0, min: 0 },
    securityName: { type: String, required: true, trim: true, maxlength: 80 },
    startTime: { type: String, required: true, match: HHMM },
    endTime: { type: String, required: true, match: HHMM },
    g1: { type: gensetSide, default: {} },
    g2: { type: gensetSide, default: {} },
    stockDrum: { type: Number, min: 0 },
    fuelConsumed: { type: Number, min: 0 },
    remarks: { type: String, trim: true, maxlength: 500, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

gensetSchema.index({ date: 1, startTime: 1 });

gensetSchema.pre('validate', function (next) {
  if (this.date) {
    const d = new Date(this.date);
    d.setUTCHours(0, 0, 0, 0);
    this.date = d;
  }
  next();
});

module.exports = mongoose.model('GensetLog', gensetSchema);
