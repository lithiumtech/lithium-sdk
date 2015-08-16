This enables you to execute business logic using FreeMarker early in a request prior to any HTML being rendered. The script runs once each request, server side, and is often used for redirecting to a different page and reskinning pages in the community.
Let's say you want to redirect anonymous users coming to the community to a custom landing page you've added through Studio, and direct any registered users a different landing page. The FreeMarker code you would add might look like this:
 
<#--redirect all requests with anonymous users to a custom landing page named custom-anonymous-user-landing-page. Send registered users to the default community page.-->

<#if user.anonymous && page.name == "CommunityPage">  ${http.response.setRedirectUrl(webuisupport.urls.page.name.get("custom-anonymous-user-landing-page").build())}
<#elseif !user.anonymous && page.name == "custom-anonymous-user-landing-page">
 ${http.response.setRedirectUrl(community.urls.frontPage)}
</#if>


Warning: Please make sure to use this script page very cautiously. You may not want to do a redirect everytime any user lands on the community page.