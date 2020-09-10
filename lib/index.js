"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var aws_sdk_1 = __importDefault(require("aws-sdk"));
var events_1 = __importDefault(require("events"));
var util_1 = __importDefault(require("util"));
// import get from 'lodash.get';
// import set from 'lodash.set';
var lowdb_1 = __importDefault(require("lowdb"));
var resolve = require('path').resolve;
var FileSync = require('lowdb/adapters/FileSync');
var pathData = resolve(__dirname, '../../../../', "data-logger.json");
var adapter = new FileSync(pathData);
var db = lowdb_1.default(adapter);
var CloudWatchLogs;
;
var LOG_CONSOLE = {
    show: false,
    maxLine: 15,
    maxLevel: 2
};
var LOGGER_CONFIG = {
    count: 20,
    maxLine: 20,
    countMsgToSend: 20,
    maxLevel: 3
};
var GLOBAL_CONFIG = { logConsole: LOG_CONSOLE, logger: LOGGER_CONFIG, environment: 'development' };
var LOGGERS = { totalMessages: 0 };
db.defaults({ config: GLOBAL_CONFIG, totalMessages: 0, LOGGERS: {} }).write();
db._.mixin({
    addMessage: function (items, newItem) {
        if (Array.isArray(items)) {
            items.push(newItem);
            db.update('totalMessages', function (n) { return n + 1; }).write();
            return items;
        }
        else {
            return Object.assign({}, items, __assign({}, newItem));
        }
    },
    getAllMessages: function (loggers) {
        if (!loggers) {
            return [];
        }
        var groups = Object.keys(loggers);
        var events = groups.reduce(function (prev, curr) {
            // if (curr === 'totalMessages') {
            //   return prev;
            // }
            var streamsOfGroup = Object.keys(loggers[curr]);
            var routes = streamsOfGroup.map(function (stream) { return ({ name: curr, stream: stream, path: curr + "." + stream + ".logEvents" }); });
            prev = prev.concat(routes);
            return prev;
        }, []);
        var messages = [];
        for (var i = 0; i < events.length; i++) {
            var msgs = db.get("LOGGERS." + events[i].path).value();
            if (msgs.length) {
                var data = { name: events[i].name, stream: events[i].stream, messages: msgs };
                messages = messages.concat(data);
            }
        }
        return messages;
    }
});
var Logger = /** @class */ (function (_super) {
    __extends(Logger, _super);
    function Logger(names, conf) {
        var _this = _super.call(this) || this;
        _this.console = {};
        _this.logger = {};
        _this._working = false;
        if (names) {
            _this.loggerName = names.loggerName;
            _this.streamName = names.streamName;
            _this.stream = names.stream;
        }
        if (conf) {
            var config = db.get('config').value();
            _this.console = config.logConsole;
            _this.logger = config.logger;
        }
        return _this;
    }
    Logger.prototype.info = function (name) {
        if (name === void 0) { name = ''; }
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        this.emit.apply(this, __spreadArrays(['log', 'info', name], args));
    };
    Logger.prototype.success = function (name) {
        if (name === void 0) { name = ''; }
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        this.emit.apply(this, __spreadArrays(['log', 'success', name], args));
    };
    Logger.prototype.warning = function (name) {
        if (name === void 0) { name = ''; }
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        this.emit.apply(this, __spreadArrays(['log', 'warning', name], args));
    };
    Logger.prototype.error = function (name) {
        if (name === void 0) { name = ''; }
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        this.emit.apply(this, __spreadArrays(['log', 'error', name], args));
    };
    Logger.setConfig = function (config) {
        if (!config.logConsole) {
            config.logConsole = LOG_CONSOLE;
        }
        if (!config.logger) {
            config.logger = LOGGER_CONFIG;
        }
        var environment = config.env || process.env.NODE_ENV;
        GLOBAL_CONFIG = __assign(__assign(__assign({}, GLOBAL_CONFIG), config), { environment: environment });
        db.get('config').assign(__assign({}, GLOBAL_CONFIG)).write();
    };
    Logger.setAWSKeys = function (awsConfig) {
        CloudWatchLogs = new aws_sdk_1.default.CloudWatchLogs(__assign({ apiVersion: '2014-03-28' }, awsConfig));
    };
    Logger.config = function (loggerName, stream, config) {
        var conf = GLOBAL_CONFIG;
        if (config) {
            // const { show: showConsole = false, maxLine: maxLineConsole = 15, maxLevel: maxLevelConsole = 2 } = config.logConsole
            // const { maxLine: maxLineLogger = 20, maxLevel: maxLevelLogger = 3, countMsgToSend = 10 } = config.logger
            config = __assign(__assign({}, conf), config);
            conf.logConsole.show = config.logConsole.show;
            conf.logConsole.maxLine = config.logConsole.maxLine;
            conf.logConsole.maxLevel = config.logConsole.maxLevel;
            conf.logger.maxLine = config.logger.maxLine;
            conf.logger.count = config.logger.countMsgToSend;
            conf.logger.maxLevel = config.logger.maxLevel;
            conf.environment = config.environment;
            db.get('config').assign(__assign({}, conf)).write();
            conf = config;
        }
        var STAGE = conf.environment;
        var name = { loggerName: '', streamName: '', stream: '' };
        name.loggerName = (STAGE + "-" + (loggerName || 'noname')).toUpperCase();
        name.streamName = (stream.toUpperCase() || 'noname') + " " + (new Date()).toLocaleDateString();
        name.stream = "" + (stream.toUpperCase() || 'noname');
        // return new Logger(name);
        var Loging = new Logger(name, conf);
        Loging.on('log', function log(type, first) {
            var _this = this;
            if (type === void 0) { type = ''; }
            if (first === void 0) { first = ''; }
            var args = [];
            for (var _i = 2; _i < arguments.length; _i++) {
                args[_i - 2] = arguments[_i];
            }
            var TYPE = type.toUpperCase();
            var FIRST = first.toUpperCase();
            var argsToStrings = args.map(function (el) {
                return typeof el === 'string' ? el : util_1.default.inspect(el, { compact: true, depth: _this.logger.maxLevel, breakLength: _this.logger.maxLine });
            });
            if (this.console.show) {
                this.emit.apply(this, __spreadArrays(['consoleLog', TYPE, FIRST], args));
            }
            this.emit.apply(this, __spreadArrays(['stackMessages', TYPE, FIRST], argsToStrings));
        });
        Loging.on('consoleLog', function consoleLog(type, first) {
            var _this = this;
            var args = [];
            for (var _i = 2; _i < arguments.length; _i++) {
                args[_i - 2] = arguments[_i];
            }
            var colors = {
                INFO: '\x1b[34m',
                ERROR: '\x1b[31m',
                WHITE: '\x1b[37m',
                SUCCESS: '\x1b[32m',
                WARNING: '\x1b[33m'
            };
            var TYPE = type.toUpperCase();
            var FIRST = first.toUpperCase();
            var argsToStrings = args.map(function (el) {
                return typeof el === 'string' ? el : util_1.default.inspect(el, { compact: true, depth: _this.console.maxLevel, breakLength: _this.console.maxLine });
            });
            var head = util_1.default.format('[%s]:[%s]:[%s]:[%s]: ', (new Date()).toLocaleString(), this.loggerName, this.stream, FIRST);
            var string = util_1.default.format.apply(util_1.default, __spreadArrays(['%s'], argsToStrings));
            console.log(colors[TYPE], head, colors['WHITE'], string);
        });
        Loging.on('stackMessages', function stackMessages(type, first) {
            var args = [];
            for (var _i = 2; _i < arguments.length; _i++) {
                args[_i - 2] = arguments[_i];
            }
            var logString = util_1.default.format.apply(util_1.default, __spreadArrays(['[%s]:[%s]: %s', type, first], args));
            var logName = this.loggerName;
            var streamName = this.streamName;
            var LogStream = db.get("LOGGERS." + logName + "." + streamName).value();
            var LogStreamEvents = db.get("LOGGERS." + logName + "." + streamName + ".logEvents").value();
            if (!LogStream || !LogStreamEvents) {
                db.set("LOGGERS." + logName + "." + streamName + ".logEvents", []).write();
            }
            // this function will update the totalMessage too
            db.get("LOGGERS." + logName + "." + streamName + ".logEvents").addMessage({ message: logString, timestamp: (new Date()).getTime() }).write();
            var totalMessages = db.get('totalMessages').value();
            var currentCount = this.logger.count || this.logger.countMsgToSend;
            if (CloudWatchLogs &&
                totalMessages >= currentCount &&
                this._working === false) {
                this._working = true;
                var messages = db.get('LOGGERS').getAllMessages().value();
                var element_1 = messages[0];
                if (element_1) {
                    db.set("LOGGERS." + logName + "." + streamName + ".logEvents", []).write();
                    db.update('totalMessages', function (n) { return n - element_1.length; }).write();
                    this.emit('sendMessage', element_1);
                }
            }
        });
        Loging.on('sendMessage', function sendMessage(element) {
            var _this = this;
            var logName = element.name;
            var streamName = element.stream;
            var sequenceToken = db.get("LOGGERS." + logName + "." + streamName + ".sequenceToken").value();
            var params = __assign({ logEvents: element.messages, logGroupName: logName, logStreamName: streamName }, (sequenceToken ? { sequenceToken: sequenceToken } : {}));
            CloudWatchLogs.putLogEvents(params, function (err, data) {
                if (err) {
                    if (/The specified log group does not exist/ig.test(err.stack)) {
                        return _this.emit('createLogGroup', element);
                    }
                    if (/The specified log stream does not exist/ig.test(err.stack)) {
                        return _this.emit('createLogStream', element);
                    }
                    var str = err.message;
                    var match = str.match(/\d{30,}/g);
                    var sequence = /The next expected sequenceToken is/ig.test(str)
                        ? Array.isArray(match) ? match : null : [];
                    if ((Array.isArray(sequence) && sequence.length) || sequence === null) {
                        db.set("LOGGERS." + logName + "." + streamName + ".sequenceToken", Array.isArray(sequence) ? sequence[0] : sequence).write();
                        return _this.emit('sendMessage', element);
                    }
                    if (/nextSequenceToken/ig.test(err.message) ||
                        /sequenceToken/ig.test(err.message)) {
                        _this.emit('getToken', element);
                    }
                    else {
                        _this.emit('error', 'IT WAS IMPOSSIBLE UPLOAD THE LOGS AWS', err);
                    }
                }
                else {
                    if (data.nextSequenceToken) {
                        db.set("LOGGERS." + logName + "." + streamName + ".sequenceToken", data.nextSequenceToken);
                    }
                    _this.emit('finishSendMessage');
                }
            });
        });
        Loging.on('createLogGroup', function createLogGroup(element) {
            var _this = this;
            CloudWatchLogs.createLogGroup({ logGroupName: element.name }, function (err) {
                if (err && !(/log group already exists/ig.test(err.message))) {
                    _this.emit('error', 'ERROR TRYING CREATE A LOG GROUP AWS', err);
                }
                else {
                    _this.emit('sendMessage', element);
                }
            });
        });
        Loging.on('createLogStream', function createLogStream(element) {
            var _this = this;
            var params = {
                logGroupName: element.name,
                logStreamName: element.stream
            };
            CloudWatchLogs.createLogStream(params, function (err) {
                if (err && !(/log stream already exists/ig.test(err.message))) {
                    _this.emit('error', 'ERROR TO CREATE THE AWS LOGSTREAM', err);
                }
                else {
                    _this.emit('sendMessage', element);
                }
            });
        });
        Loging.on('getToken', function getToken(element) {
            var _this = this;
            var logName = element.name;
            var streamName = element.stream;
            var params = { logGroupName: logName, logStreamName: streamName };
            CloudWatchLogs.getLogEvents(params, function (err, data) {
                if (err) {
                    _this.emit('error', 'TOKEN: IT WAS IMPOSSIBLE GET ANOTHER TOKEN AWS', err);
                }
                else {
                    if (data.nextForwardToken) {
                        db.set("LOGGERS." + logName + "." + streamName + ".sequenceToken", data.nextForwardToken).write();
                        _this.emit('sendMessage', element);
                    }
                }
            });
        });
        Loging.on('finishSendMessage', function finishSendMessage() {
            var messages = db.get('LOGGERS').getAllMessages().value();
            if (messages.length) {
                db.set('totalMessages', messages.length - 1).write();
                var element = messages[0];
                db.set("LOGGERS." + element.name + "." + element.stream + ".logEvents", []).write();
                this.emit('sendMessage', element);
            }
            else {
                this._working = false;
                this.emit('done', 'sucess send');
            }
        });
        Loging.on('error', function error(describe, error) {
            if (!/aws/ig.test(describe)) {
                this.emit('stackMessages', 'error', error);
            }
            this.emit('consoleLog', 'error', describe, error);
        });
        Loging.on('done', function done() {
            var msg = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                msg[_i] = arguments[_i];
            }
            // this.emit('consoleLog', 'success', 'mensaje enviado - terminado', ...msg, JSON.stringify(LOGGERS))
        });
        return Loging;
    };
    return Logger;
}(events_1.default.EventEmitter));
module.exports = Logger;
exports.Logger = Logger;
exports.getAllMessages = function () { return db.get('LOGGERS').getAllMessages().value(); };
exports.default = Logger;
//# sourceMappingURL=index.js.map