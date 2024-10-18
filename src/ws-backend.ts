import { fileURLToPath } from 'url'
const __dirname = fileURLToPath(new URL('.', import.meta.url))

import path from 'path'
import WebSocket, { WebSocketServer } from 'ws'
import { dateformat_ymd, timeformat_hms, LogToFile } from "./util.js"
import { config } from './config.js'

interface WSBackendCallback {
    (device: string, json): void
}

interface WSBackendCallback {
    (device: string, json): void
}
const ws_backend = new Map<string, WebSocketServer>()

function _startWSBackend(device: string, callback: WSBackendCallback): WebSocketServer {
    const tag = config["WS-Backend"][device].Tag

    const wss = new WebSocketServer({
        port: config["WS-Backend"][device].Port,
        perMessageDeflate: {
            zlibDeflateOptions: {
                // See zlib defaults.
                chunkSize: 1024,
                memLevel: 7,
                level: 3
            },
            zlibInflateOptions: {
                chunkSize: 10 * 1024
            },
            // Other options settable:
            clientNoContextTakeover: true, // Defaults to negotiated value.
            serverNoContextTakeover: true, // Defaults to negotiated value.
            serverMaxWindowBits: 10, // Defaults to negotiated value.
            // Below options specified as default values.
            concurrencyLimit: 10, // Limits zlib concurrency for perf.
            threshold: 1024 // Size (in bytes) below which messages
            // should not be compressed if context takeover is disabled.
        }
    })

    wss.on('connection', function connection(ws) {
        ws.on('error', console.error)
        ws.on('message', function message(_buffer) {
            const buffer = _buffer.toString()
            if (config.Log["WS-Backend"].Receive) {
                const timestamp = new Date()
                const file = path.join(__dirname, `log/ws-backend/${tag}/receive/${dateformat_ymd(timestamp)}.log`)
                LogToFile(file, `${timeformat_hms(timestamp)} ${buffer}\n`)
            }
            callback(device, JSON.parse(buffer))
        })
    })

    wss.on("listening", function () {
        console.log(`[WS-Backend][${tag}] is listening on port ${config["WS-Backend"][device].Port}.`)
    })

    return wss
}

function backend_callback(device: string, json) {
    const tag = config["WS-Backend"][device].Tag
    const _json = JSON.stringify(json)
    const wss = ws_backend.get(device)!
    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(_json)
        }
    })
    if (config.Log["WS-Backend"].Send) {
        const timestamp = new Date()
        const file = path.join(__dirname, `log/ws-backend/${tag}/send/${dateformat_ymd(timestamp)}.log`)
        LogToFile(file, `${timeformat_hms(timestamp)} ${_json}\n`)
    }
}

export function startWSBackend(callback: WSBackendCallback) {
    for (const device in config.Device) {
        ws_backend.set(device, _startWSBackend(device, callback))
    }
    return backend_callback
}