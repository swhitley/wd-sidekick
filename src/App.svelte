<script lang="ts">
  import { flip } from 'svelte/animate';
  import { dndzone } from 'svelte-dnd-action';
  import { Trash2, PlusSquare, Eye, EyeOff, Settings, X, Goal, Bookmark, Info, LockIcon } from 'lucide-svelte';
  
  import { extensionStore } from './state/store'; 
  import { openInNewTab, wdLinkUpdate } from '@/util/wdLinkUtil';
  import type WDLink from '@/types/WDLink';
  import { onMount } from 'svelte';

  $: state = $extensionStore;
  $: linkList = state?.wdLinks || [];
  
  let isInjectionEnabled = false;
  let isDragging = false;
  const flipDurationMs = 250;
  const defaultFolderName = 'Global';

  // Workspace State
  let folders: string[] = [defaultFolderName];
  let selectedFolder: string = defaultFolderName;
  let newFolderName: string = '';
  let manualUrl: string = '';
  let manualTitle: string = '';
  let manageDialog: HTMLDialogElement;

  // Local state to handle smooth drag-and-drop transitions
  let displayLinks: WDLink[] = [];

  // Reactively sync our local display list whenever the store or selected folder changes
  $: {
    if (!isDragging) {
      displayLinks = linkList.filter((link: WDLink) => 
        link.folder === selectedFolder || (!link.folder && selectedFolder === defaultFolderName)
      );
    }
  }

  onMount(() => {
    // 1. Load "Always On" state, folders, and the last selected folder
    chrome.storage.sync.get(['alwaysOn', 'folders', 'lastSelectedFolder'], (data) => {
      isInjectionEnabled = data.alwaysOn === true;
      
      if (data.folders && data.folders.length > 0) {
        folders = data.folders;
      }
      
      // Restore the previously selected folder if it exists
      if (data.lastSelectedFolder && folders.includes(data.lastSelectedFolder)) {
        selectedFolder = data.lastSelectedFolder;
      } else {
        selectedFolder = folders[0] || defaultFolderName;
      }
    });
  });

  // Persist the selected folder whenever the dropdown changes
  function handleFolderChange() {
    chrome.storage.sync.set({ lastSelectedFolder: selectedFolder });
  }

  // Persist "Always On" state whenever toggled
  function toggleAlwaysOn() {
    isInjectionEnabled = !isInjectionEnabled;
    chrome.storage.sync.set({ alwaysOn: isInjectionEnabled });
  }

  function createFolder() {
    const trimmed = newFolderName.trim();
    if (trimmed && !folders.includes(trimmed)) {
      folders = [...folders, trimmed];
      selectedFolder = trimmed; 
      // Save both the new folders array and set it as the active folder
      chrome.storage.sync.set({ folders, lastSelectedFolder: trimmed });
      newFolderName = '';
    }
  }

function deleteFolder() {
    if (selectedFolder === defaultFolderName) return; // Prevent deleting 'Global'

    if (linkList.some((link: WDLink) => link.folder === selectedFolder)) {
      alert('Please move or delete all links in this folder before removing it.');
      return;
    }
    
    if (confirm(`Are you sure you want to remove the folder "${selectedFolder}"?`)) {
      // Remove the folder from the array
      folders = folders.filter(f => f !== selectedFolder);
      
      // Default back to the main folder
      selectedFolder = defaultFolderName;
      
      // Save the updated array and new selection to Chrome storage
      chrome.storage.sync.set({ folders, lastSelectedFolder: defaultFolderName });
    }
  }  

  function saveManualLink() {
    if (!manualUrl.trim()) return;
    let newLink: WDLink = {
      id: Date.now(),
      title: manualTitle.trim() || 'Saved Link',
      url: manualUrl.trim(),
      folder: selectedFolder,
      proxy: '', stopProxy: '', activateSecurity: '', login: '', tenant: ''
    };
    newLink = wdLinkUpdate(newLink);
    extensionStore.dispatch('ADD_LINK', newLink);
    manualUrl = ''; manualTitle = '';
    manageDialog.close();
  }

  async function saveCurrentTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url && tab?.title) {
      let newLink: WDLink = {
        id: Date.now(),
        title: tab.title,
        url: tab.url,
        folder: selectedFolder,
        proxy: '', stopProxy: '', activateSecurity: '', login: '', tenant: ''
      };
      newLink = wdLinkUpdate(newLink);
      extensionStore.dispatch('ADD_LINK', newLink);
    }
  }

  function handleDndConsider(e: CustomEvent) {
    isDragging = true;
    displayLinks = e.detail.items;
  }

  function handleDndFinalize(e: CustomEvent) {
    isDragging = false;
    displayLinks = e.detail.items;
    extensionStore.dispatch('REORDER_LINKS', { 
        links: displayLinks, 
        folderName: selectedFolder 
    });
  }
</script>

<main class="w-full p-4 overflow-visible">
  <div class="flex flex-wrap gap-2 items-center justify-between mb-4 bg-white p-3 rounded-xl shadow-sm">
    <div class="flex gap-2">
      <button on:click={saveCurrentTab} class="flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-slate-200 transition-colors">
        <PlusSquare size={14} /> Link
      </button>
      <button on:click={() => manageDialog.showModal()} class="flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-slate-200 transition-colors">
        <Settings size={14} /> Manage
      </button>   
    </div>
    
    <div class="flex gap-2 items-center">
     <button 
        title="Bookmarks" 
        on:click={() => chrome.tabs.create({ url: 'chrome://bookmarks' })} 
        class="flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-slate-200 transition-colors">
        <Bookmark size={14} />
      </button>   

    <button 
      on:click={toggleAlwaysOn}
      title="Always On"
      class="flex items-center gap-1 text-[10px] px-2 py-1.5 rounded-lg font-bold cursor-pointer transition-colors {isInjectionEnabled ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}"
    >
      {#if isInjectionEnabled} <Eye size={12} /> {:else} <EyeOff size={12} /> {/if}
    </button>
    <button 
      on:click={() => openInNewTab('https://github.com/swhitley/wd-sidekick')}
      title="About"
      class="flex items-center gap-1 text-[10px] px-2 py-1.5 rounded-lg font-bold cursor-pointer transition-colors bg-slate-100 text-slate-600 hover:bg-slate-200"
    >
      <Info size={12} />
    </button>
    </div>
  </div>

  <div class="flex items-center justify-center gap-3 text-slate-700 font-medium mb-6 bg-white py-3 rounded-xl shadow-sm text-xs">
    <button class="hover:underline cursor-pointer" on:click={() => openInNewTab('https://resourcecenter.workday.com')}>Community</button>
    <span class="text-slate-300">|</span>
    <button class="hover:underline cursor-pointer" on:click={() => openInNewTab('https://developer.workday.com')}>Developer</button>
    <span class="text-slate-300">|</span>
    
    <div class="relative group cursor-pointer flex items-center">
      <span class="hover:underline">Star Paste</span>
      <div class="absolute hidden group-hover:block top-full mt-2 left-1/2 -translate-x-1/2 w-48 p-2.5 bg-gray-800 text-white rounded-md shadow-xl z-50 text-[10px] text-left leading-relaxed">
        <div class="mb-2">Use star paste to fill in fields from a list of values in your clipboard.</div>
        <ol class="list-decimal pl-4">
          <li>On a Workday page, enter an asterisk (*) in any field and click on that field.</li>
          <li>Every subsequent click in any input field will pull in the next value in the list from your clipboard.</li>
          <li>Repeat Step 1 to turn off Star Paste.</li>
        </ol>
        <span class="mt-2 block">Star Paste is great for updating security lists and adding values to report filters.</span>
      </div>
    </div>
  </div>

  <div class="mb-3">
    <select bind:value={selectedFolder} on:change={handleFolderChange} class="w-full p-1.5 text-xs font-bold border-b-2 border-gray-300 bg-transparent text-gray-800 outline-none focus:border-blue-500 cursor-pointer">
      {#each folders as folder}
        <option value={folder}>{folder}</option>
      {/each}
    </select>
    {#if selectedFolder !== defaultFolderName && !linkList.some((link: WDLink) => link.folder === selectedFolder)}
      <button 
        on:click={deleteFolder} 
        class="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors cursor-pointer flex-shrink-0" 
        title="Remove Folder"
      >
        <Trash2 size={16} />
      </button>
    {/if}
  </div>

  <ul use:dndzone={{ items: displayLinks, flipDurationMs }} on:consider={handleDndConsider} on:finalize={handleDndFinalize} class="space-y-3 pb-10">
    {#each displayLinks as item (item.id)}
      <li animate:flip={{ duration: flipDurationMs }} class="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between min-w-0 hover:shadow-md transition-shadow">
        
        <div class="flex-1 min-w-0 pr-2">
          <div class="text-[12px] font-bold text-slate-900 truncate text-sm">
            {#if item.tenant}
              <button title="{item.title}" class="text-blue-400 hover:underline cursor-pointer" on:click={() => openInNewTab(item.login)}>[{item.tenant}]</button> - 
            {/if}
            {item.title}
          </div>
          
          <div class="text-[11px] text-slate-500 mt-1 flex flex-wrap gap-x-3 font-medium">
            <button title="{item.url}" class="text-slate-600 cursor-pointer hover:underline" on:click={() => openInNewTab(item.url)}>Link</button>
            {#if item.proxy} <button title="Start Proxy" class="cursor-pointer hover:underline text-slate-600" on:click={() => openInNewTab(item.proxy)}>Start</button> {/if}
            {#if item.stopProxy} <button title="Stop Proxy" class="text-slate-600 cursor-pointer hover:underline" on:click={() => openInNewTab(item.stopProxy)}>Stop</button> {/if}
            {#if item.activateSecurity} <button title="Activate Pending Security Policy Changes" class="cursor-pointer no-underline text-slate-600" on:click={() => openInNewTab(item.activateSecurity)}><LockIcon size={12} /></button> {/if}
          </div>
        </div>

        <button class="p-2 bg-slate-50 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-lg cursor-pointer transition-colors" on:click={() => extensionStore.dispatch('DELETE_LINK', { id: item.id.toString(), folderName: selectedFolder })}>
          <Trash2 size={16} />
        </button>
      </li>
    {/each}
  </ul>
</main>

<dialog bind:this={manageDialog} class="p-0 rounded-xl shadow-2xl border-0 w-[90%] max-w-sm backdrop:bg-black/60">
  <div class="bg-slate-50 border-b p-3 flex justify-between items-center rounded-t-xl">
    <h2 class="font-bold text-slate-800 text-sm">Manage Workspace</h2>
    <button on:click={() => manageDialog.close()} class="text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"><X size={16} /></button>
  </div>
  
  <div class="p-4 flex flex-col gap-5 bg-white rounded-b-xl">
    <div>
      <h3 class="font-bold text-slate-500 text-[10px] uppercase mb-2">Create Folder</h3>
      <div class="flex gap-1 w-full">
        <input type="text" bind:value={newFolderName} placeholder="e.g. Project Alpha" class="flex-1 p-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500" />
        <button on:click={createFolder} class="bg-slate-800 hover:bg-slate-900 transition-colors text-white px-3 py-2 rounded-lg text-xs font-bold cursor-pointer">Add</button>
      </div>
    </div>
    <hr class="border-slate-100" />
    <div>
      <h3 class="font-bold text-slate-500 text-[10px] uppercase mb-2">Add Link</h3>
      <div class="flex flex-col gap-2">
        <input type="text" bind:value={manualTitle} placeholder="Link Title" class="w-full p-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500" />
        <input type="url" bind:value={manualUrl} placeholder="Paste URL..." class="w-full p-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500" />
        <button on:click={saveManualLink} class="w-full mt-1 bg-blue-600 hover:bg-blue-700 transition-colors text-white py-2 rounded-lg text-xs font-bold cursor-pointer">Save Link</button>
      </div>
    </div>
  </div>
</dialog>

<style>
  dialog::backdrop { background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(2px); }
  
  /* Optional: Clean up the select dropdown arrow slightly if needed */
  select {
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
  }
</style>