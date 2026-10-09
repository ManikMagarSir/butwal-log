const mongoose = require('mongoose');

const TIME_SLOTS = ['06:00', '14:00', '22:00'];

const rackSchema = new mongoose.Schema(
  {
    no: { type: Number, required: true, min: 1, max: 22 },
    a: { type: Number, min: 0, max: 400 },
    b: { type: Number, min: 0, max: 400 },
  },
  { _id: false }
);

const pacSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, enum: ['A', 'B', 'C', 'D'] },
    temp: { type: Number, min: -50, max: 100 },
    humidity: { type: Number, min: 0, max: 100 },
  },
  { _id: false }
);

const llSchema = new mongoose.Schema(
  {
    ab: { type: Number, min: 0, max: 600 },
    bc: { type: Number, min: 0, max: 600 },
    ca: { type: Number, min: 0, max: 600 },
  },
  { _id: false }
);

const dcLogSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    time: { type: String, required: true, enum: TIME_SLOTS },
    upsStatus: { type: Number, min: 0, max: 100 },
    upsLoadA: { type: Number, min: 0 },
    upsLoadB: { type: Number, min: 0 },
    upsLoadC: { type: Number, min: 0 },
    racks: { type: [rackSchema], default: [] },
    pac: { type: [pacSchema], default: [] },
    mainsA: { type: llSchema, default: {} },
    mainsB: { type: llSchema, default: {} },
    dutyPerson: { type: String, required: true, trim: true, maxlength: 80 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// One log per date+slot
dcLogSchema.index({ date: 1, time: 1 }, { unique: true });

// Normalize date to midnight UTC for consistent uniqueness
dcLogSchema.pre('validate', function (next) {
  if (this.date) {
    const d = new Date(this.date);
    d.setUTCHours(0, 0, 0, 0);
    this.date = d;
  }
  next();
});

module.exports = mongoose.model('DcLog', dcLogSchema);
module.exports.TIME_SLOTS = TIME_SLOTS;
