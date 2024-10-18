import { createRequire } from "module"
const require = createRequire(import.meta.url)
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = fileURLToPath(new URL('.', import.meta.url))

import path from 'path'
import net from 'net'
import { dateformat_ymd, timeformat_hms, LogToFile } from "./util.js"
import { config } from './config.js'

const tcp_client = new Map<string, net.Socket[]>()
const _buffer = Symbol('Buffer')

function _startBackend(device: string, callback: ClientCallback) {
    const tag = config.Backend[device].Tag
    const client: net.Socket[] = []

    const tcp_backend = new net.Server()

    tcp_backend.on('connection', function (socket) {
        console.log(`[Backend][${tag}] New connection has been established.`)
        client.push(socket)
        socket[_buffer] = ""
        callback(device, { Type: "Connection" }, socket)

        socket.on('data', function (data) {
            let buffer = data.toString()
            if (config.Log.Backend.Receive) {
                const timestamp = new Date()
                const file = path.join(__dirname, `log/backend/${tag}/receive/${dateformat_ymd(timestamp)}.log`)
                if (buffer.indexOf("\n") == -1) {
                    LogToFile(file, `${timeformat_hms(timestamp)} ${buffer}\n`)
                } else {
                    LogToFile(file, `${timeformat_hms(timestamp)} ${buffer}`)
                }
            }

            buffer = `${socket[_buffer]}${buffer}`
            const datas: string[] = []
            while (buffer.indexOf("\n") != -1) {
                datas.push(buffer.substring(0, buffer.indexOf("\n") + 1))
                buffer = buffer.substring(buffer.indexOf("\n") + 1)
            }
            socket[_buffer] = buffer

            datas.forEach(data => {
                const _data = data.trim()
                if (_data.length == 0) {
                } else {
                    //TCP包数据格式 {Type:string, Binary:object | array}
                    const json = {}
                    try {
                        Object.assign(json, JSON.parse(_data))
                    } catch (exception) {
                        console.error(`[Backend][${tag}] JSON格式错误.`)
                    }
                    if (Object.keys(json).length == 0) {
                    } else {
                        callback(device, json, socket)
                    }
                }
            })
        })

        socket.on('end', function () {
            console.log(`[Backend][${tag}] Ending connection with the client`)

            const index = client.findIndex((o) => {
                return (o.remoteAddress == socket.remoteAddress) && (o.remotePort == socket.remotePort)
            })
            if (index == -1) {
            } else {
                client.splice(index, 1)
            }
        })
        socket.on('close', function () {
            console.log(`[Backend][${tag}] Closing connection with the client`)

            const index = client.findIndex((o) => {
                return (o.remoteAddress == socket.remoteAddress) && (o.remotePort == socket.remotePort)
            })
            if (index == -1) {
            } else {
                client.splice(index, 1)
            }
        })

        // Don't forget to catch error, for your own sake.
        socket.on('error', function (error) {
            console.error(`[Backend][${tag}] Error: ${error.message}`)

            const index = client.findIndex((o) => {
                return (o.remoteAddress == socket.remoteAddress) && (o.remotePort == socket.remotePort)
            })
            if (index == -1) {
            } else {
                client.splice(index, 1)
            }
        })
    })

    tcp_backend.listen(config.Backend[device].Port, config.Backend[device].IpAddress, function () {
        console.log(`[Backend][${tag}] is listening on port ${config.Backend[device].Port}.`)
    })

    tcp_client.set(device, client)
}

interface ClientCallback {
    (device: string, json, socket: net.Socket): void
}

function backend_callback(device: string, json,  ignor: boolean = false,socket?: net.Socket) {
    const tag = config.Backend[device].Tag
    const _json = JSON.stringify(json)
    if (socket === undefined) {
        const client = tcp_client.get(device)!
        client.forEach(socket => {
            socket.write(_json + "\n")
        })
    } else {
        socket.write(_json + "\n")
    }
    if (!ignor && config.Log.Backend.Send) {
        const timestamp = new Date()
        const file = path.join(__dirname, `log/backend/${tag}/send/${dateformat_ymd(timestamp)}.log`)
        LogToFile(file, `${timeformat_hms(timestamp)} ${_json}\n`)
    }
}

export function startBackend(callback: ClientCallback) {
    for (const device in config.Device) {
        _startBackend(device, callback)
    }
    return backend_callback
}