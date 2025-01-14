import { fileURLToPath } from 'url';
const __dirname = fileURLToPath(new URL('.', import.meta.url));
import path from 'path';
import WebSocket from 'ws';
import { dateformat_ymd, timeformat_hms, LogToFile } from "./util.js";
import { config } from './config.js';
const ws_backend = new Map();
let lastTimestamp = Date.now();
function _startWSClient(device, callback) {
    const tag = config["WS-Client"][device].Tag;
    const adress = config["WS-Client"][device].IpAddress;
    let wsSocket = new WebSocket(adress);
    wsSocket.on('error', (error) => {
        console.log(error);
        wsSocket?.close();
    });
    wsSocket.on('open', function open() {
        console.log(`[WS-Client][${tag}] is open on adress ${adress}.`);
        lastTimestamp = Date.now();
    });
    wsSocket.on('close', function close() {
        console.log(`[WS-Client][${tag}] is close on adress ${adress}.`);
        wsSocket = null;
    });
    wsSocket.on('message', function message(data) {
        if (config.Log["WS-Client"].Receive) {
            const timestamp = new Date();
            const file = path.join(__dirname, `log/ws-client/${tag}/receive/${dateformat_ymd(timestamp)}.log`);
            LogToFile(file, `${timeformat_hms(timestamp)} ${data}\n`);
            lastTimestamp = Date.now();
        }
        callback(device, data.toString());
    });
    return wsSocket;
}
const overConnectTime = 1 * 20 * 1000;
function HeartCheck(callback) {
    for (const device in config.Device) {
        const ws = ws_backend.get(device);
        const gap = Date.now() - lastTimestamp;
        if (gap > overConnectTime) {
            if (ws) {
                const tag = config["WS-Client"][device].Tag;
                const adress = config["WS-Client"][device].IpAddress;
                console.log(`[WS-Client][${tag}] adress ${adress} is Shutdown.`);
                ws.close();
            }
            ws_backend.set(device, _startWSClient(device, callback));
            lastTimestamp = Date.now();
        }
    }
}
function backend_callback(device, json) {
    const tag = config["WS-Client"][device].Tag;
    const _json = JSON.stringify(json);
    const wss = ws_backend.get(device);
    if (wss.readyState === WebSocket.OPEN) {
        wss.send(_json);
    }
    if (config.Log["WS-Client"].Send) {
        const timestamp = new Date();
        const file = path.join(__dirname, `log/ws-client/${tag}/send/${dateformat_ymd(timestamp)}.log`);
        LogToFile(file, `${timeformat_hms(timestamp)} ${_json}\n`);
    }
}
export function startWSClient(callback) {
    for (const device in config.Device) {
        ws_backend.set(device, _startWSClient(device, callback));
    }
    setInterval(() => HeartCheck(callback), 1000);
    return backend_callback;
}
