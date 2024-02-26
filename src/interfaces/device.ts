import {Data} from "./Data";

export interface Device {
    host: string;
    name: string;
    type: string;
    totalDurationOpen: number;
    totalDurationClose: number;
    sendStopAt0: boolean;
    sendStopAt100: boolean;
    data: Data;
    allowResend: boolean;
    withDelay: boolean;
}
