export const READ_ONLY_URL_COMMANDS = new Set([
    'ls',
    'cd',
    'cat',
    'help',
    'tree',
    'find',
    'grep',
]);

export interface DeepLinkParams {
    path: string | null;
    cmd: string | null;
    quiet: boolean;
}

export function parseDeepLinkParams(search: string): DeepLinkParams {
    const params = new URLSearchParams(search);
    const rawPath = params.get('path')?.trim() ?? '';
    const rawCmd = params.get('cmd')?.trim() ?? '';
    const rawQuiet = params.get('quiet')?.trim().toLowerCase() ?? '';

    let normalizedPath: string | null = null;
    if (rawPath !== '') {
        normalizedPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
    }

    return {
        path: normalizedPath,
        cmd: rawCmd !== '' ? rawCmd : null,
        quiet: rawQuiet === '1' || rawQuiet === 'true',
    };
}

export function isAllowedDeepLinkCommand(command: string): boolean {
    const trimmed = command.trim();
    if (trimmed === '' || /[\r\n]/.test(trimmed)) {
        return false;
    }
    const split = trimmed.match(/(?:[^\s"]+|"[^"]*")+/g);
    if (!split || split.length === 0) {
        return false;
    }
    const cmd = split[0].replace(/"/g, '').toLowerCase();
    return READ_ONLY_URL_COMMANDS.has(cmd);
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
