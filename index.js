const AWS = require('aws-sdk')
const EventEmitter = require('events')
const Util = require('util')
const get = require('lodash.get')
const set = require('lodash.set')

let CloudWatchLogs
const logConsole = {
  show: true,
  maxLine: 15,
  maxLevel: 2
}
const logger = {
  maxLine: 20,
  countMsgToSend: 20,
  maxLevel: 3
}
const LOGGERS = {}

module.exports.getAllMessages = () => {
  const groups = Object.keys(LOGGERS)
  const pathTologEvents = groups.reduce((prev, curr) => {
    const streamsOfGroup = Object.keys(LOGGERS[curr])
    const routes = streamsOfGroup.map(stream => `${curr}.${stream}.logEvents`)
    prev = prev.concat(routes)
    return prev
  }, [])
  let messages = []
  for (let i = 0; i < pathTologEvents.length; i++) {
    messages = messages.concat(get(LOGGERS, pathTologEvents[i]))
  }
  return messages
}

class Logger extends EventEmitter {
  constructor (props) {
    super(props)
    this._working = false
  }

  info (name = '', ...args) {
    this.emit('log', 'info', name, ...args)
  }

  success (name = '', ...args) {
    this.emit('log', 'success', name, ...args)
  }

  warning (name = '', ...args) {
    this.emit('log', 'warning', name, ...args)
  }

  error (name = '', ...args) {
    this.emit('log', 'error', name, ...args)
  }

  static setAWSKeys (awsConfig) {
    CloudWatchLogs = new AWS.CloudWatchLogs({
      apiVersion: '2014-03-28',
      ...awsConfig
    })
  }

  setAWSKeys (awsConfig) {
    CloudWatchLogs = new AWS.CloudWatchLogs({
      apiVersion: '2014-03-28',
      ...awsConfig
    })
  }

  config (loggerName, stream, config) {
    if (!config) {
      config = { logConsole, logger }
    }
    const STAGE = process.env.STAGE || 'dev'
    this.loggerName = (`${STAGE}-${loggerName || 'noname'}`).toUpperCase()
    this.streamName = `${stream.toUpperCase() || 'noname'} ${(new Date()).toLocaleDateString()}`
    this.stream = `${stream.toUpperCase() || 'noname'}`
    this.console = this.console ? this.console : {}
    this.logger = this.logger ? this.logger : {}
    const { show: showConsole, maxLine: maxLineConsole, maxLevel: maxLevelConsole } = config.logConsole
    const { maxLine: maxLineLogger, maxLevel: maxLevelLogger, countMsgToSend } = config.logger
    this.console.show = showConsole || true
    this.console.maxLine = maxLineConsole || 15
    this.console.maxLevel = maxLevelConsole || 2
    this.logger.maxLine = maxLineLogger || 20
    this.logger.count = countMsgToSend || 10
    this.logger.maxLevel = maxLevelLogger || 3
    return this
  }
}

const Loging = new Logger()

Loging.on('log', function log (type, first, ...args) {
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

Loging.on('consoleLog', function consoleLog (type, first, ...args) {
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

Loging.on('stackMessages', function stackMessages (type, first, ...args) {
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

  if (
    CloudWatchLogs &&
    newLogsEvents.length &&
    newLogsEvents.length === this.logger.count &&
    this._working === false
  ) {
    this._working = true
    const stacks = [...newLogsEvents]
    set(LOGGERS, `${logName}.${streamName}.logEvents`, [])
    this.emit('sendMessage', stacks)
  }
})

Loging.on('sendMessage', function sendMessage (stacks) {
  const logName = this.loggerName
  const streamName = this.streamName
  const sequenceToken = get(LOGGERS, `${logName}.${streamName}.sequenceToken`)
  const params = {
    logEvents: stacks,
    logGroupName: logName,
    logStreamName: streamName,
    ...(
      sequenceToken ? { sequenceToken } : {}
    )
  }

  CloudWatchLogs.putLogEvents(params, (err, data) => {
    if (err) {
      if (/The specified log group does not exist/ig.test(err.stack)) {
        return this.emit('createLogGroup', stacks)
      }
      if (/The specified log stream does not exist/ig.test(err.stack)) {
        return this.emit('createLogStream', stacks)
      }
      const str = (new Error(err)).message
      const match = str.match(/\d{30,}/g)
      const sequence = /The next expected sequenceToken is/ig.test(str)
        ? Array.isArray(match) ? match : null : []

      if ((Array.isArray(sequence) && sequence.length) || sequence === null) {
        set(LOGGERS, `${logName}.${streamName}.sequenceToken`,
          Array.isArray(sequence) ? sequence[0] : sequence)
        return this.emit('sendMessage', stacks)
      }

      if (
        /nextSequenceToken/ig.test((new Error(err)).message) ||
        /sequenceToken/ig.test((new Error(err)).message)
      ) {
        this.emit('getToken', stacks)
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

Loging.on('createLogGroup', function createLogGroup (stacks) {
  CloudWatchLogs.createLogGroup({ logGroupName: this.loggerName }, err => {
    if (err && !(/log group already exists/ig.test((new Error(err)).message))) {
      this.emit('error', 'ERROR TRYING CREATE A LOG GROUP AWS', err)
    } else {
      this.emit('sendMessage', stacks)
    }
  })
})

Loging.on('createLogStream', function createLogStream (stacks) {
  const params = {
    logGroupName: this.loggerName,
    logStreamName: this.streamName
  }
  CloudWatchLogs.createLogStream(params, err => {
    if (err && !(/log stream already exists/ig.test((new Error(err)).message))) {
      this.emit('error', 'ERROR TO CREATE THE AWS LOGSTREAM', err)
    } else {
      this.emit('sendMessage', stacks)
    }
  })
})

Loging.on('getToken', function getToken (stacks) {
  const logName = this.loggerName
  const streamName = this.streamName
  const params = { logGroupName: logName, logStreamName: streamName }
  CloudWatchLogs.getLogEvents(params, (err, data) => {
    if (err) {
      this.emit('error', 'TOKEN: IT WAS IMPOSSIBLE GET ANOTHER TOKEN AWS', err)
    } else {
      if (data.nextForwardToken) {
        set(LOGGERS, `${logName}.${streamName}.sequenceToken`, data.nextForwardToken)
        this.emit('sendMessage', stacks)
      }
    }
  })
})

Loging.on('finishSendMessage', function finishSendMessage () {
  const logName = this.loggerName
  const streamName = this.streamName
  const logEvents = get(LOGGERS, `${logName}.${streamName}.logEvents`)
  if (logEvents && logEvents.length) {
    const stacks = [...logEvents]
    set(LOGGERS, `${logName}.${streamName}.logEvents`, [])
    this.emit('sendMessage', stacks)
  } else {
    this._working = false
    this.emit('done', 'sucess send')
  }
})

Loging.on('error', function error (describe, error) {
  if (!/aws/ig.test(describe)) {
    this.emit('stackMessages', 'error', error)
  }
  this.emit('consoleLog', 'error', describe, error)
})

module.exports = Loging
