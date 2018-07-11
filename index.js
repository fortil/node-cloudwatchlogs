const AWS = require('aws-sdk')
const EventEmitter = require('events')
const Util = require('util')
const get = require('lodash.get')
const set = require('lodash.set')
let CloudWatchLogs

const colors = {
  INFO: '\x1b[34m',
  ERROR: '\x1b[31m',
  WHITE: '\033[37m',
  SUCCESS: '\x1b[32m',
  WARNING: '\x1b[33m'
}

const LOGGERS = {}

class Logger extends EventEmitter {
  constructor(props) {
    super(props)
    this.props = props
    this.config = props.config || {}
    this.config.showConsole = props.config.showConsole || true
    this.config.loggerName = (props.config.loggerName || 'LOGGER-WITHOUT-NAME').toUpperCase()
    this.config.stream = props.config.stream || 'LOGGER-WITHOUT-STREAM'
    this.config.streamName = `${props.config.stream.toUpperCase()}-${(new Date()).toLocaleDateString()}`
    this._working = true
    this.createLogGroup.bind(this)()
    this.logger.bind(this)()
  }

  logger() {
    this.on('error', (error, describe) => {
      if (describe) {
        this.logConsole('error', describe, error)
      } else {
        this.emit('log', 'error', error)
      }
    })

    this.on('logEvents', (tarjet, key, newValue) => {
      if (this.confi) {
        this.logConsole('white', '¡object changed!', tarjet, ` | ${key} => ${newValue}`)
      }
      tarjet[key] = newValue
    })
    this.on('done', msg => this.logConsole('warning', ...msg, JSON.stringify(LOGGERS)))

    this.on('getToken', stacks => {
      const logName = this.config.loggerName
      const streamName = this.config.streamName
      const params = { logGroupName: logName, logStreamName: streamName }
      CloudWatchLogs.getLogEvents(params, (err, data) => {
        if (err) {
          this.logConsole('error', 'TOKEN: IT WAS IMPOSSIBLE GET ANOTHER TOKEN', err)
        } else {
          if (data.nextForwardToken) {
            set(LOGGERS, `${logName}.${streamName}.sequenceToken`, data.nextForwardToken)
            this.emit('sendMessage', stacks)
          }
        }
      })
    })

    this.on('log', (type, first, args) => this.log(type, first, args))

    this.on('finishSendMessage', () => {
      const logName = this.config.loggerName
      const streamName = this.config.streamName
      const logEvents = get(LOGGERS, `${logName}.${streamName}.logEvents`)
      if (logEvents && logEvents.length) {
        const stacks = [...logEvents]
        set(LOGGERS, `${logName}.${streamName}.logEvents`, [])
        this.emit('sendMessage', stacks)
      } else {
        this._working = false
      }
    })

    this.on('sendMessage', stacks => {
      this._working = true
      const logName = this.config.loggerName
      const streamName = this.config.streamName
      const sequenceToken = get(LOGGERS, `${logName}.${streamName}.sequenceToken`)
      const params = {
        logEvents: stacks,
        logGroupName: logName,
        logStreamName: this.config.streamName,
        ...(
          sequenceToken ? { sequenceToken } : {}
        )
      }
      
      CloudWatchLogs.putLogEvents(params, (err, data) => {
        if (err) {
          const str = (new Error(err)).message
          this.logConsole('error', 'THERE IS A ERROR', str)
          const sequence = /The next expected sequenceToken is/ig.test(str)
            ? Array.isArray(str.match(/\d{30,}/g)) ? str.match(/\d{30,}/g) : null : []
          
          if ((Array.isArray(sequence) && sequence.length) || sequence === null) {
            set(LOGGERS, `${logName}.${streamName}.sequenceToken`, Array.isArray(sequence) ? sequence[0] : sequence)
            return this.emit('sendMessage', stacks)
          }
          
          if (
            /nextSequenceToken/ig.test((new Error(err)).message)
            || /sequenceToken/ig.test((new Error(err)).message)
          ) {
            this.emit('getToken', stacks)
          } else {
            this.logConsole('error', 'IT WAS IMPOSSIBLE UPLOAD THE LOGS', err)
          }
        } else {
          if (data.nextSequenceToken) {
            set(LOGGERS, `${logName}.${streamName}.sequenceToken`, data.nextSequenceToken)
          }

          this.emit('finishSendMessage')
        }
      })
    })

    this.on('stackMessages', (type, first, ...args) => {
      const logString = Util.format('[%s]:[%s]: %s', type, first, ...args)
      const logName = this.config.loggerName
      const streamName = this.config.streamName
      const LogStream = get(LOGGERS, `${logName}.${streamName}`)

      if (!LogStream) {
        set(LOGGERS, `${logName}.${streamName}.logEvents`, [])
      }

      const logEvents = get(LOGGERS, `${logName}.${streamName}.logEvents`)
      set(LOGGERS, `${logName}.${streamName}.logEvents`, logEvents.concat({ message: logString, timestamp: (new Date()).getTime() }))
      
      if (logEvents.length > 9 && this._working === false) {
        const stacks = [...logEvents]
        set(LOGGERS, `${logName}.${streamName}.logEvents`, [])
        this.emit('sendMessage', stacks)
      }
    })
  }

  init() {
    const logName = this.config.loggerName
    const streamName = this.config.streamName
    const LogStream = get(LOGGERS, `${logName}.${streamName}`)
    
    if (!LogStream) {
      set(LOGGERS, `${logName}.${streamName}.logEvents`, [])
    }

    const logEvents = get(LOGGERS, `${logName}.${streamName}.logEvents`)
    
    if (logEvents.length && this._working === false) {
      const stacks = [...logEvents]
      set(LOGGERS, `${logName}.${streamName}.logEvents`, [])
      this.emit('sendMessage', stacks)
    }
  }

  createLogGroup() {
    CloudWatchLogs.createLogGroup({ logGroupName: this.config.loggerName }, err => {
      if (err && !(/log group already exists/ig.test((new Error(err)).message))) {
        this.emit('error', (new Error(err)).message, 'ERROR TRYING CREATE A LOG GROUP')
      } else {
        this.createLogStream()
      }
    })
  }

  createLogStream() {
    const params = {
      logGroupName: this.config.loggerName,
      logStreamName: this.config.streamName
    }
    CloudWatchLogs.createLogStream(params, err => {
      if (err && !(/log stream already exists/ig.test((new Error(err)).message))) {
        this.emit('error', err, 'ERROR TO CREATE THE AWS LOGSTREAM')
      } else {
        this._working = false
        this.init()
      }
    })
  }

  logConsole(type, first, ...args) {
    const argsToStrings = args.map(el =>
      typeof el === 'string' ? el : Util.inspect(el, { compact: true, depth: 5, breakLength: 200 })
    )
    const head = Util.format(
      '[%s]:[%s]:[%s]:[%s]: ',
      (new Date()).toLocaleString(),
      this.config.loggerName,
      this.config.stream,
      first.toUpperCase()
    )
    const string = Util.format('%s', ...argsToStrings)
    console.log(colors[type.toUpperCase()], head, colors['WHITE'], string)
  }

  log(type, first, ...args) {
    const argsToStrings = args.map(el =>
      typeof el === 'string' ? el : Util.inspect(el, { compact: true, depth: 5, breakLength: 200 })
    )

    if (this.config.showConsole) {
      this.logConsole(type, first.toUpperCase(), ...argsToStrings)
    }
    this.emit('stackMessages', type.toUpperCase(), first.toUpperCase(), ...argsToStrings)
  }

  info(name = '', ...args) {
    this.emit('log', 'info', name, ...args)
  }

  success(name = '', ...args) {
    this.emit('log', 'success', name, ...args)
  }

  warning(name = '', ...args) {
    this.emit('log', 'warning', name, ...args)
  }

  error(name = '', ...args) {
    this.emit('log', 'error', name, ...args)
  }


  static config({ showConsole, loggerName, awsConfig }) {
    CloudWatchLogs = new AWS.CloudWatchLogs({
      apiVersion: '2014-03-28',
      ...awsConfig
    })
    return stream => new Logger({
      config: { showConsole, loggerName, stream }
    })
  }

}

module.exports = Logger

