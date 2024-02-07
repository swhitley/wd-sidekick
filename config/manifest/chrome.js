const base = require('./v3');

module.exports = {
  ...base,

  // Replace with your Chrome extension public key to maintain consistent extension id
  // see https://stackoverflow.com/questions/21497781/how-to-change-chrome-packaged-app-id-or-why-do-we-need-key-field-in-the-manifest/21500707#21500707
  key: `-----BEGIN PUBLIC KEY-----
  MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAjf3cv1GT3tG8CYYW2WbP
  cZT8OIEWuTCn7vxNVyoGvPrgr3ZoqI0FK5ikrXIQUVU/JeOwNAEMhYJ9ebHfI7no
  8TMevvenVpBO+yi9fBPI4bprCMUr3ieU/SbJZpUNgJLHea+dJMRkSdPCWzopDELQ
  pfj94eMoJKHXQXr5bapHgzA9z/7U4BHK7HDgyxajy5USDaQ+rPpDGarEON0I2h5g
  lrT/NMg4Ugzu2Qt5g9pJK13b8ASnqnBsSuHXQtlHPJg3qwqtXMJgkYCFw/LGtQxU
  b5m5JJsOhM4gJccBnEbtT/Q2mOYA/j8lnGSlyGUHeSynh1f7JYx4igJTAnnih1m/
  aQIDAQAB
  -----END PUBLIC KEY-----`
};
