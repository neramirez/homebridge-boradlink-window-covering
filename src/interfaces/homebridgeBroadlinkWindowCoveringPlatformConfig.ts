import {Host} from './Host';
import {Device} from './Device';
import {PlatformConfig} from 'homebridge';

export interface HomebridgeBroadlinkWindowCoveringPlatformConfig extends PlatformConfig {
    platform: string;
    name: string;
    hosts: Host[];
    devices: Device[];
}
