This directory contains components which can be placed in quilts.
All files must have the .ftl extension, and should be readable as freemarker (http://freemarker.org/docs/) which parses as html.
There are no mandatory files in this directory.
No subdirectories are allowed in this directory.
Components are edited in the Studio plugin at Studio > Components.
If strictMode is set to true in server.conf.json, FreeMarker syntax errors will block the plugin from being uploaded to the stage server. If strictMode is set to false, the plugin will be uploaded to stage despite the FreeMarker errors.

Components contributed with the SDK appear in Studio > Components.