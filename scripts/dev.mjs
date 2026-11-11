import { spawn } from "node:child_process";

const procs = [
  { name: "server", cmd: "npm", args: ["run", "dev:server"] },
  { name: "client", cmd: "npm", args: ["run", "dev:client"] },
];

let shuttingDown = false;

const children = procs.map(({ name, cmd, args }) => {
  const child = spawn(cmd, args, {
    stdio: "inherit",
    env: { ...process.env, NODE_ENV: process.env.NODE_ENV ?? "development" },
  });
  child.on("error", (err) => {
    console.error(`[${name}] failed to start:`, err.message);
    shutdown(1);
  });
  child.on("close", (code) => {
    if (!shuttingDown) {
      console.log(`[${name}] exited with code ${code}`);
      shutdown(code ?? 1);
    }
  });
  return child;
});

function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;

  let remaining = children.filter((c) => c.exitCode === null && !c.killed);
  if (remaining.length === 0) {
    process.exit(code);
    return;
  }

  for (const child of remaining) child.kill("SIGTERM");

  let closed = 0;
  const done = () => {
    closed += 1;
    if (closed >= remaining.length) process.exit(code);
  };
  for (const child of remaining) child.on("close", done);

  setTimeout(() => {
    for (const child of remaining) {
      if (child.exitCode === null && !child.killed) child.kill("SIGKILL");
    }
    process.exit(code);
  }, 5000).unref();
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
