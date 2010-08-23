function Compute( resultType)
{
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
        s += F.join("<br/>\n") + "</p>\n";
      }
      s += "</p>";
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
      // TBD note

      var itemTypeNumber = its2n[itemType];
      s += "<" + itemType + ">\n"; // needs closing tag - do not if (!FieldNumbers) { continue; }
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
          s += fieldName + " (field #" + k + ")</" + fieldName + ">\n";
        }
      }
      s += "</" + itemType + ">\n";
    }
    s += "</zotero-import>\n";
    s = s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br/>\n");
  }
  else {
    s = "Unknown result type";      
  }
  var Result = document.getElementById("Result");
  Result.innerHTML = s;
}  
