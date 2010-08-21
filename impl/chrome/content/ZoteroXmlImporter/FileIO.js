/////////////////////////////////////////////////
/////////////////////////////////////////////////
//
// Basic JavaScript File and Directory IO module
// By: MonkeeSage, v0.1
//
// 2008-03-01 HS: from
//   http://kb.mozillazine.org/Io.js
// 2009-03-13 HS: moved into Moz namespace, split io.js into Moz.FileIO.js and Moz.DirIO.js
/////////////////////////////////////////////////
/////////////////////////////////////////////////

/* 2009-03-13 HS: moved into Moz namespace */
var Moz;
if (!Moz) {
  Moz = {};
}
else if (typeof Moz != "object") {
  throw new Error("Moz already exists and is not an object");
}

  /////////////////////////////////////////////////
  // Basic file IO object based on Mozilla source
  // code post at forums.mozillazine.org
  /////////////////////////////////////////////////

  // Example use:
  // var fileIn = FileIO.open('/test.txt');
  // if (fileIn.exists()) {
  //   var fileOut = FileIO.open('/copy of test.txt');
  //   var str = FileIO.read(fileIn);
  //   var rv = FileIO.write(fileOut, str);
  //   alert('File write: ' + rv);
  //   rv = FileIO.write(fileOut, str, 'a');
  //   alert('File append: ' + rv);
  //   rv = FileIO.unlink(fileOut);
  //   alert('File unlink: ' + rv);
  // }

  Moz.FileIO = {

    localfileCID  : '@mozilla.org/file/local;1',
    localfileIID  : Components.interfaces.nsILocalFile,

    finstreamCID  : '@mozilla.org/network/file-input-stream;1',
    finstreamIID  : Components.interfaces.nsIFileInputStream,

    foutstreamCID : '@mozilla.org/network/file-output-stream;1',
    foutstreamIID : Components.interfaces.nsIFileOutputStream,

    sinstreamCID  : '@mozilla.org/scriptableinputstream;1',
    sinstreamIID  : Components.interfaces.nsIScriptableInputStream,

    suniconvCID   : '@mozilla.org/intl/scriptableunicodeconverter',
    suniconvIID   : Components.interfaces.nsIScriptableUnicodeConverter,

    open   : function(path) {
      try {
        var file = Components.classes[this.localfileCID]
                .createInstance(this.localfileIID);
        file.initWithPath(path);
        return file;
      }
      catch(e) {
        return false;
      }
    },

    read   : function(file, charset) {
      try {
        var data     = new String();
        var fiStream = Components.classes[this.finstreamCID]
                  .createInstance(this.finstreamIID);
        var siStream = Components.classes[this.sinstreamCID]
                  .createInstance(this.sinstreamIID);
        fiStream.init(file, 1, 0, false);
        siStream.init(fiStream);
        data += siStream.read(-1);
        siStream.close();
        fiStream.close();
        if (charset) {
          data = this.toUnicode(charset, data);
        }
        return data;
      }
      catch(e) {
        return false;
      }
    },

    write  : function(file, data, mode, charset) {
      try {
        var foStream = Components.classes[this.foutstreamCID]
                  .createInstance(this.foutstreamIID);
        if (charset) {
          data = this.fromUnicode(charset, data);
        }
        var flags = 0x02 | 0x08 | 0x20; // wronly | create | truncate
        if (mode == 'a') {
          flags = 0x02 | 0x10; // wronly | append
        }
        foStream.init(file, flags, 0664, 0);
        foStream.write(data, data.length);
        // foStream.flush();
        foStream.close();
        return true;
      }
      catch(e) {
//TODO low 2008-08-14 HS
//alert("FileIO.write: " + e);
        return false;
      }
    },

    create : function(file) {
      try {
        file.create(0x00, 0664);
        return true;
      }
      catch(e) {
        return false;
      }
    },

    unlink : function(file) {
      try {
        file.remove(false);
        return true;
      }
      catch(e) {
        return false;
      }
    },

    path   : function(file) {
      try {
        return 'file:///' + file.path.replace(/\\/g, '\/')
              .replace(/^\s*\/?/, '').replace(/\ /g, '%20');
      }
      catch(e) {
        return false;
      }
    },

    toUnicode   : function(charset, data) {
      try{
        var uniConv = Components.classes[this.suniconvCID]
                  .createInstance(this.suniconvIID);
        uniConv.charset = charset;
        data = uniConv.ConvertToUnicode(data);
      }
      catch(e) {
        // foobar!
      }
      return data;
    },

    fromUnicode : function(charset, data) {
      try {
        var uniConv = Components.classes[this.suniconvCID]
                  .createInstance(this.suniconvIID);
        uniConv.charset = charset;
        data = uniConv.ConvertFromUnicode(data);
        // data += uniConv.Finish();
      }
      catch(e) {
        // foobar!
      }
      return data;
    },

    // 2009-03-13 HS added:
    exists: function(path) // HS
    {
      var file = this.open(path);n
      return file && file.exists();
    },

    loadText: function(url) // HS
    {
      var filename = url.replace(/file:\/\//, "");
      var file = this.open(filename);
//TODO low 2008-12-23 HS - need "utf-8"?
      return this.read(file, "utf-8");
    },

    saveText: function(text, url) // HS
    {
      var filename = url.replace(/file:\/\//, "");
      var file = this.open(filename);
      // 2008-05-03 HS:
      // without passing "utf-8", the utf-8 string is saved as latin1 :-((
      if (!this.write(file, text, "", "utf-8")) {
        //alert("Saving to " + filename + " failed.");
        return 0;
      }
      return 1;
    },

    // save("bla", "file:///name.txt")
    // save("bla", "name.txt")
    // save(tree,  "name.txt") serializes and saves XML (utf-8)
    save: function(tree, url) // HS
    {
      var s;
      if (typeof tree == "string") {
        s = tree;
      }
      else {
        var ser = new XMLSerializer();
        s = ser.serializeToString(tree);
      }
      return this.saveText(s, url);
    }

  };
