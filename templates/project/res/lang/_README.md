This directory contains files of text keys for different languages.
All files in this directory must have the .properties extension, and should be a list of text keys (dot-separated (.) key, then '=', then text value, separated by newlines). Files in subdirectories have the .text extension and represent various text customizations like emails, FAQ's etc.
There are no mandatory files in this directory.
Subdirectories are allowed in this directory up to a depth of 3.

An example structure for a community supporting American English and French might look like this:


├── res/lang/text.en/
│   ├── docs.liql.collections.text
│   ├── email_content.template.<template.name>.text
│   ├── faq.content.<faq.name>.text
│   └── page.user_signup.text
├── res/lang/text.fr/
│   ├── ...
├── res/lang/text.en.properties
└── res/lang/text.fr.(UTF-8).properties


See 'Languages that Lithium Supports' (https://community.lithium.com/t5/Community-display/Languages-that-Lithium-supports/ta-p/6566) for supported language codes.
