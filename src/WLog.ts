import fs from 'fs';
import path from 'path';
import { config } from "./config.js"
import { fileURLToPath } from 'url'
const __dirname = fileURLToPath(new URL('.', import.meta.url))
enum LogLevel {
    Info,
    Successd,
    Warning,
    Error,
    Topic,
    Exception,
    Stamp
}

//#region Log色板
const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    dim: "\x1b[2m",
    underscore: "\x1b[4m",
    blink: "\x1b[5m",
    reverse: "\x1b[7m",
    hidden: "\x1b[8m",

    // 前景色
    fgBlack: "\x1b[30m",
    fgRed: "\x1b[31m",
    fgGreen: "\x1b[32m",
    fgYellow: "\x1b[33m",
    fgBlue: "\x1b[34m",
    fgMagenta: "\x1b[35m",
    fgCyan: "\x1b[36m",
    fgWhite: "\x1b[37m",

    // 背景色
    bgBlack: "\x1b[40m",
    bgRed: "\x1b[41m",
    bgGreen: "\x1b[42m",
    bgYellow: "\x1b[43m",
    bgBlue: "\x1b[44m",
    bgMagenta: "\x1b[45m",
    bgCyan: "\x1b[46m",
    bgWhite: "\x1b[47m"
};
//#endregion
export const VERCODE: string = "Ver 0.0.0";
const LOGPATH: string = config.WLogPath;
function pad2(n) {  // always returns a string
    return `${n}`.padStart(2, '0')
}
function pad3(n) {  // always returns a string
    return `${n}`.padStart(3, '0')
}
function dateformat_ymdhmsf(_date: Date) {
    return `${_date.getFullYear()}-${pad2(_date.getMonth() + 1)}-${pad2(_date.getDate())} ${pad2(_date.getHours())}:${pad2(_date.getMinutes())}:${pad2(_date.getSeconds())}.${pad3(_date.getMilliseconds())}`
}
function dateformat_ymd(_date: Date) {
    return `${_date.getFullYear()}-${pad2(_date.getMonth() + 1)}-${pad2(_date.getDate())}`
}

class WLog {

    public LogInfo(msg: string) {
        const logInfo: { info: string, path: string, console: string } = this.GetStringFormat(msg, LogLevel.Info);
        this.LogToFile(logInfo.info, logInfo.path);
    }
    public LogSuccessd(msg: string) {
        const logInfo: { info: string, path: string, console: string } = this.GetStringFormat(msg, LogLevel.Successd);
        this.LogToFile(logInfo.info, logInfo.path);
        console.log(logInfo.console);
    }
    public LogWarning(msg: string) {
        const logInfo: { info: string, path: string, console: string } = this.GetStringFormat(msg, LogLevel.Warning);
        this.LogToFile(logInfo.info, logInfo.path);
        console.log(logInfo.console);
    }
    public LogError(msg: string) {
        const logInfo: { info: string, path: string, console: string } = this.GetStringFormat(msg, LogLevel.Error);
        this.LogToFile(logInfo.info, logInfo.path);
        // StackFrame
        console.log(logInfo.console);
    }
    public LogTopic(topic: string, msg: string) {
        const logInfo: { info: string, path: string, console: string } = this.GetStringFormat(msg, LogLevel.Topic, topic);
        this.LogToFile(logInfo.info, logInfo.path);
        console.log(logInfo.console);
    }

    public LogException(msg: string) {
        const logInfo: { info: string, path: string, console: string } = this.GetStringFormat(msg, LogLevel.Exception);
        this.LogToFile(logInfo.info, logInfo.path);
        console.log(logInfo.console);
    }
    public LogStamp(msg: string) {
        const logInfo: { info: string, path: string, console: string } = this.GetStringFormat(msg, LogLevel.Stamp);
        this.LogToFile(logInfo.info, logInfo.path);
    }

    private GetStringFormat(msg: string, type: LogLevel, topic: string = ''): { info: string, path: string, console: string } {
        const date: Date = new Date();
        let mes: string = '';
        let conmes: string = '';
        const ymdhmsf = dateformat_ymdhmsf(date);
        switch (type) {
            case LogLevel.Topic:
                mes = `[WLog:${VERCODE}]\t[${topic}]\t[${ymdhmsf}]\t-${msg}`;
                conmes = `${colors.dim}${colors.bgMagenta}[WLog:${VERCODE}]\t[${topic}]\t[${ymdhmsf}]${colors.reset}\t${colors.bright}${colors.fgMagenta}${msg}${colors.reset}`;
                break;
            case LogLevel.Info:
                mes = `[WLog:${VERCODE}]\t[Info]\t[${ymdhmsf}]\t-${msg}`;
                conmes = `${colors.dim}${colors.bgMagenta}[WLog:${VERCODE}]\t[Info]\t[${ymdhmsf}]${colors.reset}\t${colors.bright}${colors.fgBlack}${msg}${colors.reset}`;
                break;
            case LogLevel.Successd:
                mes = `[WLog:${VERCODE}]\t[Successd]\t[${ymdhmsf}]\t-${msg}`;
                conmes = `${colors.dim}${colors.bgMagenta}[WLog:${VERCODE}]\t[Successd]\t[${ymdhmsf}]${colors.reset}\t${colors.bright}${colors.fgGreen}${msg}${colors.reset}`;
                break;
            case LogLevel.Warning:
                mes = `[WLog:${VERCODE}]\t[Warning]\t[${ymdhmsf}]\t-${msg}`;
                conmes = `${colors.dim}${colors.bgMagenta}[WLog:${VERCODE}]\t[Warning]\t[${ymdhmsf}]${colors.reset}\t${colors.bright}${colors.fgYellow}${msg}${colors.reset}`;
                break;
            case LogLevel.Error:
                mes = `[WLog:${VERCODE}]\t[Error]\t[${ymdhmsf}]\t-${msg}`;
                conmes = `${colors.dim}${colors.bgMagenta}[WLog:${VERCODE}]\t[Error]\t[${ymdhmsf}]${colors.reset}\t${colors.bright}${colors.fgRed}${msg}${colors.reset}`;
                break;
            case LogLevel.Exception:
                mes = `[WLog:${VERCODE}]\t[Exception]\t[${ymdhmsf}]\t-${msg}`;
                conmes = `${colors.dim}${colors.bgMagenta}[WLog:${VERCODE}]\t[Exception]\t[${ymdhmsf}]${colors.reset}\t${colors.bright}${colors.fgRed}${msg}${colors.reset}`;
                break;
            case LogLevel.Stamp:
                mes = `[WLog:${VERCODE}]\t[Stamp]\t[${ymdhmsf}]\t-${msg}`;
                conmes = `${colors.dim}${colors.bgMagenta}[WLog:${VERCODE}]\t[Exception]\t[${ymdhmsf}]${colors.reset}\t${colors.bright}${colors.fgCyan}${msg}${colors.reset}`;
                break;
        }
        return { info: mes, path: dateformat_ymd(date), console: conmes };
    }

    private LogToFile(text: string, secondPath: string) {
        const targetpath =  path.join(__dirname, `${LOGPATH}/${secondPath}.txt`)
        if (fs.existsSync(targetpath)) {
            //追加
            fs.appendFile(targetpath, `${text}\n`, function (error) {
                if (error) console.error(`${targetpath}: ${error.code}`)
            })
        } else {
            //新增
            const directoryPath = path.dirname(targetpath);
            if (!fs.existsSync(directoryPath)) {
                fs.mkdirSync(directoryPath, { recursive: true })
            }
            fs.writeFile(targetpath, text, function (error) {
                if (error) console.error(`${targetpath}: ${error.code}`)
            })
        }
    }

}
export const Wlog = new WLog();

const downloadClear: number = 3 * (24 * 60 * 60 * 1000);
const WlogClear: number = 3 * (24 * 60 * 60 * 1000);
const logClear: number = 7 * (24 * 60 * 60 * 1000);
// 要清理的文件夹路径
// 清理文件的函数
function cleanFolder(folderPath: string, gap: number, iscleanfolder: boolean = false) {
    if (!fs.existsSync(folderPath)) return;
    Wlog.LogStamp("开始清理-folderPath" + folderPath)
    fs.readdir(folderPath, (err, files) => {
        if (err) {
            Wlog.LogError('Error reading directory:' + err.message);
            return;
        }
        if (iscleanfolder && files.length === 0) {
            fs.rmdir(folderPath, (err) => {
                if (err) {
                    Wlog.LogError('Error deleting folder:' + err.message);
                    return;
                }
                Wlog.LogTopic("Clean", 'Deleted folder:' + folderPath);
            });
            return;
        }
        // 设置要删除的文件的过期时间（这里设置为一天之前）
        const cha = Date.now() - gap;
        // 遍历文件并删除过期的文件
        files.forEach(file => {
            const filePath = path.join(folderPath, file);
            fs.stat(filePath, (err, stats) => {
                if (err) {
                    Wlog.LogError('Error getting file stats:' + err.message);
                    return;
                }
                if (stats.isFile() && stats.mtimeMs < cha) {
                    fs.unlink(filePath, err => {
                        if (err) {
                            Wlog.LogError('Error deleting file:' + err.message);
                            return;
                        }
                        Wlog.LogTopic("Clean", 'Deleted file:' + filePath);
                    });
                } else if (stats.isDirectory()) {
                    cleanFolder(filePath, gap, iscleanfolder);
                }

            });
        });
    });
}

export function CheckFolder() {
    Wlog.LogStamp("------检查清理目录----------")
    cleanFolder(path.join(__dirname, config.WLogPath), WlogClear);
    cleanFolder(path.join(__dirname, config.DownLoadPath.CABINSCAN), downloadClear, true);
    cleanFolder(path.join(__dirname, config.DownLoadPath.PILESCAN), downloadClear, true);
    cleanFolder(path.join(__dirname, config.DownLoadPath.MERGE), downloadClear, true);
    const file = path.join(__dirname, `log`)
    cleanFolder(file, logClear);

}
