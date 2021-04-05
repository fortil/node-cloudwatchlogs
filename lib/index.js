"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from) {
    for (var i = 0, il = from.length, j = to.length; i < il; i++, j++)
        to[j] = from[i];
    return to;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_cloudwatch_logs_1 = require("@aws-sdk/client-cloudwatch-logs");
var events_1 = __importDefault(require("events"));
var util_1 = __importDefault(require("util"));
// import get from 'lodash.get';
// import set from 'lodash.set';
var lowdb_1 = __importDefault(require("lowdb"));
var _a = require('path'), resolve = _a.resolve, dirname = _a.dirname;
var FileSync = require('lowdb/adapters/FileSync');
var pathData, adapter, db;
try {
    pathData = resolve(dirname(require.main.filename), '../', "data-logger.json");
    adapter = new FileSync(pathData);
    db = lowdb_1.default(adapter);
}
catch (e) {
    pathData = resolve(dirname(require.main.filename), "data-logger.json");
    adapter = new FileSync(pathData);
    db = lowdb_1.default(adapter);
}
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
            db.update('totalMessages', function (n) { return typeof n === 'number' ? n + 1 : 0; }).write();
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
        if (!events.length) {
            return [];
        }
        for (var i = 0; i < events.length; i++) {
            var msgs = db.get("LOGGERS." + events[i].path).value();
            if (msgs && msgs.length) {
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
        this.emit.apply(this, __spreadArray(['log', 'info', name], args));
    };
    Logger.prototype.success = function (name) {
        if (name === void 0) { name = ''; }
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        this.emit.apply(this, __spreadArray(['log', 'success', name], args));
    };
    Logger.prototype.warning = function (name) {
        if (name === void 0) { name = ''; }
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        this.emit.apply(this, __spreadArray(['log', 'warning', name], args));
    };
    Logger.prototype.error = function (name) {
        if (name === void 0) { name = ''; }
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        this.emit.apply(this, __spreadArray(['log', 'error', name], args));
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
        CloudWatchLogs = new client_cloudwatch_logs_1.CloudWatchLogsClient(awsConfig);
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
                this.emit.apply(this, __spreadArray(['consoleLog', TYPE, FIRST], args));
            }
            this.emit.apply(this, __spreadArray(['stackMessages', TYPE, FIRST], argsToStrings));
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
            var string = util_1.default.format.apply(util_1.default, __spreadArray(['%s'], argsToStrings));
            console.log(colors[TYPE], head, colors['WHITE'], string);
        });
        Loging.on('stackMessages', function stackMessages(type, first) {
            var args = [];
            for (var _i = 2; _i < arguments.length; _i++) {
                args[_i - 2] = arguments[_i];
            }
            var logString = util_1.default.format.apply(util_1.default, __spreadArray(['[%s]:[%s]: %s', type, first], args));
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
                var element = messages[0];
                if (element) {
                    db.set("LOGGERS." + logName + "." + streamName + ".logEvents", []).write();
                    db.set('totalMessages', messages.length - 1).write();
                    this.emit('sendMessage', element);
                }
            }
        });
        Loging.on('sendMessage', function sendMessage(element) {
            return __awaiter(this, void 0, void 0, function () {
                var logName, streamName, sequenceToken, params, data, error_1, str, match, sequence;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            logName = element.name;
                            streamName = element.stream;
                            sequenceToken = db.get("LOGGERS." + logName + "." + streamName + ".sequenceToken").value();
                            params = __assign({ logEvents: element.messages, logGroupName: logName, logStreamName: streamName }, (sequenceToken ? { sequenceToken: sequenceToken } : {}));
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, CloudWatchLogs.send(new client_cloudwatch_logs_1.PutLogEventsCommand(params))];
                        case 2:
                            data = _a.sent();
                            if (data.nextSequenceToken) {
                                db.set("LOGGERS." + logName + "." + streamName + ".sequenceToken", data.nextSequenceToken);
                            }
                            this.emit('finishSendMessage');
                            return [3 /*break*/, 4];
                        case 3:
                            error_1 = _a.sent();
                            if (/The specified log group does not exist/ig.test(error_1.stack)) {
                                return [2 /*return*/, this.emit('createLogGroup', element)];
                            }
                            if (/The specified log stream does not exist/ig.test(error_1.stack)) {
                                return [2 /*return*/, this.emit('createLogStream', element)];
                            }
                            str = error_1.message;
                            match = str.match(/\d{30,}/g);
                            sequence = /The next expected sequenceToken is/ig.test(str)
                                ? Array.isArray(match) ? match : null : [];
                            if ((Array.isArray(sequence) && sequence.length) || sequence === null) {
                                db.set("LOGGERS." + logName + "." + streamName + ".sequenceToken", Array.isArray(sequence) ? sequence[0] : sequence).write();
                                return [2 /*return*/, this.emit('sendMessage', element)];
                            }
                            if (/nextSequenceToken/ig.test(error_1.message) ||
                                /sequenceToken/ig.test(error_1.message)) {
                                this.emit('getToken', element);
                            }
                            else {
                                this.emit('error', 'IT WAS IMPOSSIBLE UPLOAD THE LOGS AWS', error_1);
                            }
                            return [3 /*break*/, 4];
                        case 4: return [2 /*return*/];
                    }
                });
            });
        });
        Loging.on('createLogGroup', function createLogGroup(element) {
            return __awaiter(this, void 0, void 0, function () {
                var error_2;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, CloudWatchLogs.send(new client_cloudwatch_logs_1.CreateLogGroupCommand({ logGroupName: element.name }))];
                        case 1:
                            _a.sent();
                            this.emit('sendMessage', element);
                            return [3 /*break*/, 3];
                        case 2:
                            error_2 = _a.sent();
                            if (error_2 && !(/log group already exists/ig.test(error_2.message))) {
                                this.emit('error', 'ERROR TRYING CREATE A LOG GROUP AWS', error_2);
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            });
        });
        Loging.on('createLogStream', function createLogStream(element) {
            return __awaiter(this, void 0, void 0, function () {
                var params, error_3;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            params = {
                                logGroupName: element.name,
                                logStreamName: element.stream
                            };
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, CloudWatchLogs.send(new client_cloudwatch_logs_1.CreateLogStreamCommand(params))];
                        case 2:
                            _a.sent();
                            this.emit('sendMessage', element);
                            return [3 /*break*/, 4];
                        case 3:
                            error_3 = _a.sent();
                            if (error_3 && !(/log stream already exists/ig.test(error_3.message))) {
                                this.emit('error', 'ERROR TO CREATE THE AWS LOGSTREAM', error_3);
                            }
                            return [3 /*break*/, 4];
                        case 4: return [2 /*return*/];
                    }
                });
            });
        });
        Loging.on('getToken', function getToken(element) {
            return __awaiter(this, void 0, void 0, function () {
                var logName, streamName, params, data, error_4;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            logName = element.name;
                            streamName = element.stream;
                            params = { logGroupName: logName, logStreamName: streamName };
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, CloudWatchLogs.send(new client_cloudwatch_logs_1.GetLogEventsCommand(params))];
                        case 2:
                            data = _a.sent();
                            if (data.nextForwardToken) {
                                db.set("LOGGERS." + logName + "." + streamName + ".sequenceToken", data.nextForwardToken).write();
                                this.emit('sendMessage', element);
                            }
                            return [3 /*break*/, 4];
                        case 3:
                            error_4 = _a.sent();
                            if (error_4) {
                                this.emit('error', 'TOKEN: IT WAS IMPOSSIBLE GET ANOTHER TOKEN AWS', error_4);
                            }
                            return [3 /*break*/, 4];
                        case 4: return [2 /*return*/];
                    }
                });
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