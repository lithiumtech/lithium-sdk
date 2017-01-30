# li CLI Quick Start for OSX

(Tested in OSX 10.12.2)

1. Install nvm via homebrew if you don't have it already, see http://dev.topheman.com/install-nvm-with-homebrew-to-use-multiple-versions-of-node-and-iojs-easily/
  * lithium-sdk is known to work best in nodejs v6.9.1 currently, thus if you're using other versions of node for other projects, nvm will now be useful
2. `nvm install 6.9.1` and then `nvm use 6.9.1`
3. `node -v`
  * you should see 6.9.1
4. `npm i lithium-sdk -g` and `npm i gulp -g`
5. now you can now do `li create-project` and Li will now ask you for:
  * the url of your Li site ( i.e. https://somestaginghost.stage.lithium.com )
  * the project name (i.e. if you answer `myLiProject` you will now have your project in `./myLiProject` )
  * the SDK token for this project, available under Studio —> Advanced tab —> SDK, note: li will store this token in your gitignore'd server.conf.json
6. now you will need to issue `npm i lithium-sdk -g; npm i gulp -g` again, as in step 4 above, before issuing any other `li` command
  * this will apply every time you need to execute `li`
7. now you can pull down either the sdk or studio plugin from your staging server into your working directory (i.e. myLiProject), via: `cd myLiProject` and then either:
  * `li export-studio-plugin` -or-
  * `li export-plugin`

(To see everything else li CLI can do i.e. deployment, just issue `li` ).

## Lithium-Klout SDK

[![Build Status][travis-image]][travis-url]

[Lithium SDK documentation](https://community.lithium.com/t5/Developer-Documentation/bd-p/dev-doc-portal?section=sdk)

### Lithium Developer Resources

[Lithium Developer Documentation Portal](http://community.lithium.com/t5/Developer-Documentation/bd-p/dev-doc-portal?section=docportalhome)

[Lithium Community API v1](http://community.lithium.com/t5/Developer-Documentation/bd-p/dev-doc-portal?section=commv1)

[Lithium Community API v2](http://community.lithium.com/t5/Developer-Documentation/bd-p/dev-doc-portal?section=commv2)

[Lithium Social Web (LSW) APIs](http://community.lithium.com/t5/Developer-Documentation/bd-p/dev-doc-portal?section=lsw)

[Lithium FreeMarker context objects](https://community.lithium.com/t5/Developer-Documentation/bd-p/dev-doc-portal?section=freemarker)

[Developers Knowledge Base](http://community.lithium.com/t5/Developers-Knowledge-Base/tkb-p/studio%40tkb)

[Developers Discussion forum](http://community.lithium.com/t5/Developers-Discussion/bd-p/studio)

[Klout Developer Portal](https://klout.com/s/developers/home)

### Other useful resources
[FreeMarker documentation](http://freemarker.org/docs/index.html)

[Sass documentation](http://sass-lang.com/documentation/file.SASS_REFERENCE.html)

[node.js NodeSchool Tutorials](https://nodejs.org/documentation/tutorials/)

[travis-url]: https://travis-ci.org/lithiumtech/lithium-sdk
[travis-image]: https://travis-ci.org/lithiumtech/lithium-sdk.svg?branch=master
[travis-dev-url]: https://travis-ci.org/lithiumtech/lithium-sdk/branches
[travis-dev-image]: https://travis-ci.org/lithiumtech/lithium-sdk.svg?branch=develop
