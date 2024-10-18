import { createRequire } from "module"
const require = createRequire(import.meta.url)
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = fileURLToPath(new URL('.', import.meta.url))

import path from 'path'
import net from 'net'
import { dateformat_ymd, timeformat_hms, LogToFile } from "./util.js"
import { config } from './config.js'
import { Wlog } from "./WLog.js"

const tcp_client = new Map<string, net.Socket>()
const _buffer = Symbol('Buffer')

function _startClient(device: string, callback: ClientCallback) {
    const tag = config.Client[device].Tag
    const client = new net.Socket()
    client.connect(config.Client[device].Port, config.Client[device].IpAddress)

    client.on('connect', function () {
        console.log(`[Client][${tag}] Connected to server on port ${config.Client[device].Port}`)
        client[_buffer] = ""
    })

    client.on('data', function (data) {
        let buffer = data.toString()
        if (config.Log.Client.Receive) {
            const timestamp = new Date()
            const file = path.join(__dirname, `log/client/${tag}/receive/${dateformat_ymd(timestamp)}.log`)
            if (buffer.indexOf("\n") == -1) {
                LogToFile(file, `${timeformat_hms(timestamp)} ${buffer}\n`)
            } else {
                LogToFile(file, `${timeformat_hms(timestamp)} ${buffer}`)
            }
        }

        buffer = `${client[_buffer]}${buffer}`
        const datas: string[] = []
        while (buffer.indexOf("\n") != -1) {
            datas.push(buffer.substring(0, buffer.indexOf("\n") + 1))
            buffer = buffer.substring(buffer.indexOf("\n") + 1)
        }
        client[_buffer] = buffer

        datas.forEach(data => {
            const _data = data.trim()
            if (_data.length == 0) {
            } else {
                //TCP包数据格式 {Type:string, Binary:object | array}
                const json = {}
                try {
                    Object.assign(json, JSON.parse(_data))
                } catch (exception) {
                    console.error(`[Client][${tag}] JSON格式错误.`)
                }
                if (Object.keys(json).length == 0) {
                } else {
                    callback(device, json)
                }
            }
        })
    })

    client.on('close', function () {
        console.log(`[Client][${tag}] Connection Closed`)
        setTimeout(() => _startClient(device, callback), 10 * 1000)
    })

    client.on('error', function (error) {
        console.error(`[Client][${tag}] Connection Error: ${error.message}`)
        client.destroy()
        //自动重连,默认10秒
        tcp_client.delete(device)
    })

    tcp_client.set(device, client)
}

interface ClientCallback {
    (device: string, json): void
}

function client_callback(device: string, json) {
    const tag = config.Client[device].Tag
    const _json = JSON.stringify(json)
    const client = tcp_client.get(device)!
    if (client === undefined) {
        Wlog.LogError(`tcp-client ${device} 未连接`)
       
    }else{
        client.write(_json + "\n")
        if (config.Log.Client.Send) {
            const timestamp = new Date()
            const file = path.join(__dirname, `log/client/${tag}/send/${dateformat_ymd(timestamp)}.log`)
            LogToFile(file, `${timeformat_hms(timestamp)} ${_json}\n`)
        }

    }

}

export function startClient(callback: ClientCallback) {
    for (const device in config.Device) {
        _startClient(device, callback)
    }
    return client_callback
}