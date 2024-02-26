import {Logger} from 'neramirez-broadlink-ts';
import {Logger as HomebridgeLoggerAPI} from 'homebridge';

export class HombridgeLogger implements Logger {

  private homebridgeLogger: HomebridgeLoggerAPI;

  constructor(homebridgeLogger: HomebridgeLoggerAPI) {
    this.homebridgeLogger = homebridgeLogger;
  }

  info(message: string, ...parameters: unknown[]): void {
    this.homebridgeLogger.info(message, ...parameters);
  }

  warn(message: string, ...parameters: unknown[]): void {
    this.homebridgeLogger.warn(message, ...parameters);
  }

  error(message: string, ...parameters: unknown[]): void {
    this.homebridgeLogger.error(message, ...parameters);
  }

  debug(message: string, ...parameters: unknown[]): void {
    this.homebridgeLogger.debug(message, ...parameters);
  }
}