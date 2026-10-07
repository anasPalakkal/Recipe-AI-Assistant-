import { execFile } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { promisify } from "node:util";

const run = promisify(execFile);

const OUTPUT_DIR = "scripts/demo-video/output";
const RAW_FILE = `${OUTPUT_DIR}/cookloom-demo-raw.webm`;
const FINAL_FILE = `${OUTPUT_DIR}/cookloom-demo.mp4`;
const KEEP_LOADING_SECONDS = 2.5;
const FAST_FORWARD_TARGET_SECONDS = 2;
const TAIL_MARGIN_SECONDS = 0.4;

const marks = JSON.parse(await readFile(`${OUTPUT_DIR}/marks.json`, "utf8"));
if (marks.promptSent === undefined || marks.recipeVisible === undefined) {
  throw new Error("marks.json is incomplete. Re-run record-demo.mjs successfully first.");
}

const cutStart = marks.promptSent + KEEP_LOADING_SECONDS;
const cutEnd = marks.recipeVisible - TAIL_MARGIN_SECONDS;
const waitSeconds = cutEnd - cutStart;

const encodeArgs = ["-c:v", "libx264", "-crf", "23", "-preset", "slow", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an"];

let args;
if (waitSeconds <= FAST_FORWARD_TARGET_SECONDS) {
  args = ["-y", "-i", RAW_FILE, ...encodeArgs, FINAL_FILE];
} else {
  const speed = waitSeconds / FAST_FORWARD_TARGET_SECONDS;
  const filter = [
    `[0:v]trim=start=0:end=${cutStart.toFixed(3)},setpts=PTS-STARTPTS[a]`,
    `[0:v]trim=start=${cutStart.toFixed(3)}:end=${cutEnd.toFixed(3)},setpts=(PTS-STARTPTS)/${speed.toFixed(3)}[b]`,
    `[0:v]trim=start=${cutEnd.toFixed(3)},setpts=PTS-STARTPTS[c]`,
    "[a][b][c]concat=n=3:v=1:a=0[v]",
  ].join(";");
  args = ["-y", "-i", RAW_FILE, "-filter_complex", filter, "-map", "[v]", ...encodeArgs, FINAL_FILE];
  console.log(`Fast-forwarding ${waitSeconds.toFixed(1)}s of waiting by ${speed.toFixed(1)}x`);
}

await run("ffmpeg", args);
const { size } = await stat(FINAL_FILE);
console.log(`Saved ${FINAL_FILE} (${(size / 1024 / 1024).toFixed(2)} MB)`);