
## INSTALL
`npm i node-cloudwatchlogs`

## USE

First, you should set AWS credentials...
```js
const LOGGER = require('node-cloudwatchlogs')
LOGGER.setAWSKeys({
  region: process.env.REGION_AWS,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
})
```

Next, you can use the logger on anywhere call to package. Always you need to send the `group` and the `stream` names to send to AWS CloudWatchLogs, this is made by `config` method like example shows.
The _info_,_success_,_warning_ and _error_ methods shows with colors (_blue_,_green_,_yellow_ nad _red_ respectly) the logs in NodeJS and put this state in the AWS Logs.

```js
const Logger = require('node-cloudwatchlogs')
const logGroup1Stream1 = Logger.config(
  'TEST', // logs group
  `EXAMPLE 1`, // logs stream for each group
  {
    logger: { // to aws cloudt logs send
      maxLine: 10, // max numbers for lines in each log
      countMsgToSend: 20, // numbers of logs group to send (each 20 messages)
      maxLevel: 3 // objects depth to send
    },
    logConsole: { // logs for nodejs
      show: true, // if you want to show the logs in the node logs
      maxLine: 15, // max lines to show
      maxLevel: 2 // objects depth to show
    }
  }
)

const logGroup1Stream2 = Logger.config(
  'TEST', // logs group
  `EXAMPLE 2`, // logs stream for each group
)

const logGroup2Stream1 = Logger.config(
  'TEST1', // logs group
  `EXAMPLE 1`, // logs stream for each group
)

const logGroup2Stream2 = Logger.config(
  'TEST1', // logs group
  `EXAMPLE 2`, // logs stream for each group
)

logGroup1Stream1.info('EXAMPLE VOCALS', 'A' )
logGroup1Stream1.info('EXAMPLE VOCALS', 'B' )
logGroup1Stream1.error('EXAMPLE VOCALS', 'C' )
logGroup1Stream2.error('EXAMPLE VOCALS', 'D' )
logGroup1Stream2.error('EXAMPLE VOCALS', 'E' )
logGroup1Stream2.warning('EXAMPLE VOCALS', 'F' )

setTimeout(() => {
  logGroup1Stream1.warning('EXAMPLE VOCALS', 'G')
  logGroup1Stream1.warning('EXAMPLE VOCALS', 'H')
  logGroup1Stream1.success('EXAMPLE VOCALS', 'I')
  logGroup1Stream1.success('EXAMPLE VOCALS', 'J')
  logGroup1Stream2.success('EXAMPLE VOCALS', 'K')
  logGroup1Stream2.success('EXAMPLE VOCALS', 'L')
  logGroup1Stream2.success('EXAMPLE VOCALS', 'M')
}, 5000)

setTimeout(() => {
  logGroup2Stream1.info('EXAMPLE WHIT NUMBERS', 1)
  logGroup2Stream1.info('EXAMPLE WHIT NUMBERS', 2)
  logGroup2Stream1.info('EXAMPLE WHIT NUMBERS', 3)
  logGroup2Stream2.error('EXAMPLE WHIT NUMBERS', 4)
  logGroup2Stream2.error('EXAMPLE WHIT NUMBERS', 5)
  logGroup2Stream2.error('EXAMPLE WHIT NUMBERS', 6)
}, 8000)

setTimeout(() => {
  logGroup2Stream1.warning('EXAMPLE WHIT NUMBERS', 7)
  logGroup2Stream1.warning('EXAMPLE WHIT NUMBERS', 8)
  logGroup2Stream1.warning('EXAMPLE WHIT NUMBERS', 9)
  logGroup2Stream2.success('EXAMPLE WHIT NUMBERS', 10)
  logGroup2Stream2.success('EXAMPLE WHIT NUMBERS', 11)
}, 9000)

```
#### NodeJS Logs
![NODEJS LOGS](https://github.com/fortil/node-cloudwatchlogs/blob/master/img/captura.JPG)

### AWS groups
![GROUPS AWS LOGS](https://github.com/fortil/node-cloudwatchlogs/blob/master/img/captura2.JPG)

### AWS streams for a group
![STREAMS FOR A GROUP AWS LOGS](https://github.com/fortil/node-cloudwatchlogs/blob/master/img/captura3.JPG)
