This directory contains avatars, which are directories of avatar-themes.
Avatar-themes are the directories of avatar-collections.
All files in avatar-collections directory must have one of the following extensions:
.png
.gif
.jpg
.svg
See Lithium Studio for an example of the structure of an avatar and the files which may be included in it.
There are no mandatory files in this directory.
Subdirectories are allowed in this directory up to a depth of 6.
Avatars contributed using the SDK appear in Studio > Community Style > Asset library.

Run li export-studio-plugin --points "avatar" --force to export only the avatars from Studio into the SDK plugin.
Run li export-clear-plugin --points "avatar" --force to clear only the avatars created from Studio by SDK plugin.