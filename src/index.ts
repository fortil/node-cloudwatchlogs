import AWS from 'aws-sdk';
import events from 'events';
import Util from 'util';
// import get from 'lodash.get';
// import set from 'lodash.set';
import low from 'lowdb';
const { resolve } = require('path');
const FileSync = require('lowdb/adapters/FileSync');
const pathData = resolve(__dirname, `data.json`);
const adapter = new FileSync(pathData);
const db = low(adapter);

let CloudWatchLogs: AWS.CloudWatchLogs;
export interface IlogConsole {
  show: boolean;
  maxLine: number;
  maxLevel: number;
}
export interface Ilogger {
  count?: number;
  maxLine: number;
  countMsgToSend: number;
  maxLevel: number;
}

type IEnvs = 'development' | 'staging' | 'production';

export interface Idata { name: string, stream: string, messages: string };
interface IConfig { logConsole: IlogConsole, logger: Ilogger, environment: IEnvs }
export interface IawsConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  [k: string]: string;
}

const LOG_CONSOLE: IlogConsole = {
  show: false,
  maxLine: 15,
  maxLevel: 2
}
const LOGGER_CONFIG: Ilogger = {
  count: 20,
  maxLine: 20,
  countMsgToSend: 20,
  maxLevel: 3
}
let GLOBAL_CONFIG: IConfig = { logConsole: LOG_CONSOLE, logger: LOGGER_CONFIG, environment: 'development' };
const LOGGERS: { [k: string]: any } = { totalMessages: 0 };
db.defaults({ config: GLOBAL_CONFIG, totalMessages: 0, LOGGERS: {} }).write();
db._.mixin({
  addMessage(items, newItem) {
    if (Array.isArray(items)) {
      items.push(newItem);
      db.update('totalMessages', n => n + 1).write();
      return items;
    } else {
      return Object.assign({}, items, { ...newItem });
    }
  },
  getAllMessages(loggers) {
    if (!loggers) {
      return [];
    }
    const groups = Object.keys(loggers)
    const events = groups.reduce((prev, curr) => {
      // if (curr === 'totalMessages') {
      //   return prev;
      // }
      const streamsOfGroup = Object.keys(loggers[curr]);
      const routes = streamsOfGroup.map(stream => ({ name: curr, stream, path: `${curr}.${stream}.logEvents` }));
      prev = prev.concat(routes);
      return prev;
    }, []);
    let messages: Idata[] = [];
    for (let i = 0; i < events.length; i++) {
      const msgs = db.get(`LOGGERS.${events[i].path}`).value();
      if (msgs.length) {
        const data: Idata = { name: events[i].name, stream: events[i].stream, messages: msgs };
        messages = messages.concat(data);
      }
    }
    return messages;
  }
});

class Logger extends events.EventEmitter {
  private loggerName: string;
  private streamName: string;
  private stream: string;
  private console: IlogConsole = {} as IlogConsole;
  private logger: Ilogger = {} as Ilogger;
  private _working: boolean = false;

  constructor(names?: { loggerName: string, streamName: string, stream: string }, conf?: IConfig) {
    super();
    if (names) {
      this.loggerName = names.loggerName;
      this.streamName = names.streamName;
      this.stream = names.stream;
    }
    if (conf) {
      const config = db.get('config').value();
      this.console = config.logConsole;
      this.logger = config.logger;
    }
  }

  info(name: string = '', ...args: any[]) {
    this.emit('log', 'info', name, ...args)
  }

  success(name: string = '', ...args: any[]) {
    this.emit('log', 'success', name, ...args)
  }

  warning(name: string = '', ...args: any[]) {
    this.emit('log', 'warning', name, ...args)
  }

  error(name: string = '', ...args: any[]) {
    this.emit('log', 'error', name, ...args)
  }
  static setConfig(config: { logConsole: IlogConsole, logger: Ilogger, env: 'development' | 'production' | 'staging' }): void {
    if (!config.logConsole) {
      config.logConsole = LOG_CONSOLE
    }
    if (!config.logger) {
      config.logger = LOGGER_CONFIG
    }
    const environment: IEnvs = config.env || process.env.NODE_ENV as IEnvs;
    GLOBAL_CONFIG = { ...GLOBAL_CONFIG, ...config, environment };
    (db.get('config') as any).assign({ ...GLOBAL_CONFIG }).write();
  }

  static setAWSKeys(awsConfig: IawsConfig) {
    CloudWatchLogs = new AWS.CloudWatchLogs({
      apiVersion: '2014-03-28',
      ...awsConfig
    })
  }

  static config(loggerName: string, stream: string, config?: IConfig): Logger {
    let conf = GLOBAL_CONFIG;
    if (config) {
      // const { show: showConsole = false, maxLine: maxLineConsole = 15, maxLevel: maxLevelConsole = 2 } = config.logConsole
      // const { maxLine: maxLineLogger = 20, maxLevel: maxLevelLogger = 3, countMsgToSend = 10 } = config.logger
      config = { ...conf, ...config };
      conf.logConsole.show = config.logConsole.show
      conf.logConsole.maxLine = config.logConsole.maxLine
      conf.logConsole.maxLevel = config.logConsole.maxLevel
      conf.logger.maxLine = config.logger.maxLine
      conf.logger.count = config.logger.countMsgToSend;
      conf.logger.maxLevel = config.logger.maxLevel;
      conf.environment = config.environment;
      (db.get('config') as any).assign({ ...conf }).write();
      conf = config;
    }

    const STAGE = conf.environment;
    const name = { loggerName: '', streamName: '', stream: '' };
    name.loggerName = (`${STAGE}-${loggerName || 'noname'}`).toUpperCase()
    name.streamName = `${stream.toUpperCase() || 'noname'} ${(new Date()).toLocaleDateString()}`
    name.stream = `${stream.toUpperCase() || 'noname'}`
    // return new Logger(name);

    const Loging = new Logger(name, conf);

    Loging.on('log', function log(type = '', first = '', ...args) {
      const TYPE = type.toUpperCase();
      const FIRST = first.toUpperCase();
      const argsToStrings = args.map(el =>
        typeof el === 'string' ? el : Util.inspect(el, { compact: true, depth: this.logger.maxLevel, breakLength: this.logger.maxLine })
      );
      if (this.console.show) {
        this.emit('consoleLog', TYPE, FIRST, ...args);
      }
      this.emit('stackMessages', TYPE, FIRST, ...argsToStrings);
    });

    Loging.on('consoleLog', function consoleLog(type, first, ...args) {
      const colors = {
        INFO: '\x1b[34m',
        ERROR: '\x1b[31m',
        WHITE: '\x1b[37m',
        SUCCESS: '\x1b[32m',
        WARNING: '\x1b[33m'
      }
      const TYPE = type.toUpperCase()
      const FIRST = first.toUpperCase()
      const argsToStrings = args.map(el =>
        typeof el === 'string' ? el : Util.inspect(el, { compact: true, depth: this.console.maxLevel, breakLength: this.console.maxLine })
      )
      const head = Util.format(
        '[%s]:[%s]:[%s]:[%s]: ',
        (new Date()).toLocaleString(),
        this.loggerName,
        this.stream,
        FIRST
      )
      const string = Util.format('%s', ...argsToStrings)
      console.log(colors[TYPE], head, colors['WHITE'], string)
    });

    Loging.on('stackMessages', function stackMessages(type, first, ...args) {
      const logString = Util.format('[%s]:[%s]: %s', type, first, ...args);
      const logName = this.loggerName;
      const streamName = this.streamName;
      const LogStream = db.get(`LOGGERS.${logName}.${streamName}`).value(); // get(LOGGERS, `${logName}.${streamName}`)
      const LogStreamEvents = db.get(`LOGGERS.${logName}.${streamName}.logEvents`).value(); // get(LOGGERS, `${logName}.${streamName}.logEvents`)

      if (!LogStream || !LogStreamEvents) {
        db.set(`LOGGERS.${logName}.${streamName}.logEvents`, []).write(); // set(LOGGERS, `${logName}.${streamName}.logEvents`, [])
      }
      // this function will update the totalMessage too
      (db.get(`LOGGERS.${logName}.${streamName}.logEvents`) as any).addMessage({ message: logString, timestamp: (new Date()).getTime() }).write();
      const totalMessages = db.get('totalMessages').value();
      // const newLogsEvents = (logEvents || []).concat({ message: logString, timestamp: (new Date()).getTime() })
      // set(LOGGERS, `${logName}.${streamName}.logEvents`, newLogsEvents)
      // const totalMessages = parseInt(get(LOGGERS, `totalMessages`))
      // set(LOGGERS, `totalMessages`, totalMessages + 1)
      const currentCount = this.logger.count || this.logger.countMsgToSend;
      if (
        CloudWatchLogs &&
        totalMessages >= currentCount &&
        this._working === false
      ) {
        this._working = true;
        const messages = (db.get('LOGGERS') as any).getAllMessages().value();
        const element = messages[0];
        if (element) {
          (db.set(`LOGGERS.${logName}.${streamName}.logEvents`, []) as any).write();
          db.update('totalMessages', n => n - element.length).write();
          // set(LOGGERS, `totalMessages`, totalMessages - element.messages.length)
          // set(LOGGERS, `${element.name}.${element.stream}.logEvents`, [])
          this.emit('sendMessage', element)
        }
      }
    })

    Loging.on('sendMessage', function sendMessage(element) {
      const logName = element.name;
      const streamName = element.stream;
      const sequenceToken = db.get(`LOGGERS.${logName}.${streamName}.sequenceToken`).value(); // get(LOGGERS, `${logName}.${streamName}.sequenceToken`)
      const params = {
        logEvents: element.messages,
        logGroupName: logName,
        logStreamName: streamName,
        ...(
          sequenceToken ? { sequenceToken } : {}
        )
      };

      CloudWatchLogs.putLogEvents(params, (err, data) => {
        if (err) {
          if (/The specified log group does not exist/ig.test(err.stack)) {
            return this.emit('createLogGroup', element);
          }
          if (/The specified log stream does not exist/ig.test(err.stack)) {
            return this.emit('createLogStream', element);
          }
          const str = err.message;
          const match = str.match(/\d{30,}/g);
          const sequence = /The next expected sequenceToken is/ig.test(str)
            ? Array.isArray(match) ? match : null : [];

          if ((Array.isArray(sequence) && sequence.length) || sequence === null) {
            db.set(`LOGGERS.${logName}.${streamName}.sequenceToken`, Array.isArray(sequence) ? sequence[0] : sequence).write();
            // set(LOGGERS, `${logName}.${streamName}.sequenceToken`, Array.isArray(sequence) ? sequence[0] : sequence);
            return this.emit('sendMessage', element);
          }

          if (
            /nextSequenceToken/ig.test(err.message) ||
            /sequenceToken/ig.test(err.message)
          ) {
            this.emit('getToken', element)
          } else {
            this.emit('error', 'IT WAS IMPOSSIBLE UPLOAD THE LOGS AWS', err)
          }
        } else {
          if (data.nextSequenceToken) {
            db.set(`LOGGERS.${logName}.${streamName}.sequenceToken`, data.nextSequenceToken);
          }
          this.emit('finishSendMessage')
        }
      })
    })

    Loging.on('createLogGroup', function createLogGroup(element) {
      CloudWatchLogs.createLogGroup({ logGroupName: element.name }, err => {
        if (err && !(/log group already exists/ig.test(err.message))) {
          this.emit('error', 'ERROR TRYING CREATE A LOG GROUP AWS', err)
        } else {
          this.emit('sendMessage', element)
        }
      })
    })

    Loging.on('createLogStream', function createLogStream(element) {
      const params = {
        logGroupName: element.name,
        logStreamName: element.stream
      }
      CloudWatchLogs.createLogStream(params, err => {
        if (err && !(/log stream already exists/ig.test(err.message))) {
          this.emit('error', 'ERROR TO CREATE THE AWS LOGSTREAM', err)
        } else {
          this.emit('sendMessage', element)
        }
      })
    })

    Loging.on('getToken', function getToken(element) {
      const logName = element.name
      const streamName = element.stream
      const params = { logGroupName: logName, logStreamName: streamName }
      CloudWatchLogs.getLogEvents(params, (err, data) => {
        if (err) {
          this.emit('error', 'TOKEN: IT WAS IMPOSSIBLE GET ANOTHER TOKEN AWS', err)
        } else {
          if (data.nextForwardToken) {
            // set(LOGGERS, `${logName}.${streamName}.sequenceToken`, data.nextForwardToken)
            db.set(`LOGGERS.${logName}.${streamName}.sequenceToken`, data.nextForwardToken).write();
            this.emit('sendMessage', element);
          }
        }
      })
    })

    Loging.on('finishSendMessage', function finishSendMessage() {
      const messages = (db.get('LOGGERS') as any).getAllMessages().value();
      if (messages.length) {
        const element = messages[0];
        // const totalMessages = parseInt((db.get('totalMessages') as any).getAllMessages().value());
        // set(LOGGERS, `totalMessages`, totalMessages - element.messages.length)
        (db.set(`LOGGERS.${element.name}.${element.stream}.logEvents`, []) as any).write();
        db.update('totalMessages', n => n - element.length).write();
        // set(LOGGERS, `${element.name}.${element.stream}.logEvents`, [])
        this.emit('sendMessage', element)
      } else {
        this._working = false;
        this.emit('done', 'sucess send');
      }
    })

    Loging.on('error', function error(describe, error) {
      if (!/aws/ig.test(describe)) {
        this.emit('stackMessages', 'error', error)
      }
      this.emit('consoleLog', 'error', describe, error)
    })

    Loging.on('done', function done(...msg) {
      // this.emit('consoleLog', 'success', 'mensaje enviado - terminado', ...msg, JSON.stringify(LOGGERS))
    })
    return Loging;
  }
}


module.exports = Logger;
exports.Logger = Logger;
exports.getAllMessages = () => (db.get('LOGGERS') as any).getAllMessages().value();
export default Logger;