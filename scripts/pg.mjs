import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const binDir = "/Applications/Postgres.app/Contents/Versions/18/bin";
const dataDir = path.join(process.cwd(), ".pgdata");
const command = process.argv[2];

function run(bin, args, allowFailure = false) {
  const result = spawnSync(path.join(binDir, bin), args, { stdio: "inherit" });
  if (!allowFailure && result.status !== 0) {
    process.exit(result.status ?? 1);
  }
  return result.status ?? 1;
}

if (command === "up") {
  if (!existsSync(path.join(binDir, "initdb"))) {
    console.error("PostgreSQL 18 binaries were not found in Postgres.app.");
    process.exit(1);
  }
  if (!existsSync(path.join(dataDir, "PG_VERSION"))) {
    run("initdb", [
      "-D",
      dataDir,
      "-U",
      "notea",
      "--auth=trust",
      "--auth-local=trust",
      "--auth-host=trust",
      "--encoding=UTF8",
      "--locale=C",
    ]);
  }
  const running = spawnSync(path.join(binDir, "pg_ctl"), ["-D", dataDir, "status"]);
  if (running.status !== 0) {
    run("pg_ctl", [
      "-D",
      dataDir,
      "-l",
      path.join(dataDir, "server.log"),
      "-o",
      `-p 5433 -k ${dataDir} -c listen_addresses=127.0.0.1`,
      "start",
    ]);
  }
  run("createdb", ["-h", "127.0.0.1", "-p", "5433", "-U", "notea", "notea"], true);
  run("createdb", ["-h", "127.0.0.1", "-p", "5433", "-U", "notea", "notea_test"], true);
  console.log("PostgreSQL is ready on 127.0.0.1:5433");
} else if (command === "down") {
  run("pg_ctl", ["-D", dataDir, "stop"]);
} else {
  console.error("Use: node scripts/pg.mjs up|down");
  process.exit(1);
}
