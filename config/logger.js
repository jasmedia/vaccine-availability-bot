const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, prettyPrint, printf } = format;

const myFormat = printf(({ level, message, label, timestamp }) => {
    return `${timestamp} [${label}] ${level}: ${message}`;
});

const logger = createLogger({
    level: 'info',
    format: combine(
        timestamp(),
        label({ label: 'VACCINE AVAILABILITY' }),
        myFormat
    ),
    // defaultMeta: { service: 'VACCINE AVAILABILITY' },
    transports: [
        //
        // - Write all logs with level `error` and below to `error.log`
        // - Write all logs with level `info` and below to `combined.log`
        //
        new transports.File({ filename: 'error.log', level: 'error' }),
        new transports.File({ filename: 'combined.log' }),
    ],
});

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
if (process.env.NODE_ENV !== 'production') {
    logger.add(new transports.Console({
        format: format.combine(
            format.colorize({
                all: true
            }),
        )
    }));
}

module.exports = logger;