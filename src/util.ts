import fs from 'fs'
import util from 'util'
import readline from 'readline'
import path from 'path'
import { spawn } from 'child_process'
import archiver from 'archiver'
import { Wlog } from './WLog.js'

function pad2(n) {  // always returns a string
    return `${n}`.padStart(2, '0')
}

function pad3(n) {  // always returns a string
    return `${n}`.padStart(3, '0')
}

export function dateformat_ymdhms(_date: Date) {
    return `${_date.getFullYear()}-${pad2(_date.getMonth() + 1)}-${pad2(_date.getDate())} ${pad2(_date.getHours())}:${pad2(_date.getMinutes())}:${pad2(_date.getSeconds())}`
}

export function dateformat_ymd(_date: Date) {
    return `${_date.getFullYear()}-${pad2(_date.getMonth() + 1)}-${pad2(_date.getDate())}`
}

export function timeformat_hms(_date: Date) {
    return `${pad2(_date.getHours())}:${pad2(_date.getMinutes())}:${pad2(_date.getSeconds())}`
}

export function timestamp_ymdhms(_date: Date) {
    return `${_date.getFullYear()}${pad2(_date.getMonth() + 1)}${pad2(_date.getDate())}${pad2(_date.getHours())}${pad2(_date.getMinutes())}${pad2(_date.getSeconds())}`
}

export function dateformat_ymdhmsf(_date: Date) {
    return `${_date.getFullYear()}-${pad2(_date.getMonth() + 1)}-${pad2(_date.getDate())} ${pad2(_date.getHours())}:${pad2(_date.getMinutes())}:${pad2(_date.getSeconds())}.${pad3(_date.getMilliseconds())}`
}
export function CreatPileID(_date: Date) {
    return `${pad2(_date.getMonth() + 1)}_${pad2(_date.getDate())}_${pad2(_date.getHours())}_${pad2(_date.getMinutes())}_${pad2(_date.getSeconds())}_${pad3(_date.getMilliseconds())}`
}


export function LogToFile(file: string, text: string) {
    const info = `${dateformat_ymdhmsf(new Date())}-${text}\n`;
    if (fs.existsSync(file)) {
        //追加
        fs.appendFile(file, info, function (error) {
            if (error) console.error(`${file}: ${error.code}`)
        })
    } else {
        //新增
        fs.writeFile(file, info, function (error) {
            if (error) console.error(`${file}: ${error.code}`)
        })
    }
}
/**
 * 更换地址扩展名字
 * @param filePath  路径完整地址
 * @param extname 更换的扩展名
 * @returns  更换后的路径
 */
export function ChangeExtension(filePath: string, extname: string) {
    const directory = path.dirname(filePath); // 获取文件所在的目录  
    const baseName = path.basename(filePath, path.extname(filePath)); // 获取文件名（不包含原扩展名）  
    const newFilePath = path.join(directory, `${baseName}.${extname}`);
    return newFilePath;
}
export function Inspect(json) {
    console.log(util.inspect(json, { showHidden: false, depth: null, colors: true }))
}

export function GetValue(from, selector) {
    return selector
        .replace(/\[([^\[\]]*)\]/g, '.$1.')
        .split('.')
        .filter(t => t !== '')
        .reduce((previous, current) => previous && previous[current], from)
}
interface ReadCallback {
    (code: number, Binary: Buffer): void
}
/**
 * 流读取文件
 * @param path 文件路径
 * @param callback 回调 code ：0成功&-1失败 Binary 字节流
 */
export function GetStream(path: string, callback: ReadCallback) {
    if (fs.existsSync(path)) {

        // 创建可读流
        const readStream = fs.createReadStream(path);
        //  let info = '';
        let buffer: Buffer[] = [];
        // 监听 'data' 事件，当有数据可读时触发
        readStream.on('data', (chunk: Buffer) => {
            console.log('Received a chunk of data:');
            // info+=chunk;
            buffer.push(chunk);
        });

        // 监听 'end' 事件，当文件读取结束时触发
        readStream.on('end', () => {
            console.log('File reading is complete.');
            callback(0, Buffer.concat(buffer));
        });

        // 监听 'error' 事件，当发生错误时触发
        readStream.on('error', (err) => {
            console.error('Error reading file:', err);
            callback(-1, Buffer.concat(buffer));
        });
    }

}

/**
 * 点云转化obj
 * @param path 本地路径
 * @param unit 点云单位
 * @param callback 回调 buffer
 */
export function XYZtoOBJ(path: string, unit: number, callback: ReadCallback) {
    Wlog.LogStamp("[XYZtoOBJ]-开始转换为Obj");
    if (fs.existsSync(path)) {

        let record = {
            minX: Number.MAX_VALUE, maxX: Number.MIN_VALUE,
            minY: Number.MAX_VALUE, maxY: Number.MIN_VALUE,
            minZ: Number.MAX_VALUE, maxZ: Number.MIN_VALUE
        }
        const newFilePath = ChangeExtension(path, 'obj');
        //创建可写流
        let stringBuid: string[] = [];
        const write = fs.createWriteStream(newFilePath);
        // 创建可读流
        const readL = readline.createInterface({
            input: fs.createReadStream(path),
            output: process.stdout,
            terminal: false
        });
        // STEP 1: 头部
        stringBuid.push("o Pile\n");
        // STEP 2: 点坐标
        let postions: string[] = [];
        // STEP 2.5: UV
        let uvs: string[] = [];
        readL.on('line', (text) => {
            if (text.trim() === '') {
                // 跳过空行  
                return;
            }
            // STEP 2: 点坐标
            const pos = text.split(',');
            const x: number = parseFloat(pos[0]);
            if (x < record.minX)
                record.minX = x;
            else if (x > record.maxX)
                record.maxX = x;

            const y: number = parseFloat(pos[1]);
            if (y < record.minY)
                record.minY = y;
            else if (y > record.maxY)
                record.maxY = y;

            const z: number = parseFloat(pos[2]);
            if (z < record.minZ)
                record.minZ = z;
            else if (z > record.maxZ)
                record.maxZ = z;

            postions.push(`v ${pos[0]} ${pos[1]} ${pos[2]}\n`);
            uvs.push(`vt ${pos[0]} ${pos[1]}\n`);
        });

        readL.on('close', () => {
            Wlog.LogStamp("[XYZtoOBJ]-文件读取完毕。");
            const widthN = Math.round((record.maxY - record.minY) / unit) + 1;
            const length = Math.round((record.maxX - record.minX) / unit) + 1;
            // STEP 3: 四边面
            let face: string[] = [];
            for (let i = 0; i < length - 1; i++) {
                for (let j = 0; j < widthN - 1; j++) {

                    const index0 = (i * widthN + j) + 1;
                    const index1 = (i + 1) * widthN + j + 1;
                    const index2 = (i + 1) * widthN + (j + 1) + 1;
                    const index3 = i * widthN + (j + 1) + 1;
                    face.push(`f ${index0}/${index0} ${index1}/${index1} ${index2}/${index2} ${index3}/${index3}\n`);

                }
            }
            const res = stringBuid.concat(postions).concat(uvs).concat(face).join('');
            const buffer = Buffer.from(res, 'utf8');
            write.write(buffer);
            write.end();
            Wlog.LogStamp("[XYZtoOBJ]-转化完毕");
            callback(0, buffer);

        });
    }

}
/**
 * 复制文件
 * @param fromPath 原文件路径
 * @param toPath 复制文件路径
 * @param callback code 0成功&-1失败
 */
export function CopyFile(fromPath: string, toPath: string,callback: (code: number) => void) {
    // 异步方式
    Wlog.LogStamp("[CopyFile]-开始拷贝文件");
    if(!fs.existsSync(fromPath)){
        Wlog.LogError("文件复制失败：fromPath 不存在"+fromPath)
    }
    const directoryPath = path.dirname(toPath); 
    if(!fs.existsSync(directoryPath)){ 
        fs.mkdirSync(directoryPath, { recursive: true })
    }
    fs.copyFile(fromPath, toPath, (err) => {
        if (err) {
            callback(-1)
            Wlog.LogError('文件复制失败：fromPath:'+fromPath+' toPath'+toPath);
        } else {
            Wlog.LogSuccessd('文件复制：fromPath:'+fromPath+' toPath'+toPath);
            Wlog.LogStamp("[CopyFile]-拷贝完毕");
            callback(0)
         
        }
    });

}

/**
 * 创建子进程任务
 * @param path .exe行路径
 * @param args 传入参数
 * @param callback err通道字符串
 */
export function ProcessRead(path:string,args:string[],callback: ((err: string) => void)){
    Wlog.LogStamp("[ProcessRead]-开始创建进程：");
    const childProcess = spawn(path, args,{windowsHide:false});
    Wlog.LogInfo(`Path:${path}|args${args.join('|')}`);
    let info='';
    childProcess.stdout.on('data', (data) => {
        Wlog.LogInfo('stdout:'+data.toString())
    });
    
    childProcess.stderr.on('data', (data) => {
        info+=data.toString();          
    });
    
    childProcess.on('close', (code) => {
        Wlog.LogStamp("[ProcessRead]-进程处理完毕");
        Wlog.LogSuccessd(info);
        callback(info);    
    });
} 
/**
 * 检查路径合法 如果不纯在
 * @param targetpath 目标路径
 */
export function CheckPath(targetpath:string){
    const directoryPath = path.dirname(targetpath); 
    if(!fs.existsSync(directoryPath)){ 
        fs.mkdirSync(directoryPath, { recursive: true })
    }
}
/**
 * 
 * @param inputFilePath 压缩文件
 * @param outputFilePath 压缩输出路径
 * @param callback  code 0：成功
 */
export function ZipFile(inputFilePath:string,outputFilePath:string,callback: (code: number) => void){

    Wlog.LogStamp(`[ZipFile]-开始创建压缩文件-level=9-inputFilePath:${inputFilePath}`);
    // 创建一个输出流到写入zip文件
    const output = fs.createWriteStream(outputFilePath);
    const archive = archiver('zip', {
        zlib: { level: 9 } // 设置压缩级别为最高
    });
    // 监听警告和错误事件
    output.on('warning', function(err) {
        Wlog.LogWarning(err);
    });
    output.on('error', function(err) {
        Wlog.LogError(err.message);
    });
    
    // 将输出流管道到archiver
    archive.pipe(output);
    const filename=path.basename(inputFilePath);
    // 将文件添加到zip文件中
    archive.file(inputFilePath, { name: filename });
    
    // 完成压缩后关闭输出流
    archive.finalize();
    
    // 当压缩完成时输出提示信息
    output.on('close', () => {
        Wlog.LogStamp(`[ZipFile]-n文件压缩完成-outputFilePath:${outputFilePath}`);
        callback(0);       
    });
}