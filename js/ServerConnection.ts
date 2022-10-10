

export class ServerConnection {
    private ws: WebSocket;
    private reconnectTimeout: number;
    private listener: Map<string, Set<Function>> = new Map();
    private url: URL;

    private serverVersion: number;

    public constructor() {

    }

    public get VERSION() {
        return this.serverVersion;
    }

    public setURL(url: string): this {
        if (url === undefined || url === "") url = "127.0.0.1";
        const parts = url.split(":");
        this.url = new URL(`ws://${parts[0]}:${parts[1]??"62463"}`);
        return this;
    }

    public connect(): this {
        if (this.ws) this.disconnect();
        if (!this.url) throw new Error("No URL set");
        try {
            this.ws = new WebSocket(this.url.toString());
        } catch (e) {
            if (e instanceof DOMException) {
                if (e.name === "SecurityError") {
                    const insecurl = new URL(window.location.href);
                    insecurl.protocol = "http";
                    window.location.replace(insecurl);
                }
            }
        }
        this.ws.addEventListener('message', (event) => {
            if (this.serverVersion === undefined) {
                const version = event.data.toString();
                if (version.startsWith("TwitchPlays/")) {
                    this.serverVersion = parseInt(version.substring(12));
                }
                return;
            }
            if (event.data.toString().startsWith("commands/")) {
                this.emit("commands", JSON.parse(event.data.toString().substring(9)));
                return;
            }
            if (event.data.toString().startsWith("userconfig/")) {
                this.emit("get","userconfig", JSON.parse(event.data.toString().substring(11)));
                return;
            }
            if (event.data.toString().startsWith("defaultconfig/")) {
                this.emit("get","defaultconfig", JSON.parse(event.data.toString().substring(14)));
                return;
            }
            if (event.data.toString().startsWith("send/")) {
                const type = event.data.toString().substring(5);
                const name = type.substring(0, type.indexOf("/"));
                this.emit("get", name, JSON.parse(type.substring(name.length + 1)));
                return;
            }
            console.log(event.data);
        });
        this.ws.addEventListener('error', (event) => {

        }, {capture: true});
        this.ws.addEventListener('open', (event) => {
            this.emit('connect');
        });
        this.ws.addEventListener('close', (event) => {
            this.emit('disconnect');
            this.reconnectTimeout = setTimeout(() => this.reconnect(), 2000);
        }, {capture: true});
        return this;
    }
    private reconnect() {
        if (this.reconnectTimeout !== undefined) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = undefined;
        }
        this.connect();
    }
    public disconnect(): this {
        if (this.reconnectTimeout !== undefined) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = undefined;
        }
        if (this.ws) {
            this.ws.close();
            this.ws = undefined;
        }
        return;
    }
    public send(message: string): boolean {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(message);
            return true;
        }
        return false;
    }

    public on(event: "connect", callback: () => void);
    public on(event: "disconnect", callback: () => void);
    public on(event: "get", callback: (name: string, data: string) => void);
    public on(event: "commands", callback: (commands: Record<string,{enabled: boolean, groups: string[]}>) => void);
    public on(event: string, callback: (...args: any[]) => void): this {
        if (!this.listener.has(event)) this.listener.set(event, new Set());
        this.listener.get(event).add(callback);
        return this;
    }
    public off(event: string, callback: () => void): this {
        this.listener.get(event)?.delete(callback);
        return this;
    }
    private emit(event: string, ...args: any[]) {
        this.listener.get(event)?.forEach((callback) => callback(...args));
    }
}
