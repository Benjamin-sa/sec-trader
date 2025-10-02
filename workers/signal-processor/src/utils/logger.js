/**
 * Simple logger utility for structured logging
 */
export class Logger {
  constructor(context, env) {
    this.context = context;
    this.env = env;
  }

  log(level, message, data = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      message,
      ...data,
    };

    // In production, you might want to send logs to an external service
    // For now, just console.log
    console.log(JSON.stringify(logEntry));
  }

  info(message, data = {}) {
    this.log("INFO", message, data);
  }

  warn(message, data = {}) {
    this.log("WARN", message, data);
  }

  error(message, data = {}) {
    this.log("ERROR", message, data);
  }

  debug(message, data = {}) {
    if (this.env?.ENVIRONMENT !== "production") {
      this.log("DEBUG", message, data);
    }
  }
}
