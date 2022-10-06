import { TwitchChatListener } from "./Twitch.js";
import logs from "./Logs.js";

export type CommandOptions = {threshold?: number, timeout?: number, wait?: number, subsOnly?: boolean, enabledOnStart?: boolean};

export class CommandManager {
    protected commands: Map<string, boolean> = new Map();
    protected commandGroups: Map<string, Set<string>> = new Map();
    protected commandThreshold: number = 0;
    protected commandTimeout: number = 5;
    protected commandWait: number = 0;
    protected pendingCommands: Map<string, number> = new Map<string, number>();
    protected pendingTimestampCommands: Map<string, number> = new Map<string, number>();
    protected lastExecutedTimestamps: Map<string, number> = new Map<string, number>();
    protected _commandListCache: readonly string[] = [];
    protected _commandGroupListCache: Record<string, readonly string[]> = {};
    protected commandOptions: Map<string, CommandOptions> = new Map();

    protected listeners: Map<string, Set<Function>> = new Map();

    constructor() {

    }

    get commandList(): readonly string[] {
        return this._commandListCache;
    }

    getEnabledCommands(): string[] {
        const commands: string[] = [];
        for (const [command, enabled] of this.commands) {
            if (enabled) commands.push(command);
        }
        return commands;
    }
    getCommandLists(): Record<string,readonly string[]> {
        return this._commandGroupListCache;
    }

    registerCommand(command: string, group?: string, options?: CommandOptions): this {
        this.commands.set(command, false);
        if (group !== undefined) this.addToGroup(group, command);
        this.toggleCommand(command, false);
        this._commandListCache = Object.freeze(Array.from(this.commands.keys()));
        this._commandGroupListCache = {};
        for (let group of this.commandGroups) this._commandGroupListCache[group[0]] = Object.freeze(Array.from(group[1]));
        if (options !== undefined) this.commandOptions.set(command, Object.assign({}, options));
        else this.commandOptions.set(command, {});
        return this;
    }
    addToGroup(group: string, ...commands: string[]): this {
        if (!this.commandGroups.has(group)) {
            this.commandGroups.set(group, new Set());
        }
        const grp = this.commandGroups.get(group);
        for (const command of commands) {
            grp.add(command);
        }
        this._commandGroupListCache = {};
        for (let group of this.commandGroups) this._commandGroupListCache[group[0]] = Object.freeze(Array.from(group[1]));
        return this;
    }
    toggleCommand(command: string, value?: boolean, callUpdate: boolean = true): this {
        if (!this.commands.has(command)) return this;
        this.pendingCommands.set(command, 0);
        this.pendingCommands.set(command, Date.now());
        this.lastExecutedTimestamps.set(command, 0);
        if (value === undefined) value = !this.commands.get(command);
        this.commands.set(command, value);
        if (callUpdate) this.emit("toggled");
        return this;
    }
    toggleGroup(group: string, value?: boolean, callUpdate: boolean = true): this {
        if (!this.commandGroups.has(group)) return this;
        const grp = this.commandGroups.get(group);
        for (const command of grp) {
            this.toggleCommand(command, value);
        }
        if (callUpdate) this.emit("toggled");
        return this;
    }
    toggleAll(value?: boolean): this {
        for (const command of this.commands.keys()) {
            this.toggleCommand(command, value, false);
        }
        this.emit("toggled");
        return this;
    }

    receivedCommand(command: string): this {
        if (!this.commands.get(command)) return this;
        const timeBetween = Date.now() - (this.lastExecutedTimestamps.get(command) ?? 0);
        if (timeBetween < (this.commandOptions.get(command)?.wait??this.commandWait)*1000) return this;
        let newValue = 1;
        const timeout = (this.commandOptions.get(command)?.timeout ?? this.commandTimeout) * 1000;
        const threshold = this.commandOptions.get(command)?.threshold ?? this.commandThreshold;
        if (this.pendingTimestampCommands.get(command) + timeout >= Date.now()) newValue = this.pendingCommands.get(command) + 1;
        if (newValue >= threshold) {
            this.emit("command", command);
            this.lastExecutedTimestamps.set(command, Date.now());
            newValue = 0;
        }
        this.pendingTimestampCommands.set(command, Date.now());
        this.pendingCommands.set(command, newValue);
        return this;
    }

    setCommandThreshold(value: number): this {
        this.commandThreshold = value;
        return this;
    }
    setCommandTimeout(value: number): this {
        this.commandTimeout = value;
        return this;
    }
    setCommandWait(value: number): this {
        this.commandWait = value;
        return this;
    }
    setCommandOptions(command: string, value: CommandOptions): this {
        this.commandOptions.set(command, Object.assign({}, value));
        return this;
    }

    on(event: "command", callback: (command: string) => void): this;
    on(event: "toggled", callback: () => void): this;
    on(event: "reset", callback: () => void): this;
    on(event: "stop", callback: () => void): this;
    on(event: "start", callback: () => void): this;
    on(event: string, callback: Function): this {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        const listeners = this.listeners.get(event);
        listeners.add(callback);
        return this;
    }
    off(event: string, callback: Function): this {
        if (!this.listeners.has(event)) return this;
        const listeners = this.listeners.get(event);
        listeners.delete(callback);
        return this;
    }
    emit(event: string, ...args: any[]): this {
        if (!this.listeners.has(event)) return this;
        const listeners = this.listeners.get(event);
        for (const listener of listeners) {
            listener(...args);
        }
        return this;
    }

    reset() {
        this.commands.clear();
        this.commandGroups.clear();
        this.pendingCommands.clear();
        this.pendingTimestampCommands.clear();
        this.lastExecutedTimestamps.clear();
        this.commandOptions.clear();
        this._commandListCache = [];
        this._commandGroupListCache = {};
        this.emit("toggled");
    }

    appendChatListener(twitch: TwitchChatListener) {
        twitch.on("command", (command, originalMessage) => {
            if (this.commandOptions.get(command)?.subsOnly && !originalMessage.userInfo.isSubscriber) return;
            this.receivedCommand(command);
        });
        twitch.on("hostcommand", (command, args) => {
            if (args[0] === "on" || args[0] === "off") {
                const v = args[0] === "on";
                if (!args[1]) {
                    this.toggleAll(v);
                    logs.log(`All commands ${v ? "enabled" : "disabled"}`);
                    return;
                }
                if (this.commandGroups.has(args[1])) {
                    this.toggleGroup(args[1], v);
                    logs.log(`Group ${args[1]} ${v ? "enabled" : "disabled"}`);
                    return;
                }
                if (this.commands.has(args[1])) {
                    this.toggleCommand(args[1], v);
                    logs.log(`Command ${args[1]} ${v ? "enabled" : "disabled"}`);
                    return;
                }
                return;
            }
            if (args[0] === "stop" || args[0] === "reset") {
                this.toggleAll(false);
                this.emit("stop");
                logs.log(`All commands disabled and state reset`);
                return;
            }
            if (args[0] === "start") {
                this.toggleAll(false);
                this.emit("start");
                for (const command of this.commandOptions.entries()) {
                    if (command[1].enabledOnStart) {
                        this.toggleCommand(command[0], true, false);
                        console.log("Enabled command by default: " + command[0]);
                    }
                }
                this.emit("toggled");
                logs.log(`Reset to level starting state`);
                return;
            }
        });
    }
}
