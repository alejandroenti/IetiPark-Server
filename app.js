const { WebSocketServer } = require('ws');
const winston = require('winston');
const path = require('path');
const dotenv = require('dotenv');
const express = require('express');

const Game = require('./src/game');
const GameService = require('./src/services/gameService');
const SocketHandler = require('./src/network/socketHandler');
const MongoService = require('./src/services/mongoService');

const envMode = process.env.NODE_ENV || 'dev';
dotenv.config({ path: path.resolve(process.cwd(), `.env.${envMode}`) });

const publicDir = path.resolve(__dirname, 'public');

const logger = winston.createLogger({
    level: 'debug',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`)
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: './logs/server.log' })
    ],
});

// Inicialitzar servidor Express
const app = express();
app.use(express.static(publicDir, {
  maxAge: 0,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}));
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

app.get('/favicon.ico', (req, res) => res.status(204).end());

app.get('/download', (req, res) => {
  const downloadUrl = `${req.protocol}://pico1.ieti.site/ietipark.apk`;
  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html lang="ca">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Descarrega IetiPark</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0f172a;
      font-family: 'Segoe UI', system-ui, sans-serif;
      color: #f1f5f9;
    }
    .card {
      background: #1e293b;
      border-radius: 1.5rem;
      padding: 2.5rem 3rem;
      text-align: center;
      box-shadow: 0 25px 50px rgba(0,0,0,0.5);
      max-width: 360px;
      width: 90%;
    }
    h1 { font-size: 1.6rem; margin-bottom: 0.4rem; }
    p { color: #94a3b8; font-size: 0.9rem; margin-bottom: 1.8rem; }
    #qrcode {
      display: flex;
      justify-content: center;
      margin-bottom: 1.5rem;
    }
    #qrcode canvas, #qrcode img {
      border-radius: 0.75rem;
      border: 6px solid #fff;
    }
    a.btn {
      display: inline-block;
      background: #6366f1;
      color: #fff;
      text-decoration: none;
      padding: 0.7rem 1.8rem;
      border-radius: 0.75rem;
      font-weight: 600;
      font-size: 0.95rem;
      transition: background 0.2s;
    }
    a.btn:hover { background: #4f46e5; }
  </style>
</head>
<body>
  <div class="card">
    <h1>IetiPark</h1>
    <p>Escaneja el codi QR per descarregar l'aplicació</p>
    <div id="qrcode"></div>
    <a class="btn" href="${downloadUrl}" download>Descarrega l'APK</a>
  </div>
  <script>
    new QRCode(document.getElementById('qrcode'), {
      text: '${downloadUrl}',
      width: 220,
      height: 220,
      colorDark: '#0f172a',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H
    });
  </script>
</body>
</html>`);
});

// Inicialitzar servidor HTTP
const httpServer = app.listen(process.env.SERVER_PORT, () => {
    logger.info(`HTTP server is running on http://localhost:${process.env.SERVER_PORT}`);
});

const game = new Game();
const wss = new WebSocketServer({ server: httpServer , perMessageDeflate: true });

const socketHandler = new SocketHandler({ wss, logger, gameService: null });
const gameService = new GameService({
    game,
    logger,
    sendMessage: socketHandler.sendMessage.bind(socketHandler),
    broadcast: socketHandler.broadcast.bind(socketHandler)
});
socketHandler.gameService = gameService;
socketHandler.initialize();

logger.info(`WebSocket server is running on ws://localhost:${process.env.SERVER_PORT}`);

async function initializeMongo() {
    const mongo = new MongoService({ dbName: 'IetiPark' });
    await mongo.connect()
    logger.info('Connected to MongoDB');
    await mongo.createCollection('levels');
    await mongo.createCollection('players');
    await mongo.createCollection('games');
    await mongo.createCollection('timeRecords');
    logger.info('Collections created');
    await mongo.dispose();
    logger.info('MongoDB connection closed');
}
initializeMongo();

setInterval(() => {
    game.update();
    socketHandler.broadcast('GAME STATE', getGameState());
    if (game.levelJustChanged) {
        socketHandler.broadcast('LEVEL CHANGED', game.currentLevel.getName());
        game.levelJustChanged = false;
    }
}, 1000 / 30);

function getGameState() {
    const payload = {
        players: game.getPlayersGameStates(),
        currentLevel: game.currentLevel.getCurrentLevelState()
    };
    return payload;
}