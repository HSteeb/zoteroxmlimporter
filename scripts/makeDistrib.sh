#!/bin/bash
# makeDistrib.sh -- build ZoteroXmlImporter distribution .zip file
#   by Helmut Steeb <hs2010 at bible2.net> (insert current year)
# Working dir must be root folder ZoteroXmlImporter/

zip -r ZoteroXmlImporter-0.9.zip * -x '*.zip' '*~'


