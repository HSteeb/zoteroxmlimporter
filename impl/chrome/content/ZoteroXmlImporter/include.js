// Only create main object once
if (!Zotero.XmlImporter) {
  const ZoteroXmlImporterLoader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
          .getService(Components.interfaces.mozIJSSubScriptLoader);
  ZoteroXmlImporterLoader.loadSubScript("chrome://ZoteroXmlImporter/content/parser.js");
  ZoteroXmlImporterLoader.loadSubScript("chrome://ZoteroXmlImporter/content/importer.js");
}
