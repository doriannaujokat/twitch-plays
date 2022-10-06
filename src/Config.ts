import fs from "node:fs/promises";
import fss from "node:fs";
import path from "node:path";
import { CommandOptions } from "./CommandManager.js";

const defaultConfig: Config = Object.freeze({
    channel: "twitch",
    threshold: 4,
    timeout: 2,
    wait: 0,
    game: "none",
    groupCommandsInFile: true,
});

export interface CommonConfig {
    threshold: number;
    timeout: number;
    wait: number;
}

export interface Config extends CommonConfig {
    channel: string;
    game: string;
    debug?: boolean;
    groupCommandsInFile?: boolean;
}

export interface GameConfig extends CommonConfig {
    commands: Record<string, CommandOptions>;
    positions: Record<string, {x: number, y: number}>;
}

const listeners: Set<(config: Config) => void> = new Set();
let config: Config = undefined;
const configPath = path.join(process.cwd(), "config.json");
let abortController: AbortController;

export function watch() {
    if (abortController) abortController.abort();
    abortController = new AbortController();
    const watcher = fss.watch(configPath, {signal: abortController.signal});
    watcher.on("change", configChange);
}
export function unwatch() {
    abortController.abort();
    abortController = undefined;
}

async function configChange() {
    await loadConfig();
}

export function existsConfig() {
    return fss.existsSync(configPath);
}
export async function createDefaultConfig() {
    return await fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 4));
}

export async function loadConfig() {
    if (!existsConfig()) {
        await createDefaultConfig();
    }
    try {
        const file = await fs.readFile(configPath, {encoding: "utf-8", flag: "r"});
        config = Object.deepMerge(Object.assign({}, defaultConfig), JSON.parse(file));
    } catch (e) {
        console.error(e);
        config = undefined;
    } finally {
        for (const listener of listeners) {
            listener(config);
        }
    }
}

export async function createGameConfigFolder() {
    try {
        await fs.mkdir(path.join(process.cwd(), "config"), {});
    } catch {}
}

export function on(callback: (config: Config) => void) {
    listeners.add(callback);
}
export function off(callback: () => void) {
    listeners.delete(callback);
}

export async function init() {
    await loadConfig();
    //watch();
}

export function getValue(id: keyof Config) {
    return config?.[id] ?? null;
}

export * as default from "./Config.js";
