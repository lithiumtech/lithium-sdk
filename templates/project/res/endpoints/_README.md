This directory contains endpoint files.

Endpoints are a Lithium feature that enables you to create dynamic content at a specified URL, providing powerful flexibility and extensibility to your community.

An Endpoint comprise of two files in the plugin:
* an XML file that end with the `.endpoint.xml` file extension that goes under this directory. It contains the
metadata for the endpoint.
* an FTL file stores the Freemarker content of the endpoint and it goes under the `controllers` directory with a `.ftl` file extension.

Both files must use the same name, for example ideaStatusCount.endpoint.xml and ideaStatusCount.ftl.
Endpoint names can contain letters (a-z), numerals (1-9), hyphen (-), underscore ( _ ), and dot (.). An endpoint name cannot begin with '.'
Files must use the extension .endpoint.xml 
Files must use valid XML syntax

Here is an example endpoint.xml file:


<endpoint version="1.0.0" key="restcall" feature="sandbox.myplugin">
  <model/>
  <view type="freemarker" contenttype="text/html" macro="false"/>
  <controller id="basic" path="/restcall"/>
</endpoint>


Endpoint parameters:
* version - always "1.0.0"
* key - the name of the endpoint, without the .endpoint.xml extension
* feature - must match the fully-qualified name of the studio plugin, without the phase view parameters
* type - always "freemarker"
* content/type - the content type of the response. This corresponds to the types listed in the View Content Type drop down in Studio > Endpoints.
* macro - deprecated (set to false) controller parameters
* id - always "basic"
* path - the path to the controller. Set this to the same as the key, but with a leading forward-slash, such as /ideaStatusCount

The Endpoint XML file does not appear in Studio, but the associated controller file appears in Studio > Endpoints. 
