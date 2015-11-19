This directory contains macro files.

A macro is an easy way to write code once and then reuse it where needed.

For example, the following macro "recurse_response" recursively outputs the contents of a response.
Recurse_response calls to a separate macro to include a user avatar in the response if the node name is "author."

<#macro recurse_response node>
	<#if node?node_type == "element">
		<${node?node_name}<#list node.@@ as attr>${attr?node_name}="${attr}"</#list><#if !hasChildren(node)>/</#if>>
		<#list node?children as c>
			<@recurse_response node=c />
		</#list>
		<#if node?node_name == "author">
			<@insertUserAvatar user=node />
		</#if>
		<#if hasChildren(node)></${node?node_name}></#if>
	<#elseif node?node_type == "text">
		${node}
	</#if>
</#macro>

Macros use the extsion .ftl, and should be readable as freemarker (http://freemarker.org/docs/) which parses as HTML.
Macro names can contain letters (a-z), numerals (1-9), hyphen (-), underscore ( _ ), and dot (.). A macro name cannot begin with '.'
There are no mandatory files in this directory.

Macros contributed with the SDK appear in Studio > Endpoints.