// ===================================================================
// Zotero.XmlImporter
// Prompts for import file, parses and enters data into zotero.
// Helmut Steeb 2010-08-21
// Data fields: see https://www.zotero.org/trac/browser/extension/branches/2.0/system.sql

Zotero.XmlImporter = {
  localfileCID  : '@mozilla.org/file/local;1',
  localfileIID  : Components.interfaces.nsILocalFile,

  init: function () {
  },
  
  loadXML: function(url) {
    try {
      var xhr = new XMLHttpRequest();
      if (url.indexOf("://") == -1) {
        url = "file://" + url;
      }
  
      // http://developer.mozilla.org/en/docs/XMLHttpRequest
      xhr.open("GET", url, false);
      xhr.overrideMimeType('text/xml');
      xhr.send(null);
      // for "file:///", this.xhr.status is 0 on success!!!
      return xhr.responseXML;
    }
    catch (e) {
      alert("loadXML: " + e.name + ": " + e.message);
      throw e;
    }
  },

  _addTags: function(zItem, Tags)
  {
    for (var t = 0, len = Tags.length; t < len; ++t) {
      zItem.addTag(Tags[t]);
    }
  },

  _addNote: function(text, parentItem)
  {
    var nItem = new Zotero.Item('note');
    //TODO item.libraryID = this.getSelectedLibraryID();
    nItem.setNote(text);
    if (parentItem) {
      nItem.setSource(parentItem.id);
    }
    return nItem;
  },

  _addChildNotes: function(zItem, Notes)
  {
    for (var i = 0, len = Notes.length; i < len; ++i) {
      var nItem = this._addNote(Notes[i], zItem);
      nItem.save();
    }
  },

  _addChildLinks: function(zItem, Links)
  {
    for (var i = 0, len = Links.length; i < len; ++i) {
      // see translate.js _itemDone()
      try {
      	var myID = Zotero.Attachments.linkFromURL(Links[i], zItem.id
            // (item.mimeType ? item.mimeType : undefined),
            // (item.title ? item.title : undefined
          );
      }
      catch (e) {
      	//TODO Zotero.debug("Translate: Error adding attachment "+item.url, 2);
      	return;
      }
    }
  },

  // For item creation, cf. Zotero.Translate.prototype._itemDone
  import: function() {
    var file;
    var Strings = document.getElementById("xml-importer-strings");
    var progressWin;
    try {
      var args = {
        title: Strings.getString("dlg.open.title"),
        mode: Components.interfaces.nsIFilePicker.modeOpen,
        filters: [Strings.getString("filedlg.filter"), "*.xml"],
        filterIndex: 0,
//TODO: file path used only for testing
        displayDirectory: Moz.FileIO.open("/steeb/helmut/prj/zotero/ZoteroXmlImporter/test")
      };
      var path = Moz.Dialog.fileDialog(args);
      if (!path) {
        return;
      }
      var dom = this.loadXML(path);
      if (!dom) {
        alert(Strings.getString("err.loadFailed") + path);
        return;
      }

      // setup progress meter
      // cf. zotero/browser.js, zotero/overlay.js, zotero/xpcom/progressWindow.js
      progressWin = new Zotero.ProgressWindow();
      progressWin.changeHeadline(Strings.getString("import.headline"));
      progressWin.show();

      var ItemDatas = Zotero.XmlParser.parse(dom);

      // Use of progress meter cf. zotero/fileInterface.js
      // [noprogress] := the progress meter is shown initially, but not updated (even within 10 seconds)
      // Zotero.UnresponsiveScriptIndicator.disable();
      // var determinate = true;
      // Zotero.showZoteroPaneProgressMeter(Strings.getString("importing").replace(/%d/, ItemDatas.length), determinate);

      Zotero.DB.beginTransaction();

      // import each item
      var count = 0;
      var Failed = [];
      for (var i = 0; i < ItemDatas.length; ++i) {
        // [noprogress] Zotero.updateZoteroPaneProgressMeter((100 * i) / ItemDatas.length);
        var ItemData = ItemDatas[i];
        var itemType = ItemData.itemType; // "article"
        var Data     = ItemData.data;
        var Tags     = ItemData.tags;
        var Notes    = ItemData.notes;
        var Links    = ItemData.links;

        // alert("Adding " + itemType + ": " + Data.title);
        if (itemType == "note") {
          // top-level note
          var zItem = this._addNote(Data["text"]);
          var id = zItem.save(); // "Cannot add tag to unsaved item..."
          zItem = Zotero.Items.get(id);
          this._addTags(zItem, Tags);
          ++count;
        }
        else {
          // item except top-level note
          var zItem = Zotero.Items.add(itemType, Data); // returns a Zotero.Item instance, already save()'d!
          if (!zItem) {
            Failed.push(itemType + ": " + Data.title);
          }
          else {
            this._addTags(zItem, Tags);
            this._addChildNotes(zItem, Notes);
            // TODO no note for child link supported yet!
            this._addChildLinks(zItem, Links);
           ++count;
          }
        }
      } // for ItemDatas

      // inform user about result
      var info = Strings.getString("itemsAdded").replace(/%d/g, count);
      if (Failed.length) {
        info += "\n\n" + Strings.getString("err.addItem") + " " + Failed.length + "\n\n" + Failed.join("\n");
      }
      Zotero.DB.commitTransaction();
      // [noprogress] Zotero.hideZoteroPaneOverlay();
      // [noprogress] Zotero.UnresponsiveScriptIndicator.enable();
      // progressWin.close();
      progressWin.changeHeadline(info);
      progressWin.startCloseTimer();
    }
    catch (e) {
      var s = Strings.getString("import.error") + " " + e;
      Zotero.debug(s);
      if (progressWin) {
        progressWin.changeHeadline(s);
        progressWin.startCloseTimer();
      }
      throw e;
    }
  }
  
};

// Initialize the utility
window.addEventListener('load', function(e) { Zotero.XmlImporter.init(); }, false);
