import { createRequire } from "module"
const require = createRequire(import.meta.url)
import { fileURLToPath } from 'url'
import path from 'path'
const __filename = fileURLToPath(import.meta.url)
const __dirname = fileURLToPath(new URL('.', import.meta.url))

import mysql from 'mysql2'

const _config = require('./Config.json')
_config.Device = _config.Device[_config.Config]
_config.Client = _config.Client[_config.Config]
_config.Backend = _config.Backend[_config.Config]
_config["WS-Backend"] = _config["WS-Backend"][_config.Config]
_config.MQTT = _config.MQTT[_config.Config]
_config.HTTP = _config.HTTP[_config.Config]

//_config.DownLoadPath.CABINSCAN= path.join(__dirname, _config.DownLoadPath.CABINSCAN)
//_config.DownLoadPath.PILESCAN= path.join(__dirname, _config.DownLoadPath.PILESCAN)
//_config.DownLoadPath.MERGE= path.join(__dirname, _config.DownLoadPath.MERGE)
//_config.WLogPath= path.join(__dirname, _config.WLogPath)
//_config.ExePath= path.join(__dirname, _config.ExePath)

if ('RDBMS' in _config) {
    _config.RDBMS = _config.RDBMS[_config.Config]
}

const _device = "D01"
// Device 不存在的情况，自动使用 D01 数据展开
const Topic = { ..._config.MQTT.Topic[_device] }
/*
for (const device in _config.Device) {
    if (device in _config.MQTT.Topic) {
        _config.MQTT.Topic[device].Publish = _config.MQTT.Topic[device].Publish.map(topic => topic.replace("$Device", _config.Device[device]))
        _config.MQTT.Topic[device].Subscribe = _config.MQTT.Topic[device].Subscribe.map(topic => topic.replace("$Device", _config.Device[device]))
    } else {
        _config.MQTT.Topic[device] = {
            Publish: Topic.Publish.map(topic => topic.replace("$Device", _config.Device[device])),
            Subscribe: Topic.Subscribe.map(topic => topic.replace("$Device", _config.Device[device]))
        }
    }
}*/

export const config = _config

let _connection
if ('RDBMS' in _config) {
    //MySQL Connection Pool
    _connection = mysql.createPool({
        host: config.RDBMS.Host,
        port: config.RDBMS.Port,
        user: config.RDBMS.User,
        password: config.RDBMS.Password,
        database: config.RDBMS.Database,
        waitForConnections: true,
        connectionLimit: 16,
        queueLimit: 0
    }).promise()
}

export const connection = _connection