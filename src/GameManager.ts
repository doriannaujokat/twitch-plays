import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import asyncTimers from "node:timers/promises";
import {CommandManager} from "./CommandManager.js";
import robotjs from "robotjs";
import fss from "node:fs";
import logs from "./Logs.js";
import Config from "./Config.js";

export const commandManager = new CommandManager();
commandManager.on("command", onCommand);
commandManager.on("stop", reset);
commandManager.on("toggled", () => availabilityChanged());

export type CommandQueueItem = {type: "click", x: number, y: number, delay?: number} | {type: "pos"|"move", x: number, y: number} | {type: "delay", ms: number};

let game: string;
let gameConfig: {};
const listener: Map<string, Set<Function>> = new Map();
let resetCallback: Function;
let timeouts: Set<NodeJS.Timeout> = new Set();
let commandQueue: CommandQueueItem[] = [];
let processingQueue = false;
let currentKeys: Set<string> = new Set();

let currentlyAvailableCommands: string[] = [];

class GameContext {
    readonly console = global.console;

    addToGroup(group: string, ...commands: string[]) {
        commandManager.addToGroup(group, ...commands);
    }
    reset(callback: Function) {
        resetCallback = callback
    }
    command(command: string, callback: () => void) {
        if (!game) return;
        commandManager.registerCommand(command);
        if (!listener.has(command)) listener.set(command, new Set());
        listener.get(command).add(callback);
    }
    get config() {
        return gameConfig;
    }
    setTimeout(callback: () => void, ms: number) {
        const id = setTimeout(callback, ms);
        id.unref();
        timeouts.add(id);
        return id;
    }
    execute(command: CommandQueueItem) {
        commandQueue.push(command);
        if (!processingQueue) processQueueItem();
    }
    availabilityChanged(commands: string[]) {
        currentlyAvailableCommands = commands;
        availabilityChanged();
    }
    defaultConfig(config) {
        gameConfig = config;
    }
}

let updatingAvailability = false;
let needsAvailabilityUpdate = false;
async function availabilityChanged() {
    if (updatingAvailability) {
        needsAvailabilityUpdate = true;
        return;
    }
    updatingAvailability = true;
    let commands = [];
    const enabledCommands = commandManager.getEnabledCommands();
    for (const command of currentlyAvailableCommands) {
        if (enabledCommands.includes(command)) commands.push(command);
    }
    await saveCurrentlyAvailableCommands(commands);
    updatingAvailability = false;
    if (needsAvailabilityUpdate) {
        needsAvailabilityUpdate = false;
        availabilityChanged();
    }
}

async function processQueueItem() {
    if (processingQueue) return;
    processingQueue = true;
    const item = commandQueue.shift();
    if (item) {
        if (item.type === "delay") await asyncTimers.setTimeout(item.ms);
        if (item.type === "click" && item.delay !== undefined) robotjs.setMouseDelay(item.delay);
        else robotjs.setMouseDelay(10);
        if (item.type === "pos" || item.type === "click") robotjs.moveMouse(item.x, item.y);
        if (item.type === "click") robotjs.mouseClick();
        if (item.type === "move") robotjs.moveMouseSmooth(item.x, item.y, 1.75);
    }
    if (commandQueue.length > 0) setImmediate(processQueueItem);
    processingQueue = false;
    return;
}

function onCommand(command: string) {
    if (!listener.has(command)) return;
    const listeners = listener.get(command);
    for (const callback of listeners) {
        callback();
    }
}

const context = vm.createContext(new GameContext(), {})

export async function load(g: string) {
    if (game !== undefined) await unload();
    game = g;
    gameConfig = {};
    try {
        const file = await fs.readFile(path.join(process.cwd(),'game', `${game}.js`), {encoding: "utf-8", flag: "r"});
        vm.runInContext(file, context);
        reset();
    } catch (e) {
        if (e.code !== "ENOENT") await logs.error(e);
        unload();
        await logs.log("\x1b[31mNo game loaded!");
        return;
    }
    try {
        const file = await fs.readFile(path.join(process.cwd(), "config", `${game}.json`), {encoding: "utf-8", flag: "r"});
        const loadedGameConfig = JSON.parse(file);
        gameConfig = Object.assign(gameConfig, loadedGameConfig);
    } catch (e) {
        if (e.code !== "ENOENT") await logs.error(e);
    }
}

async function saveCurrentlyAvailableCommands(commands: string[]) {
    let _contents;
    if (Config.getValue("groupCommandsInFile")) {
        _contents = {};
        const commandGroups = commandManager.getCommandLists();
        for (let command of commands) {
            let added = false;
            for (let group of Object.keys(commandGroups)) {
                let groupCommands = commandGroups[group];
                if (groupCommands.includes(command)) {
                    if (!_contents[group]) _contents[group] = [];
                    _contents[group].push(command);
                    added = true;
                    break;
                }
            }
            if (!added) {
                if (!_contents["other"]) _contents["other"] = [];
                _contents["other"].push(command);
            }
        }
        _contents = Object.entries(<Record<string,string[]>>_contents).map(([group, commands]) => `${group.toUpperCase()}: ${commands.join(", ")}`).join("\n");
    } else _contents = commands.join(", ");
    await fs.writeFile(path.join(process.cwd(), "currentcommands.txt"), _contents);
}
export async function createDefaultAvailableCommandsFile() {
    if (fss.existsSync(path.join(process.cwd(), "currentcommands.txt"))) return;
    await saveCurrentlyAvailableCommands([]);
}

function clearTimeouts() {
    for (const timeout of timeouts) {
        clearTimeout(timeout);
    }
    timeouts.clear();
}

function clearQueue() {
    commandQueue.splice(0, commandQueue.length);
}

export function unload() {
    clearTimeouts();
    clearQueue();
    listener.clear();
    commandManager.reset();
    game = undefined;
    gameConfig = undefined;
    currentlyAvailableCommands = [];
}

export function reset() {
    clearTimeouts();
    clearQueue();
    if (resetCallback) resetCallback();
}

export * as default from "./GameManager.js";
