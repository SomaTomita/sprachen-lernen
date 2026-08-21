// Loads the word list for a level. A separate background process may be
// appending audio to data/A2/words.json while we fetch, so a transient JSON
// parse failure is retried ONCE before giving up.
export async function loadWords(level) {
    const url = `data/${level}/words.json`;
    const res = await fetch(url);
    if (!res.ok)
        throw new Error(`failed to load ${url}`);
    const text = await res.text();
    try {
        return JSON.parse(text);
    }
    catch {
        // One retry: re-fetch and re-parse (writer may have been mid-write).
        const retry = await fetch(`${url}?retry=${Date.now()}`, { cache: 'no-store' });
        if (!retry.ok)
            throw new Error(`failed to load ${url}`);
        return JSON.parse(await retry.text());
    }
}
export function indexById(words) {
    const m = {};
    for (const w of words)
        m[w.id] = w;
    return m;
}
