This directory contains layout files.  

Layout files are XML files that end with the `.layout.xml` file extension.

Layout files contain information about the rows and columns that exist on a given page.  Every Quilt you define (in `res/quilts` or `res/quilts/custom`) must specify 1 (and only 1) layout to determine what columns it can add compoents to.  

Here is an example layout.xml file taken from the default layout named `one-column.layout.xml`:


<?xml version="1.0" encoding="UTF-8"?>
<layout>
	<row id="header">
		<column width="24" id="common-header" />
	</row>
	<row id="main">
		<column width="24" id="main-content" />
	</row>
	<row id="footer">
		<column width="24" id="common-footer" />
	</row>
</layout>

See 'Customize Layouts' (http://sdk-docs.lithium.com/develop/customize#layouts) for attribute descriptions.

You can go to the Layouts tab in Lithium Studio to view all the default layouts and can click over to xml view to grab the xml for a given layout if you want to use that as a base.

Layouts contributed with the SDK appear in Studio > Layouts.