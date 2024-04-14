import WDLink from "src/types/WDLink";

export const wdLinkUpdate = (wdLink: WDLink) => {
    try {
      if (wdLink) {
        const uriArr = wdLink.url.split('/');
        var uri = wdLink.url.substring(0, wdLink.url.indexOf('/d/'));
        if (uri.length > 0) {
          // Must be an object instance link.
          if (wdLink.url.indexOf('/inst/') > 0) {
            var workerId = wdLink.url.substring(wdLink.url.lastIndexOf('/')+1).split('.')[0];
            if (workerId.length > 0) {
              wdLink.proxy = uri + '/d/inst/' + workerId + '/rel-task/2997$7270.htmld';
            }
          }
          else {
            wdLink.proxy = uri + '/d/task/2997$6729.htmld';
          }

          wdLink.stopProxy = uri + '/d/task/2997$12115.htmld';
          wdLink.login = uri + '/login.htmld?redirect=n';
          if (uriArr.length > 3 && wdLink.url.indexOf("workday") > 0) {
            wdLink.tenant = uriArr[3];
          }
        }
      }
    }
    catch(e) {}

    return wdLink;   
  };
