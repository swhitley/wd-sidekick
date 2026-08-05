import type WDLink from '@/types/WDLink';

/**
 * Check if a Workday URL is a production environment
 * https://doc.workday.com/admin-guide/en-us/authentication-and-security/authentication/authentication-references/ele1400114318375.html
 */
export function wdProd(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    const pathname = urlObj.pathname.toLowerCase();
    
    // Common identifiers in Workday non-production hostnames
    const nonProdHosts = ['impl', 'dev', 'sandbox', 'sbx', 'preview'];
    
    // Identifiers sometimes appended to the tenant name in the URL path (e.g., /companyname_pt1/)
    const nonProdPaths = ['_pt1', '_preview', '_dpt1'];
    
    const isNonProdHost = nonProdHosts.some(keyword => hostname.includes(keyword));
    const isNonProdPath = nonProdPaths.some(keyword => pathname.includes(keyword));

    return !(isNonProdHost || isNonProdPath);
    
  } catch (e) {
    console.error("WD Sidekick production check failed:", e);
    // Fail-safe: default to false (non-prod) if parsing fails so you don't 
    // accidentally trigger prod-only behavior on a malformed URL.
    return false; 
  }
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