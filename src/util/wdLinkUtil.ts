import WDLink from "src/types/WDLink";

export const wdProd = (url: string) => {
  // https://doc.workday.com/admin-guide/en-us/authentication-and-security/authentication/authentication-references/ele1400114318375.html
  let prod = false;
  const urlLower = url.toLowerCase();
  if (urlLower.indexOf('myworkday.com') > 0 || urlLower.indexOf('myworkdaygov.com') > 0) {
    const subs = urlLower.split('.');
    if (subs[0].indexOf('impl') < 0 && subs[0].indexOf('dev') < 0) {
      prod = true;
    }
  }

  return prod;

}

export const wdLinkUpdate = (wdLink: WDLink) => {
    try {
      if (wdLink) {
        const prod = wdProd(wdLink.url);

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
          wdLink.activateSecurity = uri + '/d/task/2997$1904.htmld';
          wdLink.login = uri + '/login.htmld?redirect=n';
          if (uriArr.length > 3 && wdLink.url.toLowerCase().indexOf("workday") > 0) {
            wdLink.tenant = uriArr[3] + (prod ? ' - prod' : '');
          }

          if (prod) {
            wdLink.proxy = '';
            wdLink.stopProxy = '';
          }
        }
      }
    }
    catch(e) {}

    return wdLink;   
  };
