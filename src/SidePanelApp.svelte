<script lang="ts">
    import { flip } from 'svelte/animate';
    import { dndzone } from 'svelte-dnd-action';
    import { Trash2 } from 'lucide-svelte';
    
    // Import the custom store we created in the last step
    import { extensionStore } from './state/store'; 
    import { openInNewTab, deleteBookmark } from './util/wdLinkUtil';

    // Subscribe to the store to get the link list
    $: state = $extensionStore;
    $: linkList = state.wdLinks || [];

    // --- Drag and Drop Logic ---
    const flipDurationMs = 300;

    // Triggered while dragging (gives that smooth live-preview effect)
    function handleDndConsider(e: CustomEvent) {
        linkList = e.detail.items;
    }

    // Triggered when the user drops the item
    function handleDndFinalize(e: CustomEvent) {
        linkList = e.detail.items;
        // Dispatch the new order back to the background script so it saves!
        extensionStore.dispatch('REORDER_LINKS', linkList);
    }
</script>

<div class="container mx-auto p-4 max-w-md bg-white">
    <h1 class="text-xl font-bold mb-4 border-b pb-2 text-gray-800">WD Links</h1>

    {#if linkList.length === 0}
        <p class="text-sm text-gray-500">No bookmarks saved yet.</p>
    {:else}
        <ul 
            use:dndzone={{ items: linkList, flipDurationMs }} 
            on:consider={handleDndConsider} 
            on:finalize={handleDndFinalize}
            class="space-y-3"
        >
            {#each linkList as item (item.id)}
                <li 
                    animate:flip={{ duration: flipDurationMs }} 
                    class="flex items-center justify-between p-3 bg-white border rounded-md shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing"
                >
                    <div class="flex-1 overflow-hidden">
                        <h2 class="font-semibold text-gray-800 truncate" title={item.title}>
                            {item.title}
                        </h2>
                        
                        <div class="text-xs text-blue-600 mt-1 flex flex-wrap gap-2">
                            <button class="hover:underline" on:click={() => openInNewTab(item.url)}>
                                Link
                            </button>
                            
                            {#if item.proxy?.length > 0}
                                <span class="text-gray-300">|</span>
                                <button class="hover:underline" on:click={() => openInNewTab(item.proxy)}>
                                    Start
                                </button>
                            {/if}

                            {#if item.stopProxy?.length > 0}
                                <span class="text-gray-300">|</span>
                                <button class="hover:underline text-red-600" on:click={() => openInNewTab(item.stopProxy)}>
                                    Stop
                                </button>
                            {/if}

                            {#if item.activateSecurity?.length > 0}
                                <span class="text-gray-300">|</span>
                                <button class="hover:underline text-purple-600" on:click={() => openInNewTab(item.activateSecurity)}>
                                    Security
                                </button>
                            {/if}
                        </div>
                    </div>

                    <div class="ml-4">
                        <button 
                            class="p-2 text-gray-400 hover:text-red-500 transition-colors rounded hover:bg-red-50"
                            title="Delete" 
                            on:click={() => deleteBookmark(item.id, linkList)}
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </li>
            {/each}
        </ul>
    {/if}
</div>