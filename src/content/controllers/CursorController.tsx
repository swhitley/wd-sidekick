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
      document.addEventListener('mousemove', this.handleTopNav);
      document.addEventListener('mousemove', this.handleMouseMove);
    });

    return this;
  }

  handleTopNav = () => {    
    //
    try {
      if (window.location.href.indexOf("workday") < 0) {
        return;
      }

      let url = window.location.href;
      if (url) {
        if (url.indexOf("/d/") > 0 ) {
          url = url.substring(0, url.indexOf("/d/") + 3);
        }
      }

      let wdLink = { title: '', url: url, tenant: '', proxy: '', stopProxy: '', login: '' };
      wdLinkUpdate(wdLink);

      // Stop Proxy
      if (document.querySelector(".wdappchrome-aak:nth-child(2)") && !document.querySelector("#stopProxy")) {
        let onBehalfOf = document.querySelector(".wdappchrome-aak:nth-child(2)");
        if (onBehalfOf) {
          let divOuter = document.createElement("div");
          divOuter.setAttribute("style", "width:100%;");
          onBehalfOf.appendChild(divOuter);
          let divInner = document.createElement("div");
          divInner.setAttribute("style", "position:absolute;right:100px;top:5px;");
          onBehalfOf.appendChild(divInner);
          
          // Stop Proxy
          var stopProxy = document.createElement("a");
          stopProxy.setAttribute("href", wdLink.stopProxy);
          stopProxy.setAttribute("id", "stopProxy");
          stopProxy.setAttribute("style", "margin-left:26px;color:white;");
          stopProxy.setAttribute("title", "Stop Proxy");
          stopProxy.innerHTML = "Stop Proxy";
          divInner.appendChild(stopProxy);
        }
      }

      if (!document.querySelector("#startProxy") && document.querySelector(".wdappchrome-aak")) {
        let aak = document.querySelector(".wdappchrome-aak");
        if (aak) {
          let divOuter = document.createElement("div");
          divOuter.setAttribute("style", "width:100%;");
          aak.appendChild(divOuter);
          let divInner = document.createElement("div");
          divInner.setAttribute("style", "position:absolute;right:100px;top:5px;");
          aak.appendChild(divInner);

          // Start Proxy
          let startProxy = document.createElement("a");
          startProxy.setAttribute("href", wdLink.proxy);
          startProxy.setAttribute("id", "startProxy");
          startProxy.setAttribute("style", "margin-left:26px;color:white;");
          startProxy.setAttribute("class", "gwt-Label");
          startProxy.setAttribute("title", "Start Proxy");
          startProxy.innerHTML = "Start Proxy";
          divInner.appendChild(startProxy);
        }
      } 
    }
    catch (e) {} 
    
    return this;  
  };

  handleMouseMove = (e:MouseEvent) => {    
    try {
      var elem = document.elementFromPoint(e.clientX, e.clientY);

      if (window.location.href.indexOf("workday") < 0) {
        return;
      }

      if (elem && elem.closest("[data-automation-widget=wd-popup]")) {
        let wdLink = { title: '', url: '', tenant: '', proxy: '', stopProxy: '', login: '' };
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
            let newWDLink = wdLinkUpdate(wdLink);
            if (newWDLink.proxy.length > 0) {
              this.store.dispatch(setWDLink(newWDLink));
              if (!popup.querySelector('.startProxy')) {
                let startProxyDiv = document.createElement("div");
                startProxyDiv.setAttribute("class", "WFUN WOTN WKTN");
                let startProxy = document.createElement("a");
                startProxy.setAttribute("href", wdLink.proxy);
                startProxy.setAttribute("class", "startProxy");
                startProxy.setAttribute("style","text-decoration:none;color:#5b6166;");
                startProxy.setAttribute("title", "Start Proxy");
                startProxy.innerHTML = "Start Proxy";
                startProxyDiv.appendChild(startProxy);
                popup.appendChild(startProxyDiv);
              }
            }
          }
        }     
      }      
    }
    catch (e) {} 
  };
}

export default CursorController;
