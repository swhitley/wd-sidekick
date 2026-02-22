import { wdLinkUpdate, wdProd } from '@/util/wdLinkUtil';
import type WDLink from '@/types/WDLink';

export class CursorController {
  private alwaysOn: boolean = false;
  private isPanelOpen: boolean = false;
  private keepAlivePort: chrome.runtime.Port | null = null;
  private navCheckInterval: NodeJS.Timeout | null = null;

  // Star Paste State
  private isStarPasteActive: boolean = false;
  private clipboardValues: string[] = [];
  private currentIndex: number = 0;

  init() {
    chrome.storage.sync.get(['alwaysOn'], (syncRes) => {
      chrome.storage.local.get(['isPanelOpen'], (localRes) => {
        
        this.alwaysOn = syncRes.alwaysOn === true || syncRes.alwaysOn === 'true';
        this.isPanelOpen = localRes.isPanelOpen === true || localRes.isPanelOpen === 'true';

        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', () => this.updateListeners());
        } else {
          this.updateListeners();
        }
      });
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      // If the USER changes a setting (on any device, synced remotely)
      if (area === 'sync' && changes.alwaysOn) {
        this.alwaysOn = changes.alwaysOn.newValue === true || changes.alwaysOn.newValue === 'true';
        this.updateListeners();
      }

      // If the PANEL opens/closes (on THIS local device only)
      if (area === 'local' && changes.isPanelOpen) {
        this.isPanelOpen = changes.isPanelOpen.newValue === true || changes.isPanelOpen.newValue === 'true';
        this.updateListeners();
      }
    });
  }

  private updateListeners() {
    // Active if "Always On" is enabled OR Side Panel is actively open
    const active = this.alwaysOn || this.isPanelOpen;

    if (this.alwaysOn && !this.keepAlivePort) {
      // Establish a connection to keep the background service worker awake
      this.keepAlivePort = chrome.runtime.connect({ name: 'keep-alive-port' });
      this.keepAlivePort.onDisconnect.addListener(() => {
        this.keepAlivePort = null;
        if (this.alwaysOn) this.updateListeners();
      });
    } else if (!this.alwaysOn && this.keepAlivePort) {
      this.keepAlivePort.disconnect();
      this.keepAlivePort = null;
    }
    // ----------------------------

    if (active) {
      document.addEventListener('click', this.handleClickPaste);
      if (!this.navCheckInterval) {
          this.handleTopNav(); // Run once immediately
          this.navCheckInterval = setInterval(() => this.handleTopNav(), 2000);
      }
      console.log("WD Sidekick: Listeners ON");
    } else {
      document.removeEventListener('click', this.handleClickPaste);
      if (this.navCheckInterval) {
          clearInterval(this.navCheckInterval);
          this.navCheckInterval = null;
      }
      console.log("WD Sidekick: Listeners OFF");
    }
  }

  handleClickPaste = (e: MouseEvent) => {
    try {
      if (window.location.href.toLowerCase().indexOf("workday") < 0) return;
  
      if (!e.target) return;
      const elem = e.target as HTMLElement;
      
      let input = (elem.tagName === 'INPUT' ? elem : (elem.closest("input") || elem.querySelector("input"))) as HTMLInputElement;
      
      if (!input) return;

      if (input.type === 'checkbox' || input.type === 'radio') return;

      // Star Paste Logic
      if (input.value === '*') {
        this.isStarPasteActive = !this.isStarPasteActive;
        input.value = ''; // Clear the asterisk
        this.currentIndex = 0;
        this.clipboardValues = []; // Clear previous clipboard values

        if (this.isStarPasteActive) {
              navigator.clipboard.readText().then((clipText) => {
                this.clipboardValues = clipText.split('\n').filter(Boolean);
                const nextValue = this.clipboardValues[this.currentIndex];
                input.value = nextValue;
                this.currentIndex++;
              }).catch(err => {
                console.error("WD Sidekick: Failed to read clipboard", err);
              });
          }        
      }

      if (this.isStarPasteActive && this.clipboardValues.length > 0) {
        if (this.currentIndex === 0 || this.currentIndex >= this.clipboardValues.length) return;
        const nextValue = this.clipboardValues[this.currentIndex];
        input.value = nextValue;
        this.currentIndex++;
      }
      // Workday's frontend needs these simulated events to register the value change
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    } catch (err) {
      console.error("WD Sidekick: Paste error:", err);
    }
  };

  handleTopNav = () => {
    try {
      let url = window.location.href;
      
      if (url.toLowerCase().indexOf("workday") < 0 || wdProd(url)) {
        return;
      }

      if (url.indexOf("/d/") > 0 ) {
        url = url.substring(0, url.indexOf("/d/") + 3);
      }

      let wdLink: WDLink = { id: 0, title: '', url: url, tenant: '', proxy: '', stopProxy: '', activateSecurity: '', login: '' };
      const updatedLink = wdLinkUpdate(wdLink);

      if (document.querySelector("[name='username']")){
        let elem = document.querySelector("[name='username']");
        const input = elem.tagName === 'INPUT' ? (elem as HTMLInputElement) : elem.closest("input") as HTMLInputElement;  
        if (input.value.length === 0) {   
          const uriArr = url.split('/'); 
          if (uriArr.length > 5) {
            input.value = uriArr[5];  
          }
        }
      }

      if (document.querySelector("[data-automation-id='banner']:nth-child(2)") && !document.querySelector("#stopProxy")) {
        let onBehalfOf = document.querySelector("[data-automation-id='banner']:nth-child(2)");
        if (onBehalfOf) {
          let divOuter = document.createElement("div");
          divOuter.setAttribute("style", "width:100%;");
          onBehalfOf.appendChild(divOuter);
          
          let divInner = document.createElement("div");
          divInner.setAttribute("style", "position:absolute;right:100px;top:5px;");
          onBehalfOf.appendChild(divInner);
          
          let stopProxy = document.createElement("a");
          stopProxy.setAttribute("href", updatedLink.stopProxy);
          stopProxy.setAttribute("id", "stopProxy");
          stopProxy.setAttribute("style", "margin-left:26px;color:white;");
          stopProxy.setAttribute("title", "Stop Proxy");
          stopProxy.innerHTML = "Stop Proxy";
          divInner.appendChild(stopProxy);
        }
      }

      if (!document.querySelector("#startProxy") && document.querySelector("[data-automation-id='banner']")) {
        let banner = document.querySelector("[data-automation-id='banner']:nth-child(1)");
        if (banner) {
          let divOuter = document.createElement("div");
          divOuter.setAttribute("style", "width:100%;");
          banner.appendChild(divOuter);
          
          let divInner = document.createElement("div");
          divInner.setAttribute("style", "position:absolute;right:100px;top:5px;");
          banner.appendChild(divInner);

          let startProxy = document.createElement("a");
          startProxy.setAttribute("href", updatedLink.proxy);
          startProxy.setAttribute("id", "startProxy");
          startProxy.setAttribute("style", "margin-left:26px;color:white;");
          startProxy.setAttribute("class", "gwt-Label");
          startProxy.setAttribute("title", "Start Proxy");
          startProxy.innerHTML = "Start Proxy";
          divInner.appendChild(startProxy);

          if (updatedLink.activateSecurity) {
            let divider = document.createElement("span");
            divider.setAttribute("style", "margin-left:12px;color:white;");
            divider.innerHTML = "|";
            divInner.appendChild(divider);
            let activateSecurity = document.createElement("a");
            activateSecurity.setAttribute("href", updatedLink.activateSecurity);
            activateSecurity.setAttribute("id", "activateSecurity");
            activateSecurity.setAttribute("style", "margin-left:12px;color:white;text-decoration:none");
            activateSecurity.setAttribute("class", "gwt-Label");
            activateSecurity.setAttribute("title", "Activate Pending Security Policy Changes");
            activateSecurity.innerHTML = "🔒";
            divInner.appendChild(activateSecurity);
          }
        }
      } 
    } catch (e) {
      console.error("WD Sidekick: Top Nav error:", e);
    } 
  };
}

const controller = new CursorController();
controller.init();