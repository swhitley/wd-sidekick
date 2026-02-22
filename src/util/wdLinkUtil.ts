import { WDLink } from '@/types/WDLink';

/**
 * Check if a Workday URL is a production environment
 * https://doc.workday.com/admin-guide/en-us/authentication-and-security/authentication/authentication-references/ele1400114318375.html
 */
export function wdProd(url: string): boolean {
 
  let prod = false;
  try {
  const urlLower = url.toLowerCase();
  if (urlLower.indexOf('myworkday.com') > 0 || urlLower.indexOf('myworkdaygov.com') > 0) {
    const subs = urlLower.split('.');
    if (subs[0].indexOf('impl') < 0 && subs[0].indexOf('dev') < 0) {
      prod = true;
    }
  }
  } catch (e) {
    console.error("Production check failed", e);
  }

  return prod;
}

/**
 * Update a WDLink with generated proxy URLs and metadata
 */
export function wdLinkUpdate(wdLink: WDLink): WDLink {
  try {
    if (wdLink && wdLink.url) {
      const prod = wdProd(wdLink.url);
      const uriArr = wdLink.url.split('/');
      const dIndex = wdLink.url.indexOf('/d/');

      if (dIndex === -1) {
          return wdLink; 
      }

      const uri = wdLink.url.substring(0, dIndex);
      
      if (uri.length > 0) {
        // Handle object instance links
        if (wdLink.url.indexOf('/inst/') > 0) {
          const workerId = wdLink.url.substring(wdLink.url.lastIndexOf('/') + 1).split('.')[0];
          if (workerId.length > 0) {
            wdLink.proxy = uri + '/d/inst/' + workerId + '/rel-task/2997$7270.htmld';
          }
        } else {
          wdLink.proxy = uri + '/d/task/2997$6729.htmld';
        }

        wdLink.stopProxy = uri + '/d/task/2997$12115.htmld';
        wdLink.activateSecurity = uri + '/d/task/2997$1904.htmld';
        wdLink.login = uri + '/login.htmld?redirect=n';
        
        if (uriArr.length > 3 && wdLink.url.toLowerCase().indexOf("workday") > 0) {
          wdLink.tenant = uriArr[3] + (prod ? ' - prod' : '');
        }

        // Production safety: Disable proxy actions in prod environments
        if (prod) {
          wdLink.proxy = '';
          wdLink.stopProxy = '';
        }
      }
    }
  } catch (e) {
    console.error("Link update failed", e);
  }
  return wdLink;
}

/**
 * Open a URL in a new browser tab
 */
export function openInNewTab(url: string | undefined) {
  if (url) {
    window.open(url, '_blank');
  }
}