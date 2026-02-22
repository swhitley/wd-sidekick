import { writable } from 'svelte/store';
import type WDLink from '@/types/WDLink';

interface AppState {
    wdLinks: WDLink[];
    isLoading: boolean;
}

const initialState: AppState = {
    wdLinks: [],
    isLoading: true
};

function createExtensionStore() {
    const { subscribe, set } = writable<AppState>(initialState);
    let port: chrome.runtime.Port | null = null;
    let messageQueue: { type: string, payload?: any }[] = [];
    let isReady = false;

    /**
     * Established a connection to the background service worker.
     * Replaces the old direct connection with a state-aware handler.
     */
    function connect() {
        // Create the port connection
        port = chrome.runtime.connect({ name: 'content-port' });
        
        port.onMessage.addListener((message) => {
            if (message.type === 'SYNC_STATE') {
                set(message.payload);
                
                // Once we receive the first state sync, we know the background is active
                if (!isReady) {
                    isReady = true;
                    flushQueue();
                }
            }
        });

        port.onDisconnect.addListener(() => {
            console.log("WD Sidekick: Port disconnected. Background worker sleeping.");
            port = null;
            isReady = false;
        });

        // Immediately request state upon connection attempt
        port.postMessage({ type: 'GET_INITIAL_STATE' });
    }

    /**
     * Processes messages that were sent while the port was connecting 
     * or the service worker was waking up.
     */
    function flushQueue() {
        while (messageQueue.length > 0 && port && isReady) {
            const msg = messageQueue.shift();
            if (msg) {
                try {
                    port.postMessage(msg);
                } catch (e) {
                    console.error("WD Sidekick: Failed to flush message", e);
                }
            }
        }
    }

    // Initial connection attempt on startup
    connect();

    return {
        subscribe,
        /**
         * Enhanced dispatching mechanism. 
         * Replaces the previous 50ms setTimeout "race condition" with a reliable queue.
         */
        dispatch: (actionType: string, payload?: any) => {
            const message = { type: actionType, payload };
            
            // If port doesn't exist, start connection and queue message
            if (!port) {
                messageQueue.push(message);
                connect();
            } 
            // If port exists but isn't confirmed "ready" via SYNC_STATE yet, queue it
            else if (!isReady) {
                messageQueue.push(message);
            } 
            // Normal operation
            else {
                try {
                    port.postMessage(message);
                } catch (e) {
                    // If postMessage fails, the port likely died silently; reconnect and queue
                    console.warn("WD Sidekick: Port dead during dispatch, reconnecting...");
                    isReady = false;
                    messageQueue.push(message);
                    connect();
                }
            }
        }
    };
}

export const extensionStore = createExtensionStore();