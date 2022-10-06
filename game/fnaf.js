let lopen = true;
let ropen = true;
let campup = false;
let isright = false;
let llon = false;
let rlon = false;

const DEFAULT = {
    positions: {
        idle: {x: 546, y: 450},
        ldoor: {x: 53, y: 342},
        rdoor: {x: 1210, y: 355},
        llight: {x: 54, y: 456},
        rlight: {x: 1225, y: 464},
        boop: {x: 676, y: 239},
        cams: {x: 553, y: 701},
        cam1a: {x: 971, y: 352},
        cam1c: {x: 933, y: 486},
        cam2b: {x: 978, y: 642},
        cam4b: {x: 1089, y: 646},
        cam6: {x: 1187, y: 571},
    }
}
defaultConfig(DEFAULT);

function getPosition(name) {
    return config.positions[name]??DEFAULT.positions[name];
}

function returnToIdle() {
    const IDLE = getPosition("idle");
    execute({type: "pos", x: IDLE.x, y: IDLE.y});
}
function ldoorClick() {
    const LDOOR = getPosition("ldoor");
    execute({type: "click", x: LDOOR.x, y: LDOOR.y, delay: isright ? 750 : 100});
    isright = false;
}
function rdoorClick() {
    const RDOOR = getPosition("rdoor");
    execute({type: "click", x: RDOOR.x, y: RDOOR.y, delay: isright ? 100 : 750});
    isright = true;
}
command("lopen", () => {
    if (lopen || campup) return;
    ldoorClick();
    lopen = true;
    updateCommandsList();
});
command("lclose", function () {
    if (!lopen || campup) return;
    ldoorClick();
    lopen = false;
    updateCommandsList();
});
command("ropen", () => {
    if (ropen || campup) return;
    rdoorClick();
    ropen = true;
    updateCommandsList();
});
command("rclose", function () {
    if (!ropen || campup) return;
    rdoorClick();
    ropen = false;
    updateCommandsList();
});
command("llight", function () {
    if (campup) return;
    const LLIGHT = getPosition("llight");
    execute({type: "click", x: LLIGHT.x, y: LLIGHT.y, delay: isright ? 750 : 100});
    isright = false;
    llon = !llon;
    rlon = false;
});
command("rlight", function () {
    if (campup) return;
    const RLIGHT = getPosition("rlight");
    execute({type: "click", x: RLIGHT.x, y: RLIGHT.y, delay: isright ? 100 : 750});
    isright = true;
    rlon = !rlon;
    llon = false;
});
command("boop", function () {
    if (campup) return;
    if (isright) {
        const LDOOR = getPosition("ldoor");
        execute({type: "pos", x: LDOOR.x, y: LDOOR.y});
        execute({type: "delay", ms: 750});
    }
    const BOOP = getPosition("boop");
    execute({type: "click", x: BOOP.x, y: BOOP.y, delay: 50});
});
command("cams", function () {
    const IDLE = getPosition("idle");
    const CAMS = getPosition("cams");
    execute({type: "pos", x: IDLE.x, y: IDLE.y});
    execute({type: "delay", ms: 100});
    execute({type: "move", x: CAMS.x, y: CAMS.y});
    execute({type: "move", x: IDLE.x, y: IDLE.y});
    campup = !campup;
    llon = false;
    rlon = false;
    updateCommandsList();
});

command("stage", function () {
    if (!campup) return;
    const CAM1A = getPosition("cam1a");
    execute({type: "click", x: CAM1A.x, y: CAM1A.y, delay: 50});
    returnToIdle();
});
command("foxy", function () {
    if (!campup) return;
    const CAM1C = getPosition("cam1c");
    execute({type: "click", x: CAM1C.x, y: CAM1C.y, delay: 50});
    returnToIdle();
});
command("bonnie", function () {
    if (!campup) return;
    const CAM2B = getPosition("cam2b");
    execute({type: "click", x: CAM2B.x, y: CAM2B.y, delay: 50});
    returnToIdle();
});
command("chica", function () {
    if (!campup) return;
    const CAM4B = getPosition("cam4b");
    execute({type: "click", x: CAM4B.x, y: CAM4B.y, delay: 50});
    returnToIdle();
});
command("kitchen", function () {
    if (!campup) return;
    const CAM6 = getPosition("cam6");
    execute({type: "click", x: CAM6.x, y: CAM6.y, delay: 50});
    returnToIdle();
});

addToGroup("doors", "lopen", "lclose", "ropen", "rclose");
addToGroup("lights", "llight", "rlight");
addToGroup("cams", "cams", "stage", "foxy", "bonnie", "chica", "kitchen");
function updateCommandsList() {
    const cmds = [];
    cmds.push("cams");
    if (!campup) {
        if (lopen) cmds.push("lclose");
        else cmds.push("lopen");
        cmds.push("llight");
        if (ropen) cmds.push("rclose");
        else cmds.push("ropen");
        cmds.push("rlight");
        cmds.push("boop");
    } else {
        cmds.push("stage");
        cmds.push("foxy");
        cmds.push("bonnie");
        cmds.push("chica");
        cmds.push("kitchen");
    }
    availabilityChanged(cmds);
}
reset(() => {
    console.log(config);
    lopen = true;
    ropen = true;
    campup = false;
    isright = false;
    llon = false;
    rlon = false;
    updateCommandsList();
});
