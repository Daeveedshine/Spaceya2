export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  ACTION = 'ACTION'
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  details?: any;
}

class CentralLogger {
  private log(level: LogLevel, message: string, details?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(details !== undefined && { details })
    };

    const formattedLog = `[${entry.timestamp}] [${entry.level}] ${entry.message}`;

    switch (level) {
      case LogLevel.INFO:
      case LogLevel.ACTION:
        console.log(formattedLog, details || '');
        break;
      case LogLevel.WARN:
        console.warn(formattedLog, details || '');
        break;
      case LogLevel.ERROR:
        console.error(formattedLog, details || '');
        break;
    }

    // Here we can securely send log entries to an external logging service (e.g. Sentry, Datadog)
    // if configured via environment variables.
  }

  info(message: string, details?: any) {
    this.log(LogLevel.INFO, message, details);
  }

  warn(message: string, details?: any) {
    this.log(LogLevel.WARN, message, details);
  }

  error(message: string, error?: any) {
    this.log(LogLevel.ERROR, message, error);
  }

  action(actionName: string, details?: any) {
    this.log(LogLevel.ACTION, `USER_ACTION: ${actionName}`, details);
  }
}

export const logger = new CentralLogger();
