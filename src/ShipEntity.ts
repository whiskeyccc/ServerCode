import { clearScreenDown } from "readline";

export class ShipEntity {
    constructor(mmsi: number) {
        this.mmsi = mmsi;
        this.LastRefreshTime = new Date();
    }
    mmsi: number;
    LastRefreshTime: Date;
    AisDatas: AISDate[] = [];
    AddAISDate(data: AISDate) {
        this.AisDatas.push(data);
        if (this.AisDatas.length > 5) {
            this.AisDatas.shift();
        }
    }
    GetTimeSpan() {
        const len = this.AisDatas.length;
        if (len > 1) {
            // 计算两个日期的毫秒差
            const lastTime: Date = new Date(this.AisDatas[len - 1].timeSpan);
            const secondLastTime: Date = new Date(this.AisDatas[len - 2].timeSpan);
            const diffInMilliseconds = Math.abs(lastTime.getTime() - secondLastTime.getTime());

            // 将毫秒差转换为秒
            const diffInSeconds = diffInMilliseconds / 1000;
            return diffInSeconds
        }else return 0.1;
    }
}

export class AISDate {
    constructor(time: Date,timesPan:Date) {
        this.time = time;
        this.timeSpan=timesPan;
    }
    time:Date;
    timeSpan: Date;
    msg_type: number = 0;
    mmsi: number = 0;
    speed: number = 0;
    lon: number = 0;
    lat: number = 0;
    heading: number = 0;
    gap:number=0.1;

}
