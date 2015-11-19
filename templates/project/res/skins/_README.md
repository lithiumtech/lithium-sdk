This directory contains skins, which are directories of css, skin properties, and image files used to theme your community.
All files in this directory or any of its subdirectories must have one of the following extensions:
.properties
.css
.ftl
.png
.gif
.jpeg
.jpg
.svg
See Lithium Studio for an example of the structure of a skin and the files which may be included in it.
There are no mandatory files in this directory.
Subdirectories are allowed in this directory up to a depth of 6.
Skins contributed using the SDK appear in Studio > Skins.

The easiest way to create the skin structure for a new skin is to create the skin in Studio and then export skins to the SDK using li export-studio-plugin --points "skin" --force. When you export the skin from Studio into the SDK plugin, the skin structure is created for you automatically.

See 'Customize Skins' (http://sdk-docs.lithium.com/develop/customize#skins) for more details.

Files in res/skins/<skin_id>/images have extensions .png, .gif, .jpeg, .jpg or .svg
Files in res/skins/<skin_id>/images do not use dashes (-) in their names. Underscores (_) are permitted
Files in res/skins/<skin_id>/css are named skin.css
Files in res/skins/<skin_id>/components have one of the following names:
* content_wrapper.ftl
* head.ftl
* head_top.ftl
* hitbox.ftl
A skin.properties file exists and has the parent and title fields defined
The parent skin defined in skin.properties must exist 

Quilts contributed with the SDK appear in the Custom section of the Page selection modal when you click 'Choose' in Studio > Page.