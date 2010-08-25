function Compute( resultType)
{
  var withCreators = document.getElementById("withCreators").checked;

  var lines = document.getElementById("sql").value;
  // 207	INSERT INTO itemTypes VALUES (1,'note',NULL,0);

  var result;

  // parse itemTypes
  var itRE = /INSERT\s+INTO\s+itemTypes\s+VALUES\s*\(\s*(\d+)\s*,\s*['\"](\w+)[\"']/g;
  var itn2s = {}; // itemType number to string
  var its2n = {}; // itemType string to number
  var its = []; // itemType strings
  while ( (result = itRE.exec(lines)) != null) {
    itn2s[result[1]] = result[2];
    its2n[result[2]] = result[1];
    its.push(result[2]);
  }
  its.sort();

  // parse fields
  var fRE = /INSERT\s+INTO\s+fields\s+VALUES\s*\(\s*(\d+)\s*,\s*['\"](\w+)[\"']/g;
  var fn2s = {}; // field number to string
  while ( (result = fRE.exec(lines)) != null) {
    fn2s[result[1]] = result[2];
  }

  // parse itemTypeFields
  var itfRE = /INSERT\s+INTO\s+itemTypeFields\s+VALUES\s*\(\s*(\d+)\s*,\s*(\d+)/g;
  var itfn2N = {}; // itemType number to field numbers
  while ( (result = itfRE.exec(lines)) != null) {
    if (!itfn2N[result[1]]) {
      itfn2N[result[1]] = [];
    }
    itfn2N[result[1]].push(result[2]);
  }

  if (withCreators) {
    // parse creatorTypes
    var ctRE = /INSERT\s+INTO\s+creatorTypes\s+VALUES\s*\(\s*(\d+)\s*,\s*['\"](\w+)[\"']/g;
    var ctn2s = {}; // creatorType number to string
    var cts2n = {}; // creatorType string to number
    var cts = []; // creatorType strings
    while ( (result = ctRE.exec(lines)) != null) {
      ctn2s[result[1]] = result[2];
      cts2n[result[2]] = result[1];
      cts.push(result[2]);
    }
    cts.sort();
  
    // parse itemTypeCreatorTypes
    var itctRE = /INSERT\s+INTO\s+itemTypeCreatorTypes\s+VALUES\s*\(\s*(\d+)\s*,\s*(\d+)/g;
    var itctn2N = {}; // itemType number to creator type numbers
    while ( (result = itctRE.exec(lines)) != null) {
      if (!itctn2N[result[1]]) {
        itctn2N[result[1]] = [];
      }
      itctn2N[result[1]].push(result[2]);
    }
  }


  var s = "";
  if (resultType == "html") {
    // compute HTML
    s = "<html><body>";
  
    // table of contents
    s += "<p>\n";
    for (var i = 0; i < its.length; ++i) {
      var itemType = its[i];
      s += "<a href='#it_" + itemType + "'>" + itemType + "</a><br/>\n";
    }
    s += "</p>\n";
  
    // each itemType
    for (var j = 0; j < its.length; ++j) {
      var itemType = its[j];
      var itemTypeNumber = its2n[itemType];
      s += "<h1 id='it_" + itemType + "' name='it_" + itemType + "''>" + itemType + "</h1>\n";

      // each field
      var FieldNumbers = itfn2N[itemTypeNumber];
      if (FieldNumbers) {
        var F = [];
        // each itemTypeField (sorted)
        for (var f = 0; f < FieldNumbers.length; ++f) {
          var fieldNumber = FieldNumbers[f];
          var fieldName = fn2s[fieldNumber];
          F.push(fieldName);
        }
        F.sort();
        s += "<p>\n" + F.join("<br/>\n") + "</p>\n";
      }

      if (withCreators) {
        // each creator type
        var CreatorTypeNumbers = itctn2N[itemTypeNumber];
        if (CreatorTypeNumbers) {
          var CT = [];
          // each itemTypeCreatorType (sorted)
          for (var ct = 0; ct < CreatorTypeNumbers.length; ++ct) {
            var creatorTypeNumber = CreatorTypeNumbers[ct];
            var creatorTypeName = ctn2s[creatorTypeNumber];
            CT.push(creatorTypeName);
          }
          CT.sort();
          s += "<p>\n" + CT.join("<br/>\n") + "</p>\n";
        }
      }
    }
  }
  else if (resultType == "testfile") {
    // compute XML
    s = "<?xml version='1.0'?>\n"
      + "<zotero-import>\n";
  
    // each itemType
    for (var j = 0; j < its.length; ++j) {
      var itemType = its[j];

      // special handling for:
      // attachment
      if (itemType == "attachment") { continue; }

      var itemTypeNumber = its2n[itemType];
      s += "<" + itemType + ">\n"; // needs closing tag - do not if (!FieldNumbers) { continue; }

      // note
      if (itemType == "note") { 
        s += "<text>My example note with <strong>strong</strong> text, a list with\n<ul>\n<li>item1</li>\n<li>item2</li>\n</ul>\n</text>\n";
      }

      // each field
      var FieldNumbers = itfn2N[itemTypeNumber];
      if (FieldNumbers) {
        var F = [];
        // each itemTypeField (sorted)
        for (var f = 0; f < FieldNumbers.length; ++f) {
          var fieldNumber = FieldNumbers[f];
          var fieldName = fn2s[fieldNumber];
          F.push(fieldName);
        }
        F.sort();
        for (var k = 0; k < F.length; ++k) {
          var fieldName = F[k];
          s += "<" + fieldName + ">";
          if (fieldName == "title") {
            s += itemType + ": ";
          }
          s += fieldName + "...</" + fieldName + ">\n";
        }
      }

      if (withCreators) {
        // each creator type
        var CreatorTypeNumbers = itctn2N[itemTypeNumber];
        if (CreatorTypeNumbers) {
          var CT = [];
          // each itemTypeCreatorType (sorted)
          for (var ct = 0; ct < CreatorTypeNumbers.length; ++ct) {
            var creatorTypeNumber = CreatorTypeNumbers[ct];
            var creatorTypeName = ctn2s[creatorTypeNumber];
            CT.push(creatorTypeName);
          }
          CT.sort();
          for (var k = 0; k <CT.length; ++k) {
            var creatorTypeName = CT[k];
            s += "<" + creatorTypeName + ">" + creatorTypeName + "...</" + creatorTypeName + ">\n";
          }
        }
      }

      // add two tags as illustration
      var tagBy2 = "Tag " + (j % 2 ? "even" : "odd");
      s += "<tag>" + tagBy2 + "</tag>\n";

      var tagBy3 = (0 == j % 3) ? "A" : (1 == j % 3 ? "B" : "C");
      s += "<tag>Category " + tagBy3 + "</tag>\n";

      s += "</" + itemType + ">\n";
    } // itemTypes
    s += "</zotero-import>\n";
    s = s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br/>\n");
  }
  else {
    s = "Unknown result type";      
  }
  var Result = document.getElementById("Result");
  Result.innerHTML = s;
}  
