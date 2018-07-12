'use strict';
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, printf } = format;

const myFormat = printf(info => {
    return `${info.timestamp} [${info.label}] ${info.level}: ${info.message}`;
});

const logger = createLogger({
    transports: [
        new transports.Console(),
    ],
    exitOnError: false,
    format: combine(
        label({ label: 'canvas-sdk'}),
        timestamp(),
        myFormat
    ),
    level: process.env.LOG_LEVEL || 'debug',
    levels: {
        error: 0,
        warn: 1,
        info: 2,
        debug: 3,
    }
});

module.exports = logger;