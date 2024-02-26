import {Device} from './Device';
import {BroadLinkDeviceRF} from 'neramirez-broadlink-ts';

export interface DeviceContext {
    broadLinkDevice: BroadLinkDeviceRF;
    device: Device;
    targetPosition: number;
    currentPosition: number;
}