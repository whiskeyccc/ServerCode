import http from 'http'
import path from 'path'
import fs = require('fs');
import https = require('https');
import { config } from './config.js'
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = fileURLToPath(new URL('.', import.meta.url))
import { dateformat_ymd, timeformat_hms, LogToFile } from "./util.js"
/**
* HTTP Post請求
@param API 路径
* @param callback 接受信息的回調
* @param msg 主體
*/
interface HTTPCALLback {
    (code: number, Binary): void
}
export function httpConnectOnce(API:string, callback:HTTPCALLback, msg:string = '') {
    const buffer = Buffer.from(msg, "utf-8")
    const post_options = {
        host: config.HTTP.Host,
        port: config.HTTP.Port,
        path: API,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Length': buffer.length
        }
    }
    const post_request = http.request(post_options, (response) => {
        let data = ''
        response.on('data', (chunk) => {
            data += chunk
        })
        response.on('end', () => {
            if (config.Log.Http.Receive) {
                const file = path.join(__dirname, `log/http/receive/${dateformat_ymd(new Date())}.log`)
                LogToFile(file, `${timeformat_hms(new Date())} ${post_options.path} [${data}]\n`)
            }
            callback(0, data);
        })
    })
    post_request.on("error", (error) => {
        console.log("请求发生错误")
        console.log("error||" + error)
        if (config.Log.Http.Send) {
            const file = path.join(__dirname, `log/http/send/${dateformat_ymd(new Date())}.log`)
            LogToFile(file, `${timeformat_hms(new Date())} ${post_options.path} [${error.message}]\n`)
        }
        callback(-1, error.message);
    })
    post_request.write(buffer)
    post_request.end()
    if (config.Log.Http.Send) {
        const file = path.join(__dirname, `log/http/send/${dateformat_ymd(new Date())}.log`)
        LogToFile(file, `${timeformat_hms(new Date())} ${post_options.path} [${msg}]\n`)
    }
}
export function DownLoadFile(url: string, localPath: string,callback:HTTPCALLback) {
    //const fileUrl = 'https://example.com/path/to/your/zip/file.zip';
    // 本地保存文件的路径
    // const localFilePath = './downloaded_file.zip';
    const directoryPath = path.dirname(localPath);  

    if (fs.existsSync(directoryPath)) {
    } else {
        fs.mkdirSync(directoryPath, { recursive: true })
    }
    // 选择使用 http 或 https 模块
    const httpClient = url.startsWith('https') ? https : http;

    // 发起 HTTP 请求并保存文件
    const file = fs.createWriteStream(localPath);
    const request = httpClient.get(url, function (response) {
        response.pipe(file);
    });

    // 监听文件下载完成事件
    file.on('finish', function () {
        console.log('File downloaded successfully.');
        file.close();
        callback(0,localPath);
    });

    // 监听请求错误事件
    request.on('error', function (err) {
        fs.unlink(localPath, () => { }); // 删除已下载的文件
        callback(-1, err.message);
        //console.error('Error downloading file:', err);
    });
}