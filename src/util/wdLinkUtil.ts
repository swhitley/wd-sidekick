import WDLink from "src/types/WDLink";

export const wdLinkUpdate = (wdLink: WDLink) => {
    try {
      if (wdLink) {
        const uriArr = wdLink.url.split('/');
        if (uriArr.length > 3) {
          wdLink.tenant = uriArr[3];
        }

        if (wdLink.url.indexOf('/inst/') > 0) {        
          var uri = wdLink.url.substring(0, wdLink.url.indexOf('/d/inst/'));
          var workerId = wdLink.url.substring(wdLink.url.lastIndexOf('/')+1).split('.')[0];
          if (uri.length > 0 && workerId.length > 0) {
            wdLink.proxy = uri + '/d/inst/' + workerId + '/rel-task/2997$7270.htmld';
            wdLink.stopProxy = uri + '/d/task/2997$12115.htmld';
            wdLink.login = uri + '/login.htmld?redirect=n';
          }        
        }
      }
    }
    catch(e) {}

    return wdLink;   
  };
