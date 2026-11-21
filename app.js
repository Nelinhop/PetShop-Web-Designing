const express = require('express');
const { engine } = require('express-handlebars');
const mongoose = require('mongoose');
const path = require('path');

const Cliente = require('./models/Cliente'); 
const Horario = require('./models/Horario'); 
const Agendamento = require('./models/Agendamento');

const app = express();
// define o motor de visualização Handlebars e hbs como extensão de arquivo
app.engine('hbs', engine({ extname: '.hbs' }));
app.set('view engine', 'hbs');
app.set('views', './views'); // define o diretório de visualizações

app.use(express.urlencoded({ extended: true })); 
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // define o diretório 

mongoose.connect('mongodb://127.0.0.1:27017/petshopDB') // Conecta ao banco de dados MongoDB na porta padrão 27017 
    .then(() => console.log('Conectado ao MongoDB!'))
    .catch((err) => console.error('Erro no MongoDB:', err));

// ANO - MES - DIA para Dia da semana escrito
function getDiaSemanaTexto(dataString) {
    const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    // Ajuste do fuso horário para evitar divergência de dia na conversão UTC
    const [ano, mes, dia] = dataString.split('-');
    const data = new Date(ano, mes - 1, dia);
    return dias[data.getDay()];
}

// 1. Rota Principal 
app.get('/', (req, res) => {
    res.render('cliente');
});

// 2. Rota de consulta dinâmica de horários para a data selecionada
app.get('/horarios-disponiveis', async (req, res) => {
    const { data } = req.query;
    if (!data) return res.json([]);

    const diaSemana = getDiaSemanaTexto(data);

    // Busca a configuração do dia da semana cadastrado no banco (capacidade > 0)
    const configs = await Horario.find({ diaSemana, capacidade: { $gt: 0 } }).lean();

    // verifica agendamentos para esta data específica para cada horario
    const horariosComVagas = [];
    for (const conf of configs) {
        const agendadosCount = await Agendamento.countDocuments({ data, horario: conf.hora });
        const vagasRestantes = conf.capacidade - agendadosCount;

        //  evita horários com capacidade = 0 ou lotados
        if (vagasRestantes > 0) {
            horariosComVagas.push({
                hora: conf.hora,
                vagasRestantes
            });
        }
    }

    res.json(horariosComVagas);
});

// 3. Rota para Agendar
app.post('/agendar', async (req, res) => {
    const { nome, cpf, data, horario } = req.body;

    try { // Verifica se o horário está configurado para o dia da semana selecionado
        const diaSemana = getDiaSemanaTexto(data);
        const configSlot = await Horario.findOne({ diaSemana, hora: horario });

        if (!configSlot) {
            return res.send('<h1>Erro: Horário não configurado para este dia!</h1><a href="/">Voltar</a>');
        }

        // Re-verifica no banco evitando overbooking
        const agendadosCount = await Agendamento.countDocuments({ data, horario });
        if (agendadosCount >= configSlot.capacidade) {
            return res.send('<h1>Erro: Este horário acabou de esgotar! Tente outro.</h1><a href="/">Voltar</a>');
        }
        // Verifica se o cliente já existe, caso contrário cria um novo usando o CPF como chave única
        let cliente = await Cliente.findOne({ cpf });
        if (!cliente) {
            cliente = await Cliente.create({ nome, cpf });
        }
        // Cria o agendamento
        await Agendamento.create({
            cliente: cliente._id,
            data,
            horario
        });

        res.send('<h1>Agendamento realizado com sucesso!</h1><a href="/">Voltar</a>');
    } catch (err) {
        console.error(err);
        res.status(500).send('Erro ao processar agendamento.');
    }
});

// 4. Rota /listaPetAgenda
app.get('/listaPetAgenda', async (req, res) => {
    const agendamentos = await Agendamento.find().populate('cliente').lean();
    res.render('listaPetAgenda', { agendamentos });
});

// 5. Rotas /ajustaPetAgenda
app.get('/ajustaPetAgenda', (req, res) => {
    res.render('ajustaPetAgenda');
});

app.post('/ajustaPetAgenda', async (req, res) => {
    const { diaSemana, hora, capacidade } = req.body; 
    const cap = parseInt(capacidade);

    try { // Atualiza ou cria horário para o dia da semana
        await Horario.findOneAndUpdate(
            { diaSemana, hora },
            { capacidade: cap },
            { upsert: true, new: true }
        );

        res.redirect('/ajustaPetAgenda');
    } catch (err) {
        console.error(err);
        res.status(500).send('Erro ao salvar configuração.');
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});