# JWBot

JWBot is a multi-purpose Discord bot created for use in the Model House of Commons discord servers. It is a rewrite of the original bot by mcsherry.

This rewrite of JWBot contains a number of changes (hopefully improvements) from the original:

* Commands now use Discord's slash commands with autocompletion features (so no more case-sensitivity)
* The source code is open source and may now be examined
* This version is built with modularity in mind: packages may be added by anyone

## Requirements

This JWBot rewrite is built on ECMAScript 6 features, so older versions of node.js will not work. It was developed on v16.17.1, though some older versions should still work. Using older versions is done at one's own risk.

Additionally, a MySQL database should be configured.
