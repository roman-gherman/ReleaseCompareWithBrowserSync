
# ReleaseCompareWithBrowserSync
Simple tool that uses browser sync to compare old versus new Release version of your web application.

## How it works?

The idea is simple, I create a proxy: https://localhost:8000. When you open https://localhost:8000 in a browser - there is no cookie saved for it, so we open the first site from config.json. When you open the same https://localhost:8000 in another browser - and there is no cookie saved for it then we will open the next site from config.json and so on. If we reach the last site, then it will go from the beginning.

At this time, this is the only tool that can work with sites that are on https. 

**Use Config.json to configure the sites you want to open through proxy.**

    {
      "platforms": 
	      [
		      "https://release-1.domain.com", 
		      "https://release-2.domain.com"
	      ]
    }

**Dependencies**:

 - Node.js


## How to Run:

1. change **config.json** to match your sites. Note: both sites should be pretty much the same and have similar DB.
2. Run **install.ps1** with Powershell (ONLY FIRST TIME), this will do all the npm installations
3. Run **run.ps1** to start the proxy and browser sync. Then open https://localhost:8000 in different browsers, check the Cookeis - to see the destination site.

## Contributions


Please feel free to contribute and make this tool more powerful.

Ideas for the future:
1. Allow choosing in browser the URL from config that you want to open
2. Allow to reset the site in same browser to a different site, on the fly.
