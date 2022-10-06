import {TwitchChatListener} from "./Twitch.js";
import {CommandManager} from "./CommandManager.js";
import Keybinds from "./Keybinds.js";
import Config from "./Config.js";
import GameManager from "./GameManager.js";
import asyncTimers from "node:timers/promises";
import logs from "./Logs.js";

import "./Utils.js";

(async () => {
    if (process.argv.includes('--coordinates')) {
        Keybinds.init();
        Keybinds.start();
        Keybinds.on("LMB", (e) => {
            console.log(e.x, e.y);
        });
    } else {
        await logs.init();
        await GameManager.createDefaultAvailableCommandsFile();
        await Config.createGameConfigFolder();
        if (!Config.existsConfig()) {
            await Config.createDefaultConfig();
            await logs.log("The default config has been created. Please change the options and then restart the program.");
            await logs.log("Exiting in 5 seconds...");
            await asyncTimers.setTimeout(5000);
            process.exit(0);
            return;
        }
        await Config.init();
        Keybinds.onAction("stop", () => {
            GameManager.commandManager.toggleAll(false);
            GameManager.reset();
        });
        Keybinds.init();
        Keybinds.start();
        await GameManager.load(<string>Config.getValue("game"));
        const cmdManager = GameManager.commandManager;
        const listener = new TwitchChatListener();
        await listener.connect(<string>Config.getValue("channel"));
        cmdManager.appendChatListener(listener);
        await logs.log("\x1b[32mTwitchPlays was successfully started");
    }
})();
