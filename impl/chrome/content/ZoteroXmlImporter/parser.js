// ===================================================================
// Zotero.XmlParser
// Converts DOM from input file to ItemData array
// Helmut Steeb 2010-08-27
// Data fields: see https://www.zotero.org/trac/browser/extension/branches/2.0/system.sql

Zotero.XmlParser = {
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
  
  _parseNodeTextChildren: function(Field)
  {
    // serialize all children of <text> (do not include <text>)
    var text = "";
    for (var Child = Field.firstChild; Child; Child = Child.nextSibling) {
      text += this.XMLSerializer.serializeToString(Child);
    }
    return text;    
  },

  // fill the Data and Tags objects from the child elements of ItemNode
  // - ItemNode: like
  //   <document><title>Reduction of 3-CNF-SAT</title>...</document>
  // - Data:
  //   for ItemNode.nodeName == "note", puts note text into Data.text
  // - Tags: array of tag strings, taken from <tag> child elements of ItemNode
  // - Notes: array of note (rich text, not checked) strings, taken from <note> child elements of ItemNode
  // - Attachments: array of (URI, not checked) strings, taken from <attachment> child elements of ItemNode
  _parseItem: function(ItemNode)
  {
    var Data = {};
    var Tags = [];
    var Notes = [];
    var Links = [];

    for (var Field = ItemNode.firstChild; Field; Field = Field.nextSibling) {
      if (!Field.firstChild) { continue; }

      var name = Field.nodeName; // "title"
      if (ItemNode.nodeName == "note") {
        // <note>
        // <text>content <em>emphasized</em></text>
        // <tag>My Tag</tag>
        // </note>
        if (name == "text") {
          Data[name] = this._parseNodeTextChildren(Field);
          continue;
        }
        if (name != "tag") {
          continue;
        }
      }

      var value = Field.firstChild.data;
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
        Notes.push(this._parseNodeTextChildren(Field));
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
    return {"data": Data, "tags": Tags, "notes": Notes, "links": Links};
  },

  // returns array (success) or string (name of error message)
  parse: function(dom) 
  {
    try {
      var root = (dom.nodeName.toLowerCase() == this.ROOTNAME && dom) || dom.getElementsByTagName(this.ROOTNAME)[0];
      if (!root) {
        return "err.notZoteroFile";
      }

      // ItemNodes := all child elements of root node
      var _RootChildNodes = root.childNodes;
      var ItemNodes = [];
      for (var r = 0, len = _RootChildNodes.length; r < len; ++r) {
        if (_RootChildNodes[r].nodeType == Node.ELEMENT_NODE) {
          ItemNodes.push(_RootChildNodes[r]);
        }
      }

      // Use of progress meter cf. zotero/fileInterface.js
      // [noprogress] := the progress meter is shown initially, but not updated (even within 10 seconds)
      // Zotero.UnresponsiveScriptIndicator.disable();
      // var determinate = true;
      // Zotero.showZoteroPaneProgressMeter(Strings.getString("importing").replace(/%d/, ItemNodes.length), determinate);

      // parse each item
      var count = 0;
      var ItemDatas = [];
      for (var i = 0; i < ItemNodes.length; ++i) {
        // [noprogress] Zotero.updateZoteroPaneProgressMeter((100 * i) / ItemNodes.length);
        var ItemNode = ItemNodes[i];
        var itemType = ItemNode.nodeName; // "article"

        var ItemData = this._parseItem(ItemNode); // ***
        if (!ItemData) {
          Zotero.debug("Error parsing item #" + i);
        }
        else {
          ItemData.itemType = itemType;
          ItemDatas.push(ItemData);
        }
      } // for ItemNodes
      return ItemDatas;
    }
    catch (e) {
      Zotero.debug("Error in parsing: " + e);
      throw e;
    }
  }
  
};

// Initialize the utility
window.addEventListener('load', function(e) { Zotero.XmlParser.init(); }, false);
