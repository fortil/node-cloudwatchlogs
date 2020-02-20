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
var lodash_get_1 = __importDefault(require("lodash.get"));
var lodash_set_1 = __importDefault(require("lodash.set"));
var CloudWatchLogs;
;
var logConsole = {
    show: true,
    maxLine: 15,
    maxLevel: 2
};
var logger = {
    count: 20,
    maxLine: 20,
    countMsgToSend: 20,
    maxLevel: 3
};
var LOGGERS = { totalMessages: 0 };
exports.getAllMessages = function () {
    var groups = Object.keys(LOGGERS);
    var events = groups.reduce(function (prev, curr) {
        if (curr === 'totalMessages') {
            return prev;
        }
        var streamsOfGroup = Object.keys(LOGGERS[curr]);
        var routes = streamsOfGroup.map(function (stream) { return ({ name: curr, stream: stream, path: curr + "." + stream + ".logEvents" }); });
        prev = prev.concat(routes);
        return prev;
    }, []);
    var messages = [];
    for (var i = 0; i < events.length; i++) {
        var message = lodash_get_1.default(LOGGERS, events[i].path);
        if (message.length) {
            var data = { name: events[i].name, stream: events[i].stream, messages: message };
            messages = messages.concat(data);
        }
    }
    return messages;
};
var Logger = /** @class */ (function (_super) {
    __extends(Logger, _super);
    function Logger() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this._working = false;
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
    Logger.setAWSKeys = function (awsConfig) {
        CloudWatchLogs = new aws_sdk_1.default.CloudWatchLogs(__assign({ apiVersion: '2014-03-28' }, awsConfig));
    };
    Logger.prototype.setAWSKeys = function (awsConfig) {
        CloudWatchLogs = new aws_sdk_1.default.CloudWatchLogs(__assign({ apiVersion: '2014-03-28' }, awsConfig));
    };
    Logger.prototype.config = function (loggerName, stream, config) {
        if (!config) {
            config = { logConsole: logConsole, logger: logger };
        }
        var STAGE = process.env.STAGE || 'dev';
        this.loggerName = (STAGE + "-" + (loggerName || 'noname')).toUpperCase();
        this.streamName = (stream.toUpperCase() || 'noname') + " " + (new Date()).toLocaleDateString();
        this.stream = "" + (stream.toUpperCase() || 'noname');
        var _a = config.logConsole, _b = _a.show, showConsole = _b === void 0 ? false : _b, _c = _a.maxLine, maxLineConsole = _c === void 0 ? 15 : _c, _d = _a.maxLevel, maxLevelConsole = _d === void 0 ? 2 : _d;
        var _e = config.logger, _f = _e.maxLine, maxLineLogger = _f === void 0 ? 20 : _f, _g = _e.maxLevel, maxLevelLogger = _g === void 0 ? 3 : _g, _h = _e.countMsgToSend, countMsgToSend = _h === void 0 ? 10 : _h;
        this.console.show = showConsole;
        this.console.maxLine = maxLineConsole;
        this.console.maxLevel = maxLevelConsole;
        this.logger.maxLine = maxLineLogger;
        this.logger.count = countMsgToSend;
        this.logger.maxLevel = maxLevelLogger;
        return this;
    };
    return Logger;
}(events_1.default.EventEmitter));
exports.Logger = Logger;
var Loging = new Logger();
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
    var LogStream = lodash_get_1.default(LOGGERS, logName + "." + streamName);
    var LogStreamEvents = lodash_get_1.default(LOGGERS, logName + "." + streamName + ".logEvents");
    var logEvents = [];
    if (!LogStream || !LogStreamEvents) {
        lodash_set_1.default(LOGGERS, logName + "." + streamName + ".logEvents", []);
        logEvents = [];
    }
    else {
        logEvents = lodash_get_1.default(LOGGERS, logName + "." + streamName + ".logEvents");
    }
    var newLogsEvents = (logEvents || []).concat({ message: logString, timestamp: (new Date()).getTime() });
    lodash_set_1.default(LOGGERS, logName + "." + streamName + ".logEvents", newLogsEvents);
    var totalMessages = parseInt(lodash_get_1.default(LOGGERS, "totalMessages"));
    lodash_set_1.default(LOGGERS, "totalMessages", totalMessages + 1);
    if (CloudWatchLogs &&
        // newLogsEvents.length &&
        totalMessages >= this.logger.count &&
        this._working === false) {
        this._working = true;
        var messages = exports.getAllMessages();
        var element = messages[0];
        if (element) {
            lodash_set_1.default(LOGGERS, "totalMessages", totalMessages - element.messages.length);
            lodash_set_1.default(LOGGERS, element.name + "." + element.stream + ".logEvents", []);
            this.emit('sendMessage', element);
        }
    }
});
Loging.on('sendMessage', function sendMessage(element) {
    var _this = this;
    var logName = element.name;
    var streamName = element.stream;
    var sequenceToken = lodash_get_1.default(LOGGERS, logName + "." + streamName + ".sequenceToken");
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
                lodash_set_1.default(LOGGERS, logName + "." + streamName + ".sequenceToken", Array.isArray(sequence) ? sequence[0] : sequence);
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
                lodash_set_1.default(LOGGERS, logName + "." + streamName + ".sequenceToken", data.nextSequenceToken);
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
                lodash_set_1.default(LOGGERS, logName + "." + streamName + ".sequenceToken", data.nextForwardToken);
                _this.emit('sendMessage', element);
            }
        }
    });
});
Loging.on('finishSendMessage', function finishSendMessage() {
    var messages = exports.getAllMessages();
    if (messages.length) {
        var element = messages[0];
        var totalMessages = parseInt(lodash_get_1.default(LOGGERS, "totalMessages"));
        lodash_set_1.default(LOGGERS, "totalMessages", totalMessages - element.messages.length);
        lodash_set_1.default(LOGGERS, element.name + "." + element.stream + ".logEvents", []);
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
module.exports = Loging;
exports.Logger = Logger;
exports.getAllMessages = exports.getAllMessages;
exports.default = Loging;
//# sourceMappingURL=index.js.map