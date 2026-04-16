const { WebSocketServer } = require('ws');

const wss = new WebSocketServer({ port: 3000 });
console.log('WebSocket server is running on ws://localhost:3000');

wss.on('connection', (ws) => {
    console.log('Client connected');

    ws.on('message', (data) => {
        const message = JSON.parse(data);
        console.log(`Received message: ${data.toString()}`);
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

