// ===================================================================
// ZoteroXmlImporter
// Helmut Steeb 2010-02-21
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
      if (Field.firstChild && Field.firstChild.data) {
        var name = Field.nodeName; // "title"
//TODO protect XML (?)
        var value = Field.firstChild.data; // "Reduction of 3-CNF-SAT"

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
    }
  },

  import: function() {
    var file;
    var Strings = document.getElementById("xml-importer-strings");
    try {
      var args = {
        title: Strings.getString("dlg.open.title"),
        mode: Components.interfaces.nsIFilePicker.modeOpen,
        filters: [Strings.getString("filedlg.filter"), "*.xml"],
        filterIndex: 0,
//TODO: file path used only for testing
        displayDirectory: Moz.FileIO.open("/steeb/helmut/prj/zotero/impl/ZoteroXmlImporter/test")
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
      //alert("Loaded DOM from " + path);

      // <?xml version="1.0"?>
      // <zotero-import>
      // <article>
      //   <title>Reduction of 3-CNF-SAT</title>
      //   <description>3-CNF-SAT is NP-complete.</description>
      //   <url>http://perl.plover.com/NPC/NPC-3SAT.html</url>
      //   <date>2010-03-13</date>
      // </article>
      // </zotero-import>

      var root = (dom.nodeName.toLowerCase() == this.ROOTNAME && dom) || dom.getElementsByTagName(this.ROOTNAME)[0];
      if (!root) {
        alert(Strings.getString("err.notZoteroFile"));
        return;
      }
      var Items = root.childNodes;
      var count = 0;
      var Failed = [];
      for (var i = 0; i < Items.length; ++i) {
        var Item = Items[i];
        if (Item.nodeType != Node.ELEMENT_NODE) {
          continue;
        }
        var itemType = Item.nodeName; // "article"

        var Data = [];
        var Tags = [];
        this._readData(Item, Data, Tags); // ***

        // alert("Adding " + itemType + ": " + Data.title);
        var zItem = Zotero.Items.add(itemType, Data); // returns a Zotero.Item instance
        if (!zItem) {
          Failed.push(itemType + ": " + Data.title);
        }
        else {
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
      alert(info);
    }
    catch (e) {
      alert("import: " + e.name + ": " + e.message);
      throw e;
    }
  }
  
};

// Initialize the utility
window.addEventListener('load', function(e) { Zotero.XmlImporter.init(); }, false);
