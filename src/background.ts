// src/background.ts
import { WDLink } from '@/types/WDLink';
import { wdLinkUpdate } from '@/util/wdLinkUtil';

// Tell Chrome to open the Side Panel when the extension icon is clicked
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

const ROOT_FOLDER_NAME = 'WD Sidekick';
let sidePanelPort: chrome.runtime.Port | null = null;

chrome.runtime.onStartup.addListener(() => {
    chrome.storage.local.set({ isPanelOpen: false });
});

// --- BOOKMARK HELPER FUNCTIONS ---

async function getWDRootId(): Promise<string> {
    // 1. Search for the "WD Sidekick" folder globally.
    // This allows the user to move the folder (e.g., to the Bookmarks Bar) without breaking the extension.
    const searchResults = await chrome.bookmarks.search({ title: ROOT_FOLDER_NAME });
    
    // Ensure we are getting a folder (folders do not have a url property), 
    // just in case they have a saved web page with the same name.
    const existingRoot = searchResults.find(node => node.url === undefined);

    if (existingRoot) {
        return existingRoot.id;
    }

    // 2. If the folder does not exist, create it.
    // In Chrome, id: '2' is the guaranteed, permanent ID for "Other bookmarks" across all languages.
    const newRoot = await chrome.bookmarks.create({
        parentId: '2', 
        title: ROOT_FOLDER_NAME
    });
    
    return newRoot.id;
}

// 2. Find or create the Subfolder (nested under the WD Sidekick root)
async function getSubfolderId(folderName: string): Promise<string> {
    const rootId = await getWDRootId();

    if (folderName === 'Global') {
        return rootId;
    }

    // Strictly search ONLY the children of our root folder
    const children = await chrome.bookmarks.getChildren(rootId);
    const targetFolder = children.find(child => child.title === folderName);
    
    if (targetFolder) {
        return targetFolder.id;
    } else {
        const newFolder = await chrome.bookmarks.create({ 
            parentId: rootId, 
            title: folderName 
        });
        return newFolder.id;
    }
}

// 3. Read bookmarks from Chrome and send to the Svelte UI
async function syncBookmarksToUI() {
    if (!sidePanelPort) return;
    
    try {
        const rootId = await getWDRootId();
        const rootChildren = await chrome.bookmarks.getChildren(rootId);
        
        let allLinks: WDLink[] = [];

        const globalLinks = rootChildren.filter(node => node.url !== undefined);
        const processedGlobalLinks = globalLinks.map(node => {
            let link: WDLink = {
                id: node.id,
                title: node.title,
                url: node.url as string,
                folder: 'Global',
                tenant: '', proxy: '', stopProxy: '', activateSecurity: '', login: ''
            };
            return wdLinkUpdate(link);
        });
        allLinks = [...allLinks, ...processedGlobalLinks];        

        // Iterate through all folders
        for (const folder of rootChildren) {
            // Only process folders (nodes with no URL)
            if (!folder.url) {
                const links = await chrome.bookmarks.getChildren(folder.id);

                const validLinks = links.filter(node => node.url !== undefined); // Ignore nested folders
                const processedLinks = validLinks.map(node => {
                    let link: WDLink = {
                        id: node.id,
                        title: node.title,
                        url: node.url as string,
                        folder: folder.title,
                        tenant: '', proxy: '', stopProxy: '', activateSecurity: '', login: ''
                    };
                    return wdLinkUpdate(link);
                });

                allLinks = [...allLinks, ...processedLinks];
            }
        }

        sidePanelPort.postMessage({ type: 'SYNC_STATE', payload: { wdLinks: allLinks, isLoading: false } });
    } catch (error) {
        console.error("Failed to sync bookmarks to UI", error);
        sidePanelPort.postMessage({ type: 'SYNC_STATE', payload: { wdLinks: [], isLoading: false } });
    }
}

// --- MESSAGE LISTENER ---
chrome.runtime.onConnect.addListener((port) => {
    if (port.name === 'keep-alive-port') {
        return; // Doing nothing keeps the port open and the SW alive
    }
   
    if (port.name === 'content-port') {
        sidePanelPort = port;
        
        // This stays .local because Side Panel visibility is specific to THIS computer
        try {
            chrome.storage.local.set({ isPanelOpen: true });
        } catch (e) {
            console.error("Error setting isPanelOpen in storage:", e);
        }

        port.onMessage.addListener(async (msg) => {
            switch (msg.type) {
                case 'GET_INITIAL_STATE':
                    try {
                        await syncBookmarksToUI();
                    } catch (e) {
                        console.error("Error during initial state sync:", e);
                    }
                    break;

                case 'ADD_LINK':
                    try {
                        // Payload is a WDLink object containing .folder
                        const folderName = msg.payload.folder || 'Global';
                        const addFolderId = await getSubfolderId(folderName);
                        await chrome.bookmarks.create({
                            parentId: addFolderId,
                            title: msg.payload.title,
                            url: msg.payload.url
                        });
                    } catch (e) {
                        console.error("Bookmark could not be added:", e);
                    } finally {
                        await syncBookmarksToUI(); 
                    }
                    
                    break;

                case 'DELETE_LINK':
                    try {
                    // Extract the string ID securely whether passed as an object or a direct string
                    const idToDelete = typeof msg.payload === 'object' ? msg.payload.id.toString() : msg.payload.toString();
                    await chrome.bookmarks.remove(idToDelete);
                    } catch (e) {
                        console.warn("Bookmark already deleted or invalid ID:", e);
                    } finally {
                        await syncBookmarksToUI(); 
                    } 
                    break;

                case 'REORDER_LINKS':
                    try {
                        // Payload is { links: WDLink[], folderName: string }
                        const newList: WDLink[] = msg.payload.links;
                        const reorderFolderId = await getSubfolderId(msg.payload.folderName);
                        
                        for (let i = 0; i < newList.length; i++) {
                            await chrome.bookmarks.move(newList[i].id.toString(), { 
                                parentId: reorderFolderId, 
                                index: i 
                            });
                        }
                     } catch (e) {
                        console.error("Error during reordering links:", e);
                    } finally {
                        await syncBookmarksToUI();
                    } 
                    
                    break;
            }
        });

        port.onDisconnect.addListener(() => {
            try {
                sidePanelPort = null;
                chrome.storage.local.set({ isPanelOpen: false });
            } catch (e) {
                console.error("Error during port disconnect cleanup:", e);
            }
            
        });
    }
});