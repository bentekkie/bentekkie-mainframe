import { CommandType } from '@gen/command_pb';

export const READ_ONLY_COMMAND_MAP: ReadonlyMap<string, CommandType> = new Map<string, CommandType>([
    ['ls', CommandType.ls],
    ['cd', CommandType.cd],
    ['cat', CommandType.cat],
    ['help', CommandType.help],
    ['tree', CommandType.tree],
    ['find', CommandType.find],
    ['grep', CommandType.grep],
]);

export interface DeepLinkParams {
    path: string | null;
    cmd: string | null;
    quiet: boolean;
}

export interface ParsedReadOnlyCommand {
    command: CommandType;
    name: string;
    args: string[];
}

export function parseDeepLinkParams(search: string): DeepLinkParams {
    const params = new URLSearchParams(search);
    const rawPath = params.get('path')?.trim() ?? '';
    const rawCmd = params.get('cmd')?.trim() ?? '';
    const rawQuiet = params.get('quiet')?.trim().toLowerCase() ?? '';

    let normalizedPath: string | null = null;
    if (rawPath !== '' && !/[\r\n\0]/.test(rawPath)) {
        normalizedPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
    }

    return {
        path: normalizedPath,
        cmd: rawCmd !== '' ? rawCmd : null,
        quiet: rawQuiet === '1' || rawQuiet === 'true',
    };
}

// Parses a URL ?cmd= string directly into a strictly allowlisted read-only CommandType and args.
// Returns null for any non-read-only, sudo, client-side, or malformed command.
export function parseReadOnlyDeepLinkCommand(raw: string): ParsedReadOnlyCommand | null {
    const trimmed = raw.trim();
    if (trimmed === '' || /[\r\n\0]/.test(trimmed)) {
        return null;
    }
    const split = trimmed.match(/(?:[^\s"]+|"[^"]*")+/g);
    if (!split || split.length === 0) {
        return null;
    }
    const [rawCmd, ...rawArgs] = split.map(part => part.replace(/"/g, ''));
    const name = rawCmd.toLowerCase();
    const command = READ_ONLY_COMMAND_MAP.get(name);
    if (command === undefined) {
        return null;
    }
    return { command, name, args: rawArgs };
}

export function formatPrompt(dirPath?: string): string {
    let tmp = dirPath || '/';
    const parts = tmp.split('/');
    if (parts.length > 2) {
        tmp = '/../' + parts[parts.length - 1];
    }
    return 'B:' + tmp + '>';
}

export function resolveVfsPath(currentDir: string, arg: string): string {
    const combined = arg.startsWith('/')
        ? arg
        : `${currentDir.replace(/\/+$/, '')}/${arg}`;
    const segments: string[] = [];
    for (const part of combined.split('/')) {
        if (part === '' || part === '.') {
            continue;
        }
        if (part === '..') {
            segments.pop();
        } else {
            segments.push(part);
        }
    }
    return '/' + segments.join('/');
}

export function syncBrowserUrl(dirPath: string, cmd?: string | null): void {
    if (typeof window === 'undefined' || !window.history?.replaceState) {
        return;
    }
    const params = new URLSearchParams();
    if (dirPath && dirPath !== '/') {
        params.set('path', dirPath);
    }
    if (cmd && cmd.trim() !== '') {
        params.set('cmd', cmd.trim());
    }
    const qs = params.toString();
    const nextUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    try {
        window.history.replaceState(null, '', nextUrl);
    } catch {
        // Ignore history restrictions in sandboxed/opaque contexts.
    }
}
