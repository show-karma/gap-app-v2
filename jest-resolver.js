/**
 * Custom Jest resolver for pnpm workspace
 * Dynamically resolves MSW and @mswjs/interceptors modules
 */
const path = require("node:path");
const fs = require("node:fs");

// Cache for resolved paths
const resolvedPaths = new Map();

function findPackageInPnpm(packageName, subpath = "") {
  const cacheKey = `${packageName}${subpath}`;
  if (resolvedPaths.has(cacheKey)) {
    return resolvedPaths.get(cacheKey);
  }

  const nodeModulesPath = path.join(process.cwd(), "node_modules");

  // Try direct node_modules first (for hoisted packages)
  const directPath = path.join(nodeModulesPath, packageName, subpath);
  if (fs.existsSync(directPath)) {
    resolvedPaths.set(cacheKey, directPath);
    return directPath;
  }

  // Search in .pnpm directory
  const pnpmPath = path.join(nodeModulesPath, ".pnpm");
  if (fs.existsSync(pnpmPath)) {
    const entries = fs.readdirSync(pnpmPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.includes(packageName.replace("/", "+"))) {
        const packagePath = path.join(pnpmPath, entry.name, "node_modules", packageName, subpath);

        if (fs.existsSync(packagePath)) {
          resolvedPaths.set(cacheKey, packagePath);
          return packagePath;
        }
      }
    }
  }

  return null;
}

function resolveMSWNode() {
  const mswPath = findPackageInPnpm("msw");
  if (mswPath) {
    const nodePath = path.join(mswPath, "lib", "node", "index.js");
    if (fs.existsSync(nodePath)) {
      return nodePath;
    }
  }
  return null;
}

function resolveInterceptor(subpath) {
  const interceptorsPath = findPackageInPnpm("@mswjs/interceptors");
  if (!interceptorsPath) {
    return null;
  }

  // Map subpaths to their actual locations
  const subpathMap = {
    "": path.join(interceptorsPath, "lib", "node", "index.js"),
    "/ClientRequest": path.join(
      interceptorsPath,
      "lib",
      "node",
      "interceptors",
      "ClientRequest",
      "index.js"
    ),
    "/XMLHttpRequest": path.join(
      interceptorsPath,
      "lib",
      "browser",
      "interceptors",
      "XMLHttpRequest",
      "index.js"
    ),
    "/fetch": path.join(interceptorsPath, "lib", "node", "interceptors", "fetch", "index.js"),
  };

  const resolvedPath = subpathMap[subpath];
  if (resolvedPath && fs.existsSync(resolvedPath)) {
    return resolvedPath;
  }

  return null;
}

module.exports = (request, options) => {
  // Handle MSW node import
  if (request === "msw/node") {
    const resolved = resolveMSWNode();
    if (resolved) {
      return resolved;
    }
  }

  // Handle @mswjs/interceptors imports
  if (request.startsWith("@mswjs/interceptors")) {
    const subpath = request.replace("@mswjs/interceptors", "");
    const resolved = resolveInterceptor(subpath);
    if (resolved) {
      return resolved;
    }
  }

  // Handle until-async (MSW dependency) - find and return CommonJS version if available
  if (request === "until-async") {
    const untilAsyncPath = findPackageInPnpm("until-async");
    if (untilAsyncPath) {
      // Try to find a CommonJS entry point
      const cjsPath = path.join(untilAsyncPath, "lib", "index.js");
      if (fs.existsSync(cjsPath)) {
        return cjsPath;
      }
      // Fall back to main entry
      const mainPath = path.join(untilAsyncPath, "index.js");
      if (fs.existsSync(mainPath)) {
        return mainPath;
      }
    }
  }

  // Fall back to default resolver
  return options.defaultResolver(request, options);
};
