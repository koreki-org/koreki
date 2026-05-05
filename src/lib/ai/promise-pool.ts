/**
 * Industrial Promise Pool (Koreki Core)
 * 🏛️🛡️⚡
 * Limits the number of concurrent asynchronous operations.
 * Designed for reliable AI request orchestration.
 */
export async function promisePool<T, R>(
    items: T[],
    concurrency: number,
    task: (item: T, index: number) => Promise<R>
): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let currentIdx = 0;

    const worker = async () => {
        while (currentIdx < items.length) {
            const index = currentIdx++;
            results[index] = await task(items[index], index);
        }
    };

    const workers = Array.from({ length: Math.min(concurrency, items.length) }, worker);
    await Promise.all(workers);

    return results;
}
