// ===================================================================
// Mozilla Dialogs
// $Id: Dialog.js 4137 2010-06-07 19:11:56Z helmut $

var Moz;
if (!Moz) {
  Moz = {};
}
else if (typeof Moz != "object") {
  throw new Error("Moz already exists and is not an object");
}

if (!Moz.Dialog) {
  Moz.Dialog = {};
}
else if (typeof Moz.Dialog != "object") {
  throw new Error("Moz.Dialog already exists and is not an object");
}


// fileDialog:
// title = title
// parent = parent window for init() call, defaults to "window"
//   (should be set for dialog on other modal dialog
//    in order to after dialog close
//    get the focus back to the modal dialog, not to the main window)
// mode = one of Components.interfaces.nsIFilePicker.mode{Open,Save,GetFolder,OpenMultiple}
// filters = array of title/filter pairs, like
//   ["Text", "*.txt", "XML", "*.xml"],
//   note that filterAll is appended as last filter (except if suppressFilterAll is given)
// filterIndex = index initially selected filter (0-based)
// defaultString = the filename that should be suggested to the user as a default.
// displayDirectory = the directory to show initially (nsILocalFile, e.g. from Moz.FileIO.open)
// suppressFilterAll = if non-null, does not append filterAll
// wantFile = if given, returns nsIFile, otherwise (= default) returns nsIFile.path


Moz.Dialog.fileDialog = function(args)
{
  try {
    // create picker
    const nsIFilePicker = Components.interfaces.nsIFilePicker;
    var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);

    var w = args.parent || window;
    // setup picker
    fp.init(w, args.title, args.mode);
    if (args.filters != null) {
      while (args.filters.length) {
        var title  = args.filters.shift();
        var filter = args.filters.shift();
        fp.appendFilter(title, filter);
      }
    }
    if (args.suppressFilterAll == null) {
      fp.appendFilters(nsIFilePicker.filterAll);
    }
    if (args.filterIndex != null) {
      fp.filterIndex = args.filterIndex;
    }
    if (args.defaultString != null) {
      fp.defaultString = args.defaultString;
    }
    if (args.displayDirectory) {
      fp.displayDirectory = args.displayDirectory;
    }

    // show picker
    var rv = fp.show();

    // evaluate result
    if (rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace) {
      return args.wantFile ? fp.file : fp.file.path;
    }
    return null;
  }
  catch (e) {
    alert("Moz.Dialog.fileDialog: " + e.name + ": " + e.message);
    throw e;
  }
}

