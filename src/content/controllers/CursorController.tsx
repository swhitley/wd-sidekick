import { Store } from 'webext-redux';

import { setWDLink } from "src/state/slices/content";
import { State } from 'src/state/State';
import { createStoreProxy } from 'src/state/store';
import PortNames from "src/types/PortNames";
import { wdLinkUpdate, wdProd } from 'src/util/wdLinkUtil';
import ContentProvider from '../contracts/ContentProvider';

var _starPaste: boolean = false;

class CursorController implements ContentProvider {
  app: HTMLElement | null = null;
  store: Store<State> = createStoreProxy(PortNames.ContentPort);
  async register() {
    this.store.ready().then(() => {
      document.addEventListener('mousemove', this.handleTopNav);
      document.addEventListener('mousemove', this.handleMouseMove);
      document.addEventListener('click', this.handleClickPaste);
    });

    return this;
  }  

  handleClickPaste = (e: MouseEvent) => {
    
    try {
      if (window.location.href.indexOf("workday") < 0) {
        return;
      }
  
      if (!e.target) return;      

      const elem = e.target as HTMLElement;
      const input = elem.closest("input");
      
      if (!input) return; 

      if (input.value === '*') {
        _starPaste = !_starPaste;
      }

      if (_starPaste) {
        navigator.clipboard.readText().then(clipText => {
          let items = clipText.split('\n');
          const next = items.shift();
          navigator.clipboard.writeText(items.join('\n'));
          if (next) {
            input.value = next.toString();
          }          
        }); 
      }
    } catch (e) {}             

    return this;
  };

  handleTopNav = () => {    
    //
    try {
      
      if (window.location.href.indexOf("workday") < 0) {
        return;
      }

      let url = window.location.href;
      if (wdProd(url)) {
        return;
      }

      if (url) {
        if (url.indexOf("/d/") > 0 ) {
          url = url.substring(0, url.indexOf("/d/") + 3);
        }
      }

      let wdLink = { title: '', url: url, tenant: '', proxy: '', stopProxy: '', activateSecurity: '', login: '' };
      wdLinkUpdate(wdLink);

      // Top Nav
      // Stop Proxy
      if (document.querySelector("[data-automation-id='banner']:nth-child(2)") && !document.querySelector("#stopProxy")) {
        let onBehalfOf = document.querySelector("[data-automation-id='banner']:nth-child(2)");
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

      // Top Nav
      if (!document.querySelector("#startProxy") && document.querySelector("[data-automation-id='banner']")) {
        let banner = document.querySelector("[data-automation-id='banner']:nth-child(1)");
        if (banner) {
          let divOuter = document.createElement("div");
          divOuter.setAttribute("style", "width:100%;");
          banner.appendChild(divOuter);
          let divInner = document.createElement("div");
          divInner.setAttribute("style", "position:absolute;right:100px;top:5px;");
          banner.appendChild(divInner);

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

      const url = window.location.href;

      if (url.indexOf("workday") < 0) {
        return;
      }

      if (elem && elem.closest("[data-automation-widget=wd-popup]")) {
        let wdLink = { title: '', url: '', tenant: '', proxy: '', stopProxy: '', activateSecurity: '',  login: '' };
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
              if (!wdProd(url) && !popup.querySelector('.startProxy')) {
                let startProxyDiv = document.createElement("div");
                startProxyDiv.setAttribute("class", "gwt-Label WF2M WO1M WK1M");
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
