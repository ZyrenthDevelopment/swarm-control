import { Config } from "common/types";
import { app } from "../index";
import { sendPubSubMessage } from "../util/pubsub";
import { strToU8, compressSync, strFromU8 } from "fflate";
import { getBannedUsers } from "../util/db";
import { asyncCatch } from "../util/middleware";

let activeConfig: Config | undefined;
let configData: Config | undefined;

const gistUrl = "https://raw.githubusercontent.com/VedalAI/swarm-control/main/config.json";

async function fetchConfig(): Promise<Config> {
    const url = `${gistUrl}?${Date.now()}`;

    try {
        const response = await fetch(url);
        const data: Config = await response.json();

        data.banned = await getBannedUsers();

        return data;
    } catch (e: any) {
        console.error("Error when fetching config");
        console.error(e);

        return {
            version: -1,
            message: "Error when fetching config",
        };
    }
}

function processConfig(data: Config) {
    const config: Config = JSON.parse(JSON.stringify(data));
    if (!ingameState) {
        Object.values(config.redeems!)
            .forEach((redeem) => (redeem.disabled = true));
    }
    return config;
}

export async function getConfig(): Promise<Config> {
    if (!configData) {
        await refreshConfig();
    }

    return activeConfig!;
}

export async function setActiveConfig(data: Config) {
    activeConfig = processConfig(data);
    broadcastConfigRefresh(activeConfig);
}

export async function broadcastConfigRefresh(config: Config) {
    return sendPubSubMessage({
        type: "config_refreshed",
        data: strFromU8(compressSync(strToU8(JSON.stringify(config))), true),
    });
}

let ingameState: boolean = false;

export function isIngame() {
    return ingameState;
}

export function setIngame(newIngame: boolean) {
    if (ingameState == newIngame) return;
    ingameState = newIngame;
    setActiveConfig(configData!);
}

async function refreshConfig() {
    configData = await fetchConfig();
    activeConfig = processConfig(configData);
}

app.get("/private/refresh", asyncCatch(async (_, res) => {
    await refreshConfig();
    console.log("Refreshed config, new config version is ", activeConfig!.version);
    await broadcastConfigRefresh(activeConfig!);
    res.sendStatus(200);
}));

app.get("/public/config", asyncCatch(async (req, res) => {
    const config = await getConfig();
    res.send(JSON.stringify(config));
}));

(async () => {
    const config = await getConfig();
    await broadcastConfigRefresh(config);
})().then();
