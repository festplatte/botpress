import { exec } from "child_process";
import glob from "glob";
import path from "path";
import fs from "fs";
import rimraf from "rimraf";
import { promisify } from "util";

import { debug, error, normal } from "./log";

const tar = require("tar");

const execAsync = promisify(exec);

let packageJson: any;

export default async (argv: any) => {
  const modulePath = path.resolve(argv.path || process.cwd());
  const out = argv.out;
  packageJson = require(path.join(modulePath, "package.json"));

  try {
    await installProductionDeps(modulePath);
    await zipFiles(modulePath, out);
  } catch (err) {
    return error(
      `Error packaging module: ${err.message || ""} ${err.cmd ||
        ""} ${err.stderr || ""}`
    );
  } finally {
    await cleanup(modulePath);
  }

  normal("Package completed");
};

const getTargetOSConfig = () => {
  if (process.argv.find(x => x.toLowerCase() === "--win32")) {
    return "win32";
  } else if (process.argv.find(x => x.toLowerCase() === "--linux")) {
    return "linux";
  } else {
    return "darwin";
  }
};

async function installProductionDeps(modulePath) {
  if (packageJson.dependencies) {
    debug("Installing production modules...");
    const { stdout } = await execAsync(
      `cross-env npm_config_target_platform=${getTargetOSConfig()} && mv node_modules node_modules_temp && npm ci --production && mv node_modules node_production_modules && mv node_modules_temp node_modules`,
      {
        cwd: modulePath
      }
    );
    debug(stdout);
  } else {
    debug(
      "No production modules found, creating empty node_production_modules folder..."
    );
    fs.mkdirSync(path.join(modulePath, "node_production_modules"));
  }
}

async function cleanup(modulePath) {
  debug("Cleaning up temporary files...");
  rimraf.sync(path.join(modulePath, "node_production_modules"));
}

async function zipFiles(modulePath, outPath) {
  outPath = outPath.replace(
    /%name%/gi,
    packageJson.name.replace(/[^\w-]/gi, "_")
  );
  outPath = outPath.replace(
    /%version%/gi,
    packageJson.version.replace(/[^\w-]/gi, "_")
  );

  if (!path.isAbsolute(outPath)) {
    outPath = path.join(modulePath, outPath);
  }

  debug(`Writing to "${outPath}"`);

  const files = glob.sync("**/*", {
    cwd: modulePath,
    nodir: true,
    dot: true,
    ignore: ["node_modules/**", "src/**"]
  });

  debug(`Zipping ${files.length} file${files.length === 1 ? "" : "s"}...`);

  await tar.create(
    { gzip: true, follow: true, file: outPath, portable: true },
    files
  );
}
