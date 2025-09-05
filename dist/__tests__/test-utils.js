import { createServer } from 'http';
/**
 * Get an available port for testing
 * Following engineering principle #7: Resource cleanup
 */
export async function getAvailablePort() {
    return new Promise((resolve, reject) => {
        const server = createServer();
        server.listen(0, () => {
            const address = server.address();
            if (address && typeof address === 'object' && address.port) {
                const port = address.port;
                server.close(() => resolve(port));
            }
            else {
                server.close(() => reject(new Error('Failed to get port')));
            }
        });
        server.on('error', (err) => {
            server.close(() => reject(err));
        });
    });
}
/**
 * Create multiple unique ports for parallel testing
 */
export async function getAvailablePorts(count) {
    const ports = [];
    for (let i = 0; i < count; i++) {
        ports.push(await getAvailablePort());
    }
    return ports;
}
