type LogLevel = "info" | "warn" | "error";

type LogFields = Record<string, unknown>;

function write(level: LogLevel, event: string, fields: LogFields = {}) {
  const payload = {
    level,
    event,
    time: new Date().toISOString(),
    ...fields,
  };

  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (event: string, fields?: LogFields) => write("info", event, fields),
  warn: (event: string, fields?: LogFields) => write("warn", event, fields),
  error: (event: string, fields?: LogFields) => write("error", event, fields),
};

export function captureError(error: unknown, context: LogFields = {}) {
  logger.error("error.captured", {
    ...context,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
}
