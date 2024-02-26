import {PlatformAccessory, Service} from 'homebridge';

import {HomebridgeBroadlinkWindowCoveringPlatform} from './platform';
import {DeviceContext} from './interfaces/deviceContext';
import {BroadLinkDeviceRF} from 'neramirez-broadlink-ts';

export class WindowCoveringAccessory {
  private service: Service;
  private broadLinkDevice: BroadLinkDeviceRF;
  private movementStartTime: number | null = null;
  private positionState: number;
  private readonly WINDOW_COVERING_FULLY_OPEN = 100;
  private readonly WINDOW_COVERING_FULLY_CLOSED = 0;

  constructor(
        private readonly platform: HomebridgeBroadlinkWindowCoveringPlatform,
        private readonly accessory: PlatformAccessory<DeviceContext>,
  ) {
    // extract name from config
    this.broadLinkDevice = accessory.context.broadLinkDevice;

    this.positionState = this.platform.Characteristic.PositionState.STOPPED;

    this.service = this.getService();
    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.name);


    // create handlers for required characteristics
    this.service.getCharacteristic(this.platform.Characteristic.CurrentPosition)
      .onGet(this.handleCurrentPositionGet.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.PositionState)
      .onGet(this.handlePositionStateGet.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.TargetPosition)
      .onGet(this.handleTargetPositionGet.bind(this))
      .onSet(this.handleTargetPositionSet.bind(this));

  }

  /**
     * Handle requests to get the current value of the "Current Position" characteristic
     */

  handleCurrentPositionGet() {

    // If the window covering is not moving, return the saved current position
    return this.getCurrentPosition();
  }

  /**
     * Handle requests to get the current value of the "Position State" characteristic
     */
  handlePositionStateGet() {
    this.platform.log.debug('Triggered GET PositionState');

    return this.positionState;
  }

  /**
     * Handle requests to get the current value of the "Target Position" characteristic
     */
  handleTargetPositionGet() {
    this.platform.log.debug('Triggered GET TargetPosition');

    // Get the target position from the accessory's context
    return this.accessory.context.targetPosition || 0;

  }

  /**
     * Handle requests to set the "Target Position" characteristic
     */
  handleTargetPositionSet(value) {
    this.platform.log.debug('Triggered SET TargetPosition:' + value);

    if (value === this.WINDOW_COVERING_FULLY_OPEN && this.getCurrentPosition() === this.WINDOW_COVERING_FULLY_OPEN) {
      // Set the current state to fully closed
      this.accessory.context.currentPosition = this.WINDOW_COVERING_FULLY_CLOSED;
    }
    if (value === this.WINDOW_COVERING_FULLY_CLOSED && this.getCurrentPosition() === this.WINDOW_COVERING_FULLY_CLOSED) {
      // Set the current state to fully open
      this.accessory.context.currentPosition = this.WINDOW_COVERING_FULLY_OPEN;
    }

    const currentPosition = this.getCurrentPosition();
    if (currentPosition < value) {
      this.openWindowCovering();
    } else if (currentPosition > value) {
      this.closeWindowCovering();
    }
    this.accessory.context.targetPosition = value;

  }

  public toJSON() {

    return {
      broadLinkDevice: this.broadLinkDevice,
      context: this.accessory.context,
    };
  }

  private getService() {
    const service = this.accessory.getService(this.platform.Service.WindowCovering);
    if (!service) {
      return this.accessory.addService(this.platform.Service.WindowCovering);
    }
    return service;
  }

  private stopWindowCovering(intervalId: NodeJS.Timeout) {
    clearInterval(intervalId);
    if (this.positionState === this.platform.Characteristic.PositionState.DECREASING) {
      this.handleDecreasingState();
    } else if (this.positionState === this.platform.Characteristic.PositionState.INCREASING) {
      this.handleIncreasingState();
    }
  }

  private handleDecreasingState() {
    if (this.getTargetPosition() === this.WINDOW_COVERING_FULLY_CLOSED) {
      this.accessory.context.currentPosition = this.WINDOW_COVERING_FULLY_CLOSED;
      this.positionState = this.platform.Characteristic.PositionState.STOPPED;
      this.platform.log.debug(' Increasing current position by:1 100');
      this.platform.log.info(' Window Covering is ' + this.accessory.context.device.name + ' fully closed');

    } else {
      this.issueStopCommand();
    }
  }

  private handleIncreasingState() {
    if (this.getTargetPosition() === this.WINDOW_COVERING_FULLY_OPEN) {
      this.accessory.context.currentPosition = this.WINDOW_COVERING_FULLY_OPEN;
      this.positionState = this.platform.Characteristic.PositionState.STOPPED;
      this.platform.log.debug(' Decreasing current position by:1 100');
      this.platform.log.info(' Window Covering is ' + this.accessory.context.device.name + ' fully open');

    } else {
      this.issueStopCommand();
    }
  }

  private issueStopCommand() {
    const {data: {stop}} = this.accessory.context.device;
    this.broadLinkDevice.enqueue(Buffer.from(stop, 'hex')).then(() => {
      this.platform.log.debug('Successfully enqueued stop command');
      this.positionState = this.platform.Characteristic.PositionState.STOPPED;
    })
      .catch((error) => {
        this.platform.log.error('Failed to enqueue stop command:', error);
      });
  }

  private openWindowCovering() {
    const {data: {open}, totalDurationOpen} = this.accessory.context.device;
    this.broadLinkDevice.enqueue(Buffer.from(open, 'hex')).then(() => {
      this.platform.log.debug('Successfully enqueued open command');
      this.positionState = this.platform.Characteristic.PositionState.INCREASING;

      // Calculate the interval time
      const intervalTime = totalDurationOpen / 100;

      // Start the interval
      const intervalId = setInterval(() => {
        this.platform.log.debug('Increasing current position by:1 ' + this.getCurrentPosition());

        // Increase the currentPosition by 1
        this.accessory.context.currentPosition++;

        // If the currentPosition reaches targetPosition, clear the interval
        if (this.getCurrentPosition() >= this.getTargetPosition()) {
          this.stopWindowCovering(intervalId);

        }
      }, intervalTime * 1000);
    })
      .catch((error) => {
        this.platform.log.error('Failed to enqueue open command:', error);
      });
  }


  private closeWindowCovering() {
    const {data: {close}, totalDurationClose} = this.accessory.context.device;
    this.broadLinkDevice.enqueue(Buffer.from(close, 'hex')).then(() => {
      this.platform.log.debug('Successfully enqueued close command');
      this.positionState = this.platform.Characteristic.PositionState.DECREASING;

      // Calculate the interval time
      const intervalTime = totalDurationClose / 100;

      // Start the interval
      const intervalId = setInterval(() => {
        this.platform.log.debug('Decreasing current position by 1:' + this.accessory.context.currentPosition);

        // Decrease the currentPosition by 1
        this.accessory.context.currentPosition--;

        // If the currentPosition reaches targetPosition, clear the interval
        if (this.getCurrentPosition() <= this.getTargetPosition()) {
          this.stopWindowCovering(intervalId);
        }
      }, intervalTime * 1000);
    })
      .catch((error) => {
        this.platform.log.error('Failed to enqueue close command:', error);
      });
  }

  private getCurrentPosition() {
    return this.accessory.context.currentPosition || 0;
  }

  private getTargetPosition() {
    return this.accessory.context.targetPosition || 0;
  }
}