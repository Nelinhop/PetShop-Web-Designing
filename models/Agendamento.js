const mongoose = require('mongoose');

const AgendamentoSchema = new mongoose.Schema({
    cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', required: true },
    data: { type: String, required: true }, 
    horario: { type: String, required: true } 
});

module.exports = mongoose.model('Agendamento', AgendamentoSchema);
