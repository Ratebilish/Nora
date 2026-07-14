import { REST, Routes } from "discord.js";
import fs from "node:fs";
import { appId, token } from "./auth.json";
import { guildID } from "./utils/globals";

// discord.js v14: REST и Routes теперь из основного пакета discord.js
// API версия v10 используется по умолчанию

const disabledCommands: string[] = [];
const commands: any[] = [];
const commandFiles = fs
  .readdirSync(__dirname + "/commandData")
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(`./commandData/${file}`);
  const cmdData = command.default || command;
  if (!disabledCommands.includes(cmdData.name)) commands.push(cmdData.toJSON());
}

const rest = new REST({ version: "10" }).setToken(token);

rest
  .put(
    Routes.applicationGuildCommands(appId, guildID),
    {
      body: commands,
    }
  )
  .then(() => console.log("------> Commands registered"))
  .catch((err) => {
    console.log(err);
  });
