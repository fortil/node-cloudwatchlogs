import events from 'events';

declare namespace cloudwatchlogs {
  export interface IlogConsole {
    show: boolean;
    maxLine: number;
    maxLevel: number;
  }
  export interface Ilogger {
    count: number;
    maxLine: number;
    countMsgToSend: number;
    maxLevel: number;
  }

  export interface Idata { name: string, stream: string, messages: string };

  export interface IawsConfig {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    [k: string]: string;
  }

  export interface getAllMessages { (): Idata[]; }

  export class Logger extends events.EventEmitter {
    private constructor();

    info(name: string, ...args: any[]): void;

    success(name: string, ...args: any[]): void;

    warning(name: string, ...args: any[]): void;

    error(name: string, ...args: any[]): void;

    static setAWSKeys(awsConfig: IawsConfig): void;

    setAWSKeys(awsConfig: IawsConfig): void;

    config(loggerName: string, stream: string, config: { logConsole: IlogConsole, logger: Ilogger }): Logger;

  }

}

export type TypeLogger = typeof cloudwatchlogs.Logger;

export default new cloudwatchlogs.Logger();