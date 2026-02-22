type WDLink = {
  id: string | number;  // bookmark node ID from Chrome
  title: string;
  url: string;
  tenant: string;
  proxy: string;
  stopProxy: string;
  activateSecurity: string;
  login: string;
  folder?: string;      // "Global" maps to WD Sidekick root; any other string = subfolder
};

export default WDLink;