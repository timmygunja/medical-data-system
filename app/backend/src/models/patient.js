const mongoose = require("mongoose");

const patientSchema = new mongoose.Schema({
  patientId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  dateOfBirth: { type: Date, required: true },
  medicalHistory: [
    {
      diagnosis: String,
      date: Date,
      treatment: String,
      doctor: String,
      notes: String,
      encryptedData: String, // Для хранения важной зашифрованной информации
    },
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Patient", patientSchema);
