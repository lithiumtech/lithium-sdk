This directory contains endpoint files.

Endpoints are a Lithium feature that enables you to create dynamic content at a specified URL, providing powerful flexibility and extensibility to your community.

An Endpoint comprise of two files in the plugin.

The first file is a xml file that end with the `.endpoint.xml` file extension that goes under this directory. It contains the
metadata for the endpoint.

Here is an example endpoint.xml file:

```xml
<endpoint version="1.0.0" key="restcall" feature="sandbox.myplugin">
  <model/>
  <view type="freemarker" contenttype="text/html" macro="false"/>
  <controller id="basic" path="/restcall"/>
</endpoint>

The second file stores the Freemarker content of the endpoint and it goes under the `controllers` directory with a `.ftl` file extension.