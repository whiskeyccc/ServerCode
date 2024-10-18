import { createRequire } from "module"
const require = createRequire(import.meta.url)
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = fileURLToPath(new URL('.', import.meta.url))

import mqtt from 'mqtt'
import path from 'path'
import { config } from "./config.js"

import { LogToFile, dateformat_ymd, timeformat_hms } from './util.js'

interface MQTTSubscribeCallback {
    (device: string, topic: string, json,equip:string): void
}

interface MQTTPublishCallback {
    (device: string, topic: string, json): void
}

export function startMQTT(callback: MQTTSubscribeCallback): MQTTPublishCallback {
    const mqtt_option: { username?: string, password?: string } = {}
    if (config.MQTT.Username == "") {
    } else {
        mqtt_option.username = config.MQTT.Username
    }
    if (config.MQTT.Password == "") {
    } else {
        mqtt_option.password = config.MQTT.Password
    }
    const mqtt_client = mqtt.connect(`mqtt://${config.MQTT.Address}`, mqtt_option)
    mqtt_client.once('connect', function () {
        console.log(`[${config.MQTT.Address}] mqtt connect`)

        for (const device in config.Device) {
            if (config.MQTT.Topic.hasOwnProperty(device)) {

                const Subscribes = config.MQTT.Topic[device].Subscribe
                for (const key in Subscribes) {
                    if (Subscribes.hasOwnProperty(key)) {

                        for (let i=0 ;i< config.Equip.length;i++) {
                            const topic =Subscribes[key] +'/'+config.Equip[i]; 
                            mqtt_client.subscribe(topic, function (error) {
                                if (error) console.log(error)
                            })
                            console.log(`mqtt Subscribe->${device}:[${topic}] `)
                        }
                     
                    }
                }
                callback(device, "connected", {},"")
            } else {

            }
        }
        mqtt_client.on('message', async function (topic, message) {
            const buffer = message.toString()
            const parts = topic.split(/\/([^/]+)$/);
            const _topic=parts[0];
            const _equip=parts[1];
           // console.log(parts); // ["asd/ads/aaa/zsda", "D01"

            let device = ""
            for (const _device in config.Device) {
                const Subscribes2 = config.MQTT.Topic[_device].Subscribe
                for (const key in Subscribes2) {
                    if (Subscribes2[key]==_topic){
                        device = _device
                    } 
                }
            }
             //日志
            if (config.Log.MQTT.Receive) {
                if (device == "") {
                } else {
                    const timestamp = new Date()
                    const file = path.join(__dirname, `log/mqtt/${config.Device[device]}/receive/${dateformat_ymd(timestamp)}.log`)
                    LogToFile(file, `${timeformat_hms(timestamp)} ${topic} ${buffer}\n`)
                }
            }
            // message is Buffer
            const json = {}
            try {
                Object.assign(json, JSON.parse(buffer))
            } catch (exception) {
                console.error(`[${topic}] JSON格式错误.`)
            }
            if (Object.keys(json).length == 0) {
            } else {
                callback(device, _topic, json,_equip)
            }

        })
    })

    function mqtt_callback(device: string, topic: string, json) {
        if (mqtt_client.connected) {
            const _json = JSON.stringify(json)
            mqtt_client.publish(topic, _json)
            //日志
            if (config.Log.MQTT.Send) {
                const timestamp = new Date()
                const file = path.join(__dirname, `log/mqtt/${config.Device[device]}/send/${dateformat_ymd(timestamp)}.log`)
                LogToFile(file, `${timeformat_hms(timestamp)} ${topic} ${_json}\n`)
            }
        }
    }
    return mqtt_callback
}