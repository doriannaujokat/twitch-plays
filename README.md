# TwitchPlays

This project allows a streamer to let their Twitch chat control the game.

## Setup
1. Download the [latest release](https://github.com/doriannaujokat/twitch-plays/releases)
2. Extract the zip file and execute the program once. A config file should have been created.
3. Open the config file and edit its contents. You need to at least change the `channel` and `game` fields. More info on the fields and their meaning can be found [here](#config).

## Config
| Field     | Type    | Default  | Description                                                                                                                                        |
|-----------|---------|----------|----------------------------------------------------------------------------------------------------------------------------------------------------|
| channel   | string  | "twitch" | Your channel name. The same as `https://twitch.tv/{channel}`                                                                                       |
| game      | string  | "none"   | The game you are playing. This has to be equal to the filename of the `.js` file in the `game` folder.                                             |
| threshold | integer | 4        | The amount of people having to execute the same command, with each execution being at max `timeout` seconds apart, for it to be actually executed. |
| timeout   | number  | 2        | The maximum time in seconds between two people executing a command for it to still be counted. After it expires, the count resets.                 |

## Displaying commands in OBS
The currently active commands can be shown in OBS by using a Text Source. Please note that there will be a slight delay between command changes and them being displayed.

1. Create a file named `currentcommands.txt` in the folder of the executable. If it already exists, skip this step.
2. Add a Text Source to your scene in OBS.
3. Enable `Read from file` in the source's options and select the `currentcommands.txt` file.
4. If the TwitchPlays program is currently not running, you can put some dummy data in the file. It should follow the format `command1, command2, command3, ...`.
5. Style the source the way you want it to appear.
6. You can now start the TwitchPlays program. It will automatically update the file, displaying the currently available commands on stream.

## How to use
1. Start the program.
2. The program will automatically connect to Twitch and start reading the chat.
3. Start the game you want to play and start the level.
4. Enable specific commands using the host command. More [here](#commands).
5. Your Twitch chat can now use the enabled commands.
6. To close the program, either close the console window or press `CTRL + C` with the console window focused.

## Commands
Game commands are added by the `{game}.js` file and therefore can not be mentioned here.
They are always case-insensitive and can be used with or without a leading `!`.

There are however some commands that are always available to the host. They have to be prefixed with a `!`.
1. `!on {command or command group}` Enables a command or command group. If no command or group is specified, all commands will be enabled.
2. `!off {command or command group}` Disables a command or command group. If no command or group is specified, all commands will be disabled.
3. `!stop` or `!reset` - Disables all commands, clears the command queue and tells the `{game}.js` file to reset its state. This should be used if the level is changed or reset, or if the game was quit.

You can also force the program to reset by pressing `CTRL + ALT + ESCAPE`.

## Demonstration
A demonstration video of TwitchPlays in action (Game: FNAF) can be found [here](https://www.youtube.com/watch?v=-KEETxQRCaA).
Keep in mind that at the time of the video, a bug existed that prevented the right light from being used when to door was closed. This has since been fixed.
