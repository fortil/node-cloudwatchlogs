"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require('dotenv').config();
var index_1 = __importDefault(require("../src/index"));
index_1.default.setAWSKeys({
    region: process.env.REGION_AWS,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});
index_1.default.setConfig({
    env: 'development',
    logger: {
        maxLine: 10,
        countMsgToSend: 20,
        maxLevel: 3 // objects depth to send
    },
    logConsole: {
        show: true,
        maxLine: 15,
        maxLevel: 2 // objects depth to show
    }
});
var logGroup1Stream1 = index_1.default.config('TEST', // logs group
"EXAMPLE 1" // logs stream for each group
);
var logGroup1Stream2 = index_1.default.config('TEST', // logs group
"EXAMPLE 2");
var logGroup2Stream1 = index_1.default.config('TEST1', // logs group
"EXAMPLE 1");
var logGroup2Stream2 = index_1.default.config('TEST1', // logs group
"EXAMPLE 2", // logs stream for each group
{
    environment: 'staging',
    logger: {
        maxLine: 10,
        countMsgToSend: 20,
        maxLevel: 3 // objects depth to send
    },
    logConsole: {
        show: true,
        maxLine: 15,
        maxLevel: 2 // objects depth to show
    }
});
logGroup1Stream1.info('EXAMPLE VOCALS', 'A');
logGroup1Stream1.info('EXAMPLE VOCALS', 'B');
logGroup1Stream1.error('EXAMPLE VOCALS', 'C');
logGroup1Stream2.error('EXAMPLE VOCALS', 'D');
logGroup1Stream2.error('EXAMPLE VOCALS', 'E');
logGroup1Stream2.warning('EXAMPLE VOCALS', 'F');
setTimeout(function () {
    logGroup1Stream1.warning('EXAMPLE VOCALS', 'G');
    logGroup1Stream1.warning('EXAMPLE VOCALS', 'H');
    logGroup1Stream1.success('EXAMPLE VOCALS', 'I');
    logGroup1Stream1.success('EXAMPLE VOCALS', 'J');
    logGroup1Stream2.success('EXAMPLE VOCALS', 'K');
    logGroup1Stream2.success('EXAMPLE VOCALS', 'L');
    logGroup1Stream2.success('EXAMPLE VOCALS', 'M');
}, 5000);
setTimeout(function () {
    logGroup2Stream1.info('EXAMPLE WHIT NUMBERS', 1);
    logGroup2Stream1.info('EXAMPLE WHIT NUMBERS', 2);
    logGroup2Stream1.info('EXAMPLE WHIT NUMBERS', 3);
    logGroup2Stream2.error('EXAMPLE WHIT NUMBERS', 4);
    logGroup2Stream2.error('EXAMPLE WHIT NUMBERS', 5);
    logGroup2Stream2.error('EXAMPLE WHIT NUMBERS', 6);
}, 8000);
setTimeout(function () {
    logGroup2Stream1.warning('EXAMPLE WHIT NUMBERS', 7);
    logGroup2Stream1.warning('EXAMPLE WHIT NUMBERS', 8);
    logGroup2Stream1.warning('EXAMPLE WHIT NUMBERS', 9);
    logGroup2Stream2.success('EXAMPLE WHIT NUMBERS', 10);
    logGroup2Stream2.success('EXAMPLE WHIT NUMBERS', 11);
}, 9000);
require('net').createServer().listen();
//# sourceMappingURL=example.js.map