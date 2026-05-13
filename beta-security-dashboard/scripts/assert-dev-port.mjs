import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

function loadEnvFile(filePath) {
    if (!existsSync(filePath)) {
        return {};
    }

    return readFileSync(filePath, 'utf8')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#') && line.includes('='))
        .reduce((env, line) => {
            const index = line.indexOf('=');
            const key = line.slice(0, index).trim();
            const value = line.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
            env[key] = value;
            return env;
        }, {});
}

function runPowerShell(command) {
    return execFileSync(
        'powershell',
        ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
    ).trim();
}

function normalizeJsonArray(value) {
    if (!value) {
        return [];
    }

    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [parsed];
}

function getWindowsListeners(port) {
    const command = `
$connections = @(Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object LocalAddress,LocalPort,OwningProcess)
if ($connections.Count -eq 0) { '[]' } else { $connections | ConvertTo-Json -Compress }
`;
    return normalizeJsonArray(runPowerShell(command));
}

function getWindowsProcess(pid) {
    const command = `
$process = Get-CimInstance Win32_Process -Filter "ProcessId = ${pid}" -ErrorAction SilentlyContinue
if ($null -eq $process) {
  [pscustomobject]@{ ProcessId = ${pid}; Name = 'unknown'; ExecutablePath = ''; CommandLine = '' } | ConvertTo-Json -Compress
} else {
  [pscustomobject]@{ ProcessId = $process.ProcessId; Name = $process.Name; ExecutablePath = $process.ExecutablePath; CommandLine = $process.CommandLine } | ConvertTo-Json -Compress
}
`;
    return JSON.parse(runPowerShell(command));
}

function getListeners(port) {
    if (process.platform === 'win32') {
        const listeners = getWindowsListeners(port);
        const processByPid = new Map();

        for (const listener of listeners) {
            const pid = Number(listener.OwningProcess);
            if (pid && !processByPid.has(pid)) {
                processByPid.set(pid, getWindowsProcess(pid));
            }
        }

        return listeners.map((listener) => ({
            address: listener.LocalAddress,
            port: listener.LocalPort,
            pid: Number(listener.OwningProcess),
            process: processByPid.get(Number(listener.OwningProcess))
        }));
    }

    return [];
}

const envFile = loadEnvFile(resolve(projectRoot, '.env'));
const port = Number(
    process.env.VITE_DEV_SERVER_PORT
    || process.env.DEV_SERVER_PORT
    || envFile.VITE_DEV_SERVER_PORT
    || envFile.DEV_SERVER_PORT
    || 5173
);

if (!Number.isFinite(port) || port <= 0) {
    console.error(`Invalid Vite dev port: ${port}`);
    process.exit(1);
}

const listeners = getListeners(port);

if (!listeners.length) {
    console.log(`Dev port ${port} is clear.`);
    process.exit(0);
}

const projectRootLower = projectRoot.toLowerCase();
const lines = listeners.map((listener) => {
    const commandLine = listener.process?.CommandLine || '';
    const executablePath = listener.process?.ExecutablePath || '';
    const owner = `${listener.process?.Name || 'unknown'} PID ${listener.pid}`;
    const scope = commandLine.toLowerCase().includes(projectRootLower) || executablePath.toLowerCase().includes(projectRootLower)
        ? 'this project'
        : 'another project';

    return [
        `- ${listener.address}:${listener.port} is owned by ${owner} (${scope})`,
        `  ${commandLine || executablePath || 'No command line available'}`
    ].join('\n');
});

console.error(`Port ${port} is already listening. This causes localhost iframe routes to randomly hit the wrong Vite app.\n${lines.join('\n')}\n`);
console.error(`Stop the listed process first, for example: Stop-Process -Id ${listeners[0].pid} -Force`);
process.exit(1);
