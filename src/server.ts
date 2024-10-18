import { createRequire } from "module"
import { fileURLToPath } from 'url'
import path, { join } from 'path'
import fs from 'fs'
import { Socket } from 'net'
import { config } from "./config.js"
import { startMQTT } from "./mqtt-client.js"
import { startClient } from "./tcp-client.js"
import { startWSBackend } from "./ws-backend.js"
import { startBackend } from "./tcp-backend.js"
import { httpConnectOnce, DownLoadFile } from "./http-client.js"
import { dateformat_ymdhmsf, GetStream } from "./util.js"
import { Inspect, LogToFile, XYZtoOBJ } from "./util.js"
import { Wlog, CheckFolder, VERCODE } from "./WLog.js"
import { stringify } from "querystring"
import WebSocket from 'ws'
import { ShipEntity, AISDate } from "./ShipEntity.js"

const _VerCode = `========--------${VERCODE}-----------========`
Wlog.LogSuccessd(_VerCode);

const __filename = fileURLToPath(import.meta.url)
const __dirname = fileURLToPath(new URL('.', import.meta.url))
const require = createRequire(import.meta.url)
//#region  创建 log 目录
{
    const folders: string[] = [
        "mqtt",
        "client",
        "backend",
        "ws-backend",
        "rdbms",
        "http"
    ]

    const _folders: string[] = []
    for (const device in config.Device) {
        _folders.push(`log/mqtt/${config.Device[device]}/receive`)
        _folders.push(`log/mqtt/${config.Device[device]}/send`)
    }

    for (const device in config.Client) {
        _folders.push(`log/client/${config.Client[device].Tag}/receive`)
        _folders.push(`log/client/${config.Client[device].Tag}/send`)
    }

    for (const device in config.Backend) {
        _folders.push(`log/backend/${config.Backend[device].Tag}/receive`)
        _folders.push(`log/backend/${config.Backend[device].Tag}/send`)
        _folders.push(`log/rdbms/${config.Backend[device].Tag}/send`)
    }
    for (const device in config["WS-Backend"]) {
        _folders.push(`log/ws-backend/${config["WS-Backend"][device].Tag}/receive`)
        _folders.push(`log/ws-backend/${config["WS-Backend"][device].Tag}/send`)
    }
    for (const device in config["DownLoadPath"]) {
        _folders.push(config["DownLoadPath"][device])
        //_folders.push(`log/ws-backend/${config["WS-Backend"][device].Tag}/send`)
    }

    _folders.push(`log/http/receive`)
    _folders.push(`log/http/send`)
    _folders.forEach(folder => {
        const _folder = path.join(__dirname, folder)
        if (fs.existsSync(_folder)) {
        } else {
            fs.mkdirSync(_folder, { recursive: true })
        }
    })

}
//#endregion

function HTTPREQ(device: string, json: { Api: any; Msg: any }, socket: any) {
    console.log(json);
    const aip = json.Api;
    const mes = json.Msg;
    httpConnectOnce(aip, (code, data) => {
        const json = {
            Type: "HTTP", Api: aip, Binary: {
                Code: code,
                Data: data
            }
        };
        console.log(json);
        backend(device, json);
    }, mes)
}
function TCPREQ(device: string, json: { Code: any }, socket: any) {

}
function Connection(device: any, json: any, socket: any) {
    let infoArray: AISDate[] = [];
    ShipEntitys.forEach((item) => {
        const data = item.AisDatas[item.AisDatas.length-1];
        data.gap=0.1;
        infoArray.push(data);
    })
    const message = { Device: "D01", Type: "AIS", Array: infoArray };
    Wlog.LogTopic("Connection", JSON.stringify(message));
    backend("D01", message);
    //backend(device, _json)

}
function MQTTREQ(device: any, json: any, socket: any) {
    //unity 端发送Mqtt
    /*
        const _json = CodeJSon(json);
        const eq = String(json.Equip);
        const equip = Equips.get(eq)
        if (equip) {
            equip.Code = _json.Code
            equip.ship = json.ShipName
            equip.shipCode = json.ShipCode
        }
        if (json.Code == 810) {
            mqtt(device, config.MQTT.Topic[device].Publish.MergePile + "/" + eq, JSON.parse(json.data));
            return;
        } else if (json.Code == 820) {
            mqtt(device, config.MQTT.Topic[device].Publish.HatchReport + "/" + eq, JSON.parse(json.data));
            return;
        }
        console.log(_json);
        //console.log(path.join(config.MQTT.Topic[device].Publish.Command, eq));
        console.log(config.MQTT.Topic[device].Publish.Command + "/" + eq);
        mqtt(device, config.MQTT.Topic[device].Publish.Command + "/" + eq, _json);
        if (equip) {
            //换仓
            if (equip.Code == 900) {
                equip.Code = 200;
            }
            //取消作业
            if (equip.Code == 910) {
                equip.Code = 0;
            }
    
        }*/
}
const _backend_callback = { Connection, MQTTREQ, HTTPREQ, TCPREQ };
function backend_callback(device: string | number, json: { Type: string | number; Binary: any }, socket: any) {
    const tag = config.Backend[device].Tag;
    _backend_callback[json.Type](device, json.Binary, socket);
}
function tcp_callback(device: string, json) {


}
function ws_backend_callback(device: string, json: any) {
    const tag = config["WS-Backend"][device].Tag
    Inspect(json)
}
const backend = startBackend(backend_callback)
//const mqtt = startMQTT(mqtt_callback);
//const tcp = startClient(tcp_callback);
//const ws_backend = startWSBackend(ws_backend_callback)

//#region 调试
/*
if (config.Config == "Debug") {
    function DebugLogic() {
        const stdin = process.stdin
        stdin.setRawMode(true)
        stdin.resume()
        stdin.setEncoding('utf8')

        const keys: string[] = []
        const n = {
            1: 0,
            2: 0,
            3: 0,
        }
        const commands = {
            1: () => {
                const _json = { Type: "test" }
                for (const device in config.Backend) {
                    backend(device, _json)
                }
            },
            2: () => {
                //backend
                const json = JSON.parse(fs.readFileSync(path.join(__dirname, './Backend.json')).toString())
                const _json = json[n[2]++ % json.length]
                for (const device in config.Backend) {
                    //  ws_backend(device, _json)
                }
            },
            3: () => {
                DownLoadFile("http://www.duzixi.com/AIC/StreamingAssets/BenXi_20221108.zip",
                    config.DownLoadPath.CABINSCAN + "benxi.zip",
                    (code, data) => {
                        console.log("Code::" + code + " data::" + data);

                    }
                )
            },
            4: () => {

                //XYZtoOBJ(config.DownLoadPath.CABINSCAN+"test.xyz",0.5);

            }
        }

        stdin.on('data', (key: string) => {
            // ctrl-c ( end of t ext )
            if (key === '\u0003') {
                process.exit()
            }
            if (key === "\r") {
                const _key = keys.join('')
                console.log(_key)
                keys.splice(0, keys.length)
                if (_key in commands) {
                    commands[_key]()
                }
            } else {
                keys.push(key)
            }
        })
    }

    DebugLogic()
}*/
//#endregion

//#region Mqtt通讯(此项目无用)
/*
function mqtt_callback(device: string, topic: string, json, _equip: string) {
    const Subscribe = config.MQTT.Topic[device].Subscribe
    if (topic == "connected") {
        console.log("device:" + device + "|| equip:" + _equip + "||topic:" + topic + "\n" + JSON.stringify(json));
    } else {
        if (topic == Subscribe.baseState) {
            const equip = Equips.get(_equip);
            if (equip) {
                //Code 的状态逻辑
                if (json.Code) {
                    //if (equip.Code != json.Code)
                    equip.Code = json.Code;
                    const _json = CodeJSon(json);
                    mqtt(device, config.MQTT.Topic[device].Publish.Command + "/" + _equip, _json);
                    const __json = { Type: "Command", Binary: _json };
                    __json.Binary.equip = _equip;
                    console.log(__json)
                    backend(device, __json);

                }
                //大机的状态逻辑
                const _DC: number = json["v_ScanOut5"] / 1000;
                const _XC: number = json["v_ScanOut7"] / 1000;
                const _QS: number = json["v_ScanOut6"] / 1000;
                const _SJS: number = json["v_ScanOut4"] / 1000;
                const _ZDKD: number = json["v_ScanOut9"] / 100;
                const _Lock: boolean = json["9999"]
                const _timestamp: number = Date.now();

                if (_DC != equip.DC || _XC != equip.XC || _QS != equip.QS || _SJS != equip.SJS || _ZDKD != equip.ZDKD || _Lock != equip.Locked) {
                    let gap = 0;
                    if (equip.timestamp != 0) {

                        gap = _timestamp - equip.timestamp;
                    }
                    const plc = {
                        Type: "PLC", Binary: {
                            equip: _equip,
                            DC: _DC,
                            XC: _XC,
                            QS: _QS,
                            SJS: _SJS,
                            ZDKD: _ZDKD,
                            Locked: _Lock,
                            gap: gap
                        }
                    };
                    backend(device, plc);
                    //console.log("Send" + device + "|| " + plc);
                    equip.DC = _DC; equip.XC = _XC; equip.QS = _QS; equip.SJS = _SJS; equip.ZDKD = _ZDKD; equip.Locked = _Lock;
                }
                equip.timestamp = _timestamp;

            } else {
                console.log("没有找到" + _equip);
            }
        } else if (topic == Subscribe.heart) {
            const equip = Equips.get(_equip);
            if (equip) {
                const _json = { Type: "Heart", Binary: json };
                _json.Binary.equip = _equip;
                backend(device, _json);
            }
        }
        else if (topic == Subscribe.scan_real || topic == Subscribe.scan_report
            || topic == Subscribe.partScan_report || topic == Subscribe.shipposscan_report
            || topic == Subscribe.cabposscan_report || topic == Subscribe.cabinscan_report
            || topic == Subscribe.pilescan_report || topic == Subscribe.real_report || topic == Subscribe.realscan_report
            || topic == Subscribe.realimg_report
        ) {
            const equip = Equips.get(_equip);
            if (equip) {

                const _json = { Type: "Scan", Binary: json };
                _json.Binary.equip = _equip;
                _json.Binary.ShipName = equip.ship;
                _json.Binary.ShipCode = equip.shipCode;
                _json.Binary.topic = topic.split('/').pop();
                if (topic != Subscribe.realscan_report) {

                    console.log(_json);
                }
                backend(device, _json);

            } else {
                console.log("没有找到" + _equip);
            }
        } else if (topic == Subscribe.Command) {
            //PlC也能控制指令 所以以Mqtt为收到的为指令
            const equip = Equips.get(_equip);
            if (equip) {
                const _json = { Type: "Command", Binary: json };
                _json.Binary.equip = _equip;
                backend(device, _json);
            }
        }
    }
}
*/

//#endregion

const ShipEntitys = new Map<number, ShipEntity>();

const overConnectTime = 1 * 20 * 1000;
//let wsSocketTimer: NodeJS.Timeout;
let lastTimestamp: number = Date.now();
let wsSocket: WebSocket | null = null;
function ConnectedWS() {
    //const adress = 'ws://192.168.1.212:8080/websocket';
    const adress = config.WebScoket;
    wsSocket = new WebSocket(adress)
    // const ws = new WebSocket('ws://localhost:8089')
    wsSocket.on('error', (error) => {
        Wlog.LogError("WebSocket Err:" + error.message)
        wsSocket?.close();
    })

    wsSocket.on('open', function open() {
        Wlog.LogTopic("WebSocket", "连接" + adress);
        lastTimestamp = Date.now();
    })
    wsSocket.on('close', function close() {
        Wlog.LogTopic("WebSocket", "关闭" + adress)
        wsSocket = null;
        //wsSocketTimer = setTimeout(() => ConnectedWS(), 10 * 1000);
    })
    wsSocket.on('message', function message(data) {
        // Wlog.LogTopic("message", data.toString());
        //Wlog.LogTopic("websockt A", data.toString());
        const entity = JSON.parse(data.toString());
        let infoArray: AISDate[] = [];
        //const info:AISDate[];
        entity.AIS.forEach(item => {
          
            const info = JSON.parse(item.Info)
            const data = new AISDate(item.Time,info.timestamp);
            data.msg_type = info.msg_type;
            data.mmsi = info.mmsi;
            data.speed = info.speed;
            data.lon = info.lon;
            data.lat = info.lat;
            data.heading = info.heading;
            if (!ShipEntitys.has(info.mmsi)) {
                ShipEntitys.set(info.mmsi, new ShipEntity(info.mmsi));
            }
            const e = ShipEntitys.get(info.mmsi);
            if (e) {
                e.AddAISDate(data);
                data.gap = e.GetTimeSpan();
                infoArray.push(data);
            }
        });
        const message = { Device: "D01", Type: "AIS", Array: infoArray };
        Wlog.LogTopic("message", JSON.stringify(message));
        backend("D01", message);
        lastTimestamp = Date.now();

    })
}

ConnectedWS();
function HeartCheck() {
    const gap = Date.now() - lastTimestamp;
    if (gap > overConnectTime) {
        if (wsSocket) {
            Wlog.LogTopic("WebSocket", "手动关闭连接");
            wsSocket.close();
        }
        ConnectedWS();
        lastTimestamp = Date.now();
    }
}
setInterval(HeartCheck, 1000);
