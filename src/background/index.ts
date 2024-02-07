import { getCurrentTab, injectContentScript } from 'src/background/util';
import buildStoreWithDefaults from 'src/state/store';
import storage from 'src/util/storageUtil';
import PortNames from '../types/PortNames';

buildStoreWithDefaults({ portName: PortNames.ContentPort });

storage.setItem('panelOpen', false);

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error: any) => console.error(error));

chrome.tabs.onUpdated
    .addListener(async (tabId, changeInfo, tab) => {
      try {
        if (!(tab.id && changeInfo.status === 'complete')) return;

        if (window.location.href.indexOf('workday') < 0) return;

        if (await storage.getItem('panelOpen')) {
          injectContentScript(tabId);
        }
      }
      catch (e) {}
    });

chrome.runtime.onConnect.addListener(port => {
  port.onMessage.addListener(async msg => {
    try {
      if (port.name === PortNames.SidePanelPort) {
        if (msg.type === 'init') {
          await storage.setItem('panelOpen', true);

          port.onDisconnect.addListener(async () => {
            await storage.setItem('panelOpen', false);
          });

          const tab = await getCurrentTab();

          if (!tab?.id) {
            console.error("Couldn't get current tab");
            return;
          }

          injectContentScript(tab.id);

          port.postMessage({
            type: 'handle-init',
            message: 'panel open'
          });
        }
      }
    }
    catch (e) {}
  });
});

export {};
