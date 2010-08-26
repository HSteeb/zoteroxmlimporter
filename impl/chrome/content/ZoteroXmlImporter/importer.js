// ===================================================================
// ZoteroXmlImporter
// Helmut Steeb 2010-08-21
// Data fields: see https://www.zotero.org/trac/browser/extension/branches/2.0/system.sql

Zotero.XmlImporter = {
  localfileCID  : '@mozilla.org/file/local;1',
  localfileIID  : Components.interfaces.nsILocalFile,
  ROOTNAME: "zotero-import",
  _CREATORTYPES: [
    "author",
    "contributor",
    "editor",
    "translator",
    "seriesEditor",
    "interviewee",
    "interviewer",
    "director",
    "scriptwriter",
    "producer",
    "castMember",
    "sponsor",
    "counsel",
    "inventor",
    "attorneyAgent",
    "recipient",
    "performer",
    "composer",
    "wordsBy",
    "cartographer",
    "programmer",
    "artist",
    "commenter",
    "presenter",
    "guest",
    "podcaster",
    "reviewedAuthor",
    "cosponsor",
    "bookAuthor"
  ],

  init: function () {
    // build map of creator types
    this.CREATORTYPES = {};
    for (var i = 0; i < this._CREATORTYPES.length; ++i) {
      this.CREATORTYPES[this._CREATORTYPES[i]] = 1;
    }
    this.XMLSerializer = new XMLSerializer();
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

  _readData: function(Item, Data, Tags) {
    // file the Data object from the child elements
    // like
    //   <title>Reduction of 3-CNF-SAT</title>

    for (var Field = Item.firstChild; Field; Field = Field.nextSibling) {
      if (!Field.firstChild) { continue; }

      var name = Field.nodeName; // "title"
      if (Item.nodeName == "note") {
        // <note>
        // <text>content <em>emphasized</em></text>
        // <tag>My Tag</tag>
        // </note>
        if (name == "text") {
          // serialize all children of <text> (do not include <text>)
          var text = "";
          for (var Child = Field.firstChild; Child; Child = Child.nextSibling) {
            text += this.XMLSerializer.serializeToString(Child);
          }
          Data[name] = text;
          continue;
        }
        if (name != "tag") {
          continue;
        }
      }

//TODO protect XML (?)
      var value = Field.firstChild.data; // "Reduction of 3-CNF-SAT"
      if (!value) {
        continue;
      }

      // remember tags in separate array
      if (name == "tag") {
        Tags.push(value);
        continue;   
      }
      if (this.CREATORTYPES[name]) {
        // value for creators: [firstName, lastName, creatorType, fieldMode]
        // cf. Zotero.Creator.prototype.save and Zotero.Creator.prototype.serialize in xpcom/data/creator.js
        // fieldmode == 1 is "single-field mode" => firstName must be empty, it is ignored
        if (!Data["creators"]) {
          // assign first value
          Data["creators"] = [];
        }
//TODO firstName / lastName stuff (for now, one string only)
        Data["creators"].push(["", value, name, 1]);
      }
      else {
//TODO check on erroneous multiple occurrence
        Data[name] = value;
      }
    }
  },

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

      ///		if (link) {
      ///			Zotero.Attachments.linkFromDocument(window.content.document, itemID);
      ///		}
      ///		else {
      ///			Zotero.Attachments.importFromDocument(window.content.document, itemID);
      ///		}

      var root = (dom.nodeName.toLowerCase() == this.ROOTNAME && dom) || dom.getElementsByTagName(this.ROOTNAME)[0];
      if (!root) {
        alert(Strings.getString("err.notZoteroFile"));
        return;
      }

      var _RootChildNodes = root.childNodes;
      var Items = [];
      for (var r = 0, len = _RootChildNodes.length; r < len; ++r) {
        if (_RootChildNodes[r].nodeType == Node.ELEMENT_NODE) {
          Items.push(_RootChildNodes[r]);
        }
      }

      // cf. zotero/browser.js, zotero/overlay.js, zotero/xpcom/progressWindow.js
      progressWin = new Zotero.ProgressWindow();
      progressWin.changeHeadline(Strings.getString("import.headline"));
      progressWin.addLines(Strings.getString("import.description").replace(/%d/, Items.length));
      progressWin.show();

      // Use of progress meter cf. zotero/fileInterface.js
      // [noprogress] := the progress meter is shown initially, but not updated (even within 10 seconds)
      // Zotero.UnresponsiveScriptIndicator.disable();
      // var determinate = true;
      // Zotero.showZoteroPaneProgressMeter(Strings.getString("importing").replace(/%d/, Items.length), determinate);

      Zotero.DB.beginTransaction();

      var count = 0;
      var Failed = [];
      for (var i = 0; i < Items.length; ++i) {
        // [noprogress] Zotero.updateZoteroPaneProgressMeter((100 * i) / Items.length);
        var Item = Items[i];
        var itemType = Item.nodeName; // "article"
        var Data = {};
        var Tags = [];
        this._readData(Item, Data, Tags); // ***

        // alert("Adding " + itemType + ": " + Data.title);
        var zItem;
        if (itemType == "note") {
          var text = Data["text"];
          zItem = new Zotero.Item('note');
          //TODO item.libraryID = this.getSelectedLibraryID();
          zItem.setNote(text);
          zItem.save();
        }
        else {
          zItem = Zotero.Items.add(itemType, Data); // returns a Zotero.Item instance
          if (!zItem) {
            Failed.push(itemType + ": " + Data.title);
          }
        }
        if (zItem) {
          for (var t = 0; t < Tags.length; ++t) {
            zItem.addTag(Tags[t]);
          }
          ++count;
        }
      } // for Items

      // inform user about result
      var info = Strings.getString("itemsAdded") + " " + count;
      if (Failed.length) {
        info += "\n\n" + Strings.getString("err.addItem") + " " + Failed.length + "\n\n" + Failed.join("\n");
      }
      Zotero.DB.commitTransaction();
      progressWin.close();
      // [noprogress] Zotero.hideZoteroPaneOverlay();
      // [noprogress] Zotero.UnresponsiveScriptIndicator.enable();
      alert(info);
    }
    catch (e) {
      if (progressWin) {
        progressWin.changeHeadline(Strings.getString("import.error"));
        progressWin.progress.startCloseTimer();
      }
      throw e;
    }
  }
  
};

// Initialize the utility
window.addEventListener('load', function(e) { Zotero.XmlImporter.init(); }, false);
