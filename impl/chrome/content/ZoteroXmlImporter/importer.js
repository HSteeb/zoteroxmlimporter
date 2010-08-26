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

  _readNodeTextChildren: function(Field)
  {
    // serialize all children of <text> (do not include <text>)
    var text = "";
    for (var Child = Field.firstChild; Child; Child = Child.nextSibling) {
      text += this.XMLSerializer.serializeToString(Child);
    }
    return text;    
  },

  // fill the Data and Tags objects from the child elements of Item
  // - Item: like
  //   <document><title>Reduction of 3-CNF-SAT</title>...</document>
  // - Data:
  //   for Item.nodeName == "note", puts note text into Data.text
  // - Tags: array of tag strings, taken from <tag> child elements of Item
  // - Notes: array of note (rich text, not checked) strings, taken from <note> child elements of Item
  // - Attachments: array of (URI, not checked) strings, taken from <attachment> child elements of Item
  _readData: function(Item, Data, Tags, Notes, Links)
  {

    for (var Field = Item.firstChild; Field; Field = Field.nextSibling) {
      if (!Field.firstChild) { continue; }

      var name = Field.nodeName; // "title"
      if (Item.nodeName == "note") {
        // <note>
        // <text>content <em>emphasized</em></text>
        // <tag>My Tag</tag>
        // </note>
        if (name == "text") {
          Data[name] = this._readNodeTextChildren(Field);
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
        // <tag>My Tag</tag>
        Tags.push(value);
        continue;   
      }

      // remember notes in separate array
      if (name == "note") {
        // <document>
        // <note>content <em>emphasized</em></note>
        // </document>
        Notes.push(this._readNodeTextChildren(Field));
        continue;   
      }

      // remember links in separate array (no child note supported yet)
      if (name == "link") {
        // <document>
        // <link>http://example.com</link>
        // </document>
        Links.push(value);
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

      var root = (dom.nodeName.toLowerCase() == this.ROOTNAME && dom) || dom.getElementsByTagName(this.ROOTNAME)[0];
      if (!root) {
        alert(Strings.getString("err.notZoteroFile"));
        return;
      }

      // Items := all child elements of root node
      var _RootChildNodes = root.childNodes;
      var Items = [];
      for (var r = 0, len = _RootChildNodes.length; r < len; ++r) {
        if (_RootChildNodes[r].nodeType == Node.ELEMENT_NODE) {
          Items.push(_RootChildNodes[r]);
        }
      }

      // setup progress meter
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

      // import each item
      var count = 0;
      var Failed = [];
      for (var i = 0; i < Items.length; ++i) {
        // [noprogress] Zotero.updateZoteroPaneProgressMeter((100 * i) / Items.length);
        var Item = Items[i];
        var itemType = Item.nodeName; // "article"
        var Data = {};
        var Tags = [];
        var Notes = [];
        var Links = [];

        this._readData(Item, Data, Tags, Notes, Links); // ***

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
        progressWin.changeHeadline(Strings.getString("import.error") + " " + e);
        progressWin.startCloseTimer();
      }
      throw e;
    }
  }
  
};

// Initialize the utility
window.addEventListener('load', function(e) { Zotero.XmlImporter.init(); }, false);
