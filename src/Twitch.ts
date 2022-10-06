import {ChatClient} from "@twurple/chat";

export class TwitchChatListener {
    protected client: ChatClient;
    protected listeners: Map<string, Set<Function>> = new Map();

    constructor() {

    }

    async connect(channel: string) {
        if (this.client) await this.client.quit();
        if (channel === undefined || channel === null) {
            this.client = undefined;
            return;
        }
        this.client = new ChatClient({
            readOnly: true,
            channels: [channel]
        });
        this.client.onConnect(() => {
            console.log(`Successfully connected to ${channel}'s chat`);
        });
        await this.client.connect();
        this.client.onMessage((channel, user, message, msg) => {
            if (message.length <= 0 || message.length > 128) return;
            let command = message.trim().toLowerCase();
            const isCommand = command.startsWith("!");
            if (command.startsWith("!")) command = command.substring(1).trim();
            if (msg.userInfo.isBroadcaster && isCommand) {
                const commands = command.split(/\s+/ig);
                this.emit("hostcommand", command, commands);
                return;
            }
            if (message.length > 0 && message.length <= 32) this.emit('command', message.trim().toLowerCase());
        });
    }

    on(event: "command", callback: (command: string) => void): this;
    on(event: "hostcommand", callback: (command: string, args: string[]) => void): this;
    on(event: string, callback: Function): this {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
        return this;
    }
    off(event: string, callback: Function): this {
        if (!this.listeners.has(event)) return this;
        this.listeners.get(event).delete(callback);
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
}
