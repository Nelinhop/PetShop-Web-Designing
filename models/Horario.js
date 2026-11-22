const mongoose = require('mongoose'); // Importa o módulo mongoose para interagir com o MongoDB

const HorarioSchema = new mongoose.Schema({
    diaSemana: { type: String, required: true }, 
    hora: { type: String, required: true },     
    capacidade: { type: Number, required: true, default: 0 }, 
    vagasDisponiveis: { type: Number, required: true, default: 0 } 
});

module.exports = mongoose.model('Horario', HorarioSchema); // Exporta o modelo Horario para ser usado em outras partes da aplicação
