import AWS from 'aws-sdk';
import events from 'events';
import Util from 'util';
import get from 'lodash.get';
import set from 'lodash.set';

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

export interface Idata { name: string, stream: string, messages: string };

export interface IawsConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  [k: string]: string;
}

const logConsole: IlogConsole = {
  show: true,
  maxLine: 15,
  maxLevel: 2
}
const logger: Ilogger = {
  count: 20,
  maxLine: 20,
  countMsgToSend: 20,
  maxLevel: 3
}
const LOGGERS: { [k: string]: any } = { totalMessages: 0 }

export const getAllMessages = (): Idata[] => {
  const groups = Object.keys(LOGGERS)
  const events = groups.reduce((prev, curr) => {
    if (curr === 'totalMessages') {
      return prev
    }
    const streamsOfGroup = Object.keys(LOGGERS[curr])
    const routes = streamsOfGroup.map(stream => ({ name: curr, stream, path: `${curr}.${stream}.logEvents` }))
    prev = prev.concat(routes)
    return prev
  }, [])
  let messages: Idata[] = []
  for (let i = 0; i < events.length; i++) {
    const message = get(LOGGERS, events[i].path)
    if (message.length) {
      const data: Idata = { name: events[i].name, stream: events[i].stream, messages: message }
      messages = messages.concat(data)
    }
  }
  return messages
}

export class Logger extends events.EventEmitter {
  private loggerName: string;
  private streamName: string;
  private stream: string;
  private console: IlogConsole;
  private logger: Ilogger;
  private _working: boolean = false;

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

  static setAWSKeys(awsConfig: IawsConfig) {
    CloudWatchLogs = new AWS.CloudWatchLogs({
      apiVersion: '2014-03-28',
      ...awsConfig
    })
  }

  setAWSKeys(awsConfig: IawsConfig) {
    CloudWatchLogs = new AWS.CloudWatchLogs({
      apiVersion: '2014-03-28',
      ...awsConfig
    })
  }

  config(loggerName: string, stream: string, config?: { logConsole: IlogConsole, logger: Ilogger }): Logger {
    if (!config) {
      config = { logConsole, logger }
    }
    const STAGE = process.env.STAGE || 'dev'
    this.loggerName = (`${STAGE}-${loggerName || 'noname'}`).toUpperCase()
    this.streamName = `${stream.toUpperCase() || 'noname'} ${(new Date()).toLocaleDateString()}`
    this.stream = `${stream.toUpperCase() || 'noname'}`
    const { show: showConsole = false, maxLine: maxLineConsole = 15, maxLevel: maxLevelConsole = 2 } = config.logConsole
    const { maxLine: maxLineLogger = 20, maxLevel: maxLevelLogger = 3, countMsgToSend = 10 } = config.logger
    this.console.show = showConsole
    this.console.maxLine = maxLineConsole
    this.console.maxLevel = maxLevelConsole
    this.logger.maxLine = maxLineLogger
    this.logger.count = countMsgToSend
    this.logger.maxLevel = maxLevelLogger
    return this
  }
}

const Loging = new Logger()

Loging.on('log', function log(type = '', first = '', ...args) {
  const TYPE = type.toUpperCase()
  const FIRST = first.toUpperCase()
  const argsToStrings = args.map(el =>
    typeof el === 'string' ? el : Util.inspect(el, { compact: true, depth: this.logger.maxLevel, breakLength: this.logger.maxLine })
  )
  if (this.console.show) {
    this.emit('consoleLog', TYPE, FIRST, ...args)
  }
  this.emit('stackMessages', TYPE, FIRST, ...argsToStrings)
})

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
})

Loging.on('stackMessages', function stackMessages(type, first, ...args) {
  const logString = Util.format('[%s]:[%s]: %s', type, first, ...args)
  const logName = this.loggerName
  const streamName = this.streamName
  const LogStream = get(LOGGERS, `${logName}.${streamName}`)
  const LogStreamEvents = get(LOGGERS, `${logName}.${streamName}.logEvents`)
  let logEvents = []

  if (!LogStream || !LogStreamEvents) {
    set(LOGGERS, `${logName}.${streamName}.logEvents`, [])
    logEvents = []
  } else {
    logEvents = get(LOGGERS, `${logName}.${streamName}.logEvents`)
  }

  const newLogsEvents = (logEvents || []).concat({ message: logString, timestamp: (new Date()).getTime() })
  set(LOGGERS, `${logName}.${streamName}.logEvents`, newLogsEvents)
  const totalMessages = parseInt(get(LOGGERS, `totalMessages`))
  set(LOGGERS, `totalMessages`, totalMessages + 1)
  if (
    CloudWatchLogs &&
    // newLogsEvents.length &&
    totalMessages >= this.logger.count &&
    this._working === false
  ) {
    this._working = true
    const messages = getAllMessages()
    const element = messages[0]
    if (element) {
      set(LOGGERS, `totalMessages`, totalMessages - element.messages.length)
      set(LOGGERS, `${element.name}.${element.stream}.logEvents`, [])
      this.emit('sendMessage', element)
    }
  }
})

Loging.on('sendMessage', function sendMessage(element) {
  const logName = element.name
  const streamName = element.stream
  const sequenceToken = get(LOGGERS, `${logName}.${streamName}.sequenceToken`)
  const params = {
    logEvents: element.messages,
    logGroupName: logName,
    logStreamName: streamName,
    ...(
      sequenceToken ? { sequenceToken } : {}
    )
  }

  CloudWatchLogs.putLogEvents(params, (err, data) => {
    if (err) {
      if (/The specified log group does not exist/ig.test(err.stack)) {
        return this.emit('createLogGroup', element)
      }
      if (/The specified log stream does not exist/ig.test(err.stack)) {
        return this.emit('createLogStream', element)
      }
      const str = err.message
      const match = str.match(/\d{30,}/g)
      const sequence = /The next expected sequenceToken is/ig.test(str)
        ? Array.isArray(match) ? match : null : []

      if ((Array.isArray(sequence) && sequence.length) || sequence === null) {
        set(LOGGERS, `${logName}.${streamName}.sequenceToken`,
          Array.isArray(sequence) ? sequence[0] : sequence)
        return this.emit('sendMessage', element)
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
        set(LOGGERS, `${logName}.${streamName}.sequenceToken`, data.nextSequenceToken)
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
        set(LOGGERS, `${logName}.${streamName}.sequenceToken`, data.nextForwardToken)
        this.emit('sendMessage', element)
      }
    }
  })
})

Loging.on('finishSendMessage', function finishSendMessage() {
  const messages = getAllMessages()
  if (messages.length) {
    const element = messages[0]
    const totalMessages = parseInt(get(LOGGERS, `totalMessages`))
    set(LOGGERS, `totalMessages`, totalMessages - element.messages.length)
    set(LOGGERS, `${element.name}.${element.stream}.logEvents`, [])
    this.emit('sendMessage', element)
  } else {
    this._working = false
    this.emit('done', 'sucess send')
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

module.exports = Loging;
exports.Logger = Logger;
exports.getAllMessages = getAllMessages;
export default Loging;