import { Store } from 'webext-redux';

import { setWDLink } from "src/state/slices/content";
import { State } from 'src/state/State';
import { createStoreProxy } from 'src/state/store';
import PortNames from "src/types/PortNames";
import { wdLinkUpdate } from 'src/util/wdLinkUtil';
import ContentProvider from '../contracts/ContentProvider';

class CursorController implements ContentProvider {
  app: HTMLElement | null = null;
  store: Store<State> = createStoreProxy(PortNames.ContentPort);
  async register() {
    this.store.ready().then(() => {
      document.addEventListener('mousemove', this.handleMouseMove);
    });

    return this;
  }

  handleMouseMove = (e:MouseEvent) => {    
    try {
      let wdLink = { title: '', url: '', tenant: '', proxy: '', stopProxy: '', login: '' };
      var elem = document.elementFromPoint(e.clientX, e.clientY);
      if (elem && elem.closest("[data-automation-widget=wd-popup]")) {
        var popup = elem.closest("[data-automation-widget=wd-popup]");
        if (popup) {
          var copyText = popup.querySelector("[data-automation-id=copyText]");
          var copyUrl = popup.querySelector("[data-automation-id=copyUrl]"); 

          if (!copyText) {
            let tmp = Array.from(popup.querySelectorAll("li")).find(el => el.textContent === 'Copy Text');
            if (tmp) {
              copyText = tmp;
            }
          }

          if (!copyUrl) {
            let tmp = Array.from(popup.querySelectorAll("li")).find(el => el.textContent === 'Copy URL');
            if (tmp) {
              copyUrl = tmp;
            }
          }         

          if (copyText?.hasAttribute("data-clipboard-text")) {
            wdLink.title = copyText.getAttribute("data-clipboard-text") + "";
          }

          if (copyUrl?.hasAttribute("data-clipboard-text")) {
            wdLink.url = copyUrl.getAttribute("data-clipboard-text") + "";
            wdLink = wdLinkUpdate(wdLink);
          }
        }
        
        this.store.dispatch(setWDLink(wdLink));        
      }      
    }
    catch (e) {} 
  };
}

export default CursorController;
