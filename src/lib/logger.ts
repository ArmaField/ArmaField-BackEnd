import fs from "fs";
import path from "path";

const logDir = path.join(process.cwd(), "data", "logs");
const logFile = path.join(logDir, "app.log");

// Ensure log directory exists
try {
  fs.mkdirSync(logDir, { recursive: true });
} catch {
  // Ignore
}

type LogLevel = "info" | "warn" | "error";

const LEVEL_NUM: Record<LogLevel, number> = {
  info: 30,
  warn: 40,
  error: 50,
};

function log(level: LogLevel, data: Record<string, unknown>, msg: string) {
  const entry = {
    level: LEVEL_NUM[level],
    time: Date.now(),
    msg,
    ...data,
  };

  const line = JSON.stringify(entry) + "\n";

  // Write to stdout
  process.stdout.write(line);

  // Write to file
  try {
    fs.appendFileSync(logFile, line);
  } catch {
    // Ignore file write errors
  }
}

export const logger = {
  info: (data: Record<string, unknown>, msg: string) => log("info", data, msg),
  warn: (data: Record<string, unknown>, msg: string) => log("warn", data, msg),
  error: (data: Record<string, unknown>, msg: string) => log("error", data, msg),
};
