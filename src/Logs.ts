import fs from "node:fs/promises";
import fss from "node:fs";
import path from "node:path";
import util from "node:util";

export const VERSION = "1.0.0-alpha";

const logPath = path.join(process.cwd(), "latest.log");
const prevlogPath = path.join(process.cwd(), "previous.log");

export async function init() {
    try {
        await fs.rename(logPath, prevlogPath);
    } catch {}
    await writeToLog(`TwitchPlays v${VERSION}`);
}

export function getTimestamp(): string {
    const date = new Date();
    return `${date.getUTCDate().toString().padStart(2, '0')}/${(date.getUTCMonth() + 1).toString().padStart(2, '0')}/${date.getUTCFullYear().toString().padStart(4, '0')} ${date.getUTCHours().toString().padStart(2, '0')}:${date.getUTCMinutes().toString().padStart(2, '0')}:${date.getUTCSeconds().toString().padStart(2, '0')}`;
}

export async function writeToLog(message: string, type: string = "info") {
    if (message.includes(`\x1b`)) message = message.replaceAll(/\x1b\[[0-9;]*m/g, "");
    await fs.appendFile(logPath, `[${getTimestamp()}] [${type.toUpperCase()}] ${message}\n`);
}

function processMessage(...args: any[]): string {
    let message = util.formatWithOptions({colors: true}, ...args);
    if (message.includes(`\x1b`) && !message.endsWith("\x1b[0m")) message += "\x1b[0m";
    return message;
}

export async function log(...args: any[]) {
    const message = processMessage(...args);
    console.log(message);
    await writeToLog(message, "info");
}

export async function error(...args: any[]) {
    const message = processMessage(...args);
    console.error(message);
    await writeToLog(message, "error");
}

export * as default from "./Logs.js";
