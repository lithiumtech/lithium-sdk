This directory contains controller files. Controllers are used with endpoints.

When contributing an endpoint using the SDK, each endpoint consists of two files:
* an XML file defining metadata for the endpoint. Place this file in /res/endpoints and use the file extension endpoint.xml.
* an FTL controller file containing the endpoint FreeMarker code. Place the controller file in this folder using the extension .ftl.

The controller FTL file and the associated endpoint XML file must use the same name, for example ideaStatusCount.ftl and ideaStatusCount.endpoint.xml

All files must have the .ftl extension, and should be readable as freemarker (http://freemarker.org/docs/) which parses as html.
There are no mandatory files in this directory.

See `endpoints/README.md` for more information.

Here is an example controller that retrieves a list of idea statuses defined for a community and then returns the count of how many ideas have each status, condensing the response from two calls into a single response in order to save an additional HTTP request.

<#include "objecttojson" />
<#setting url_escaping_charset='ISO-8859-1'>
<#assign query = http.request.parameters.name.get("q", "select status from messages where conversation.style=\"idea\" and depth=0 limit 300") />
<#assign result = rest("2.0","/search?q=" + query?url) />
<@compress>
{
<#if result.status = "success">
  "result": "success",
  <#assign statusKeys = {} />

  <#list result.data.items as message>
    <#if message.status??>
        <#if !statusKeys?keys?seq_contains(message.status.key)>
          <#assign statusKeys = statusKeys + {message.status.key: 1} />
        <#else>
          <#assign statusKeys = statusKeys + {message.status.key: (statusKeys[message.status.key] + 1)} />
        </#if>
    </#if>
  </#list>
  "ideaKeys": ${objectToJsonFunction(statusKeys)}
<#else>
"result": "error"
</#if>
}
</@compress>

The controller file appears in Studio > Endpoints. The associated endpoint XML file does not appear in Studio. 