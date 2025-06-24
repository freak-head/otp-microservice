import winston from 'winston';
import { config } from '../config';
import { asyncContext } from './asyncContext';

const { combine, timestamp, json, printf, colorize } = winston.format;

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const level = () => (config.env === 'development' ? 'debug' : 'warn');

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};
winston.addColors(colors);


const customFormat = printf(({ level, message, timestamp }) => {
  const store = asyncContext.getStore();
  const correlationId = store ? store.correlationId : 'system';
  return `[${timestamp}] [${correlationId}] ${level}: ${message}`;
});

const devFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  colorize({ all: true }),
  customFormat
);

const prodFormat = combine(timestamp(), json(), customFormat);

const format = config.env === 'production' ? prodFormat : devFormat;

const transports = [new winston.transports.Console()];

export const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
});